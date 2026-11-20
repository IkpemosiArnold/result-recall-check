import { test } from "node:test";
import assert from "node:assert/strict";
import { checkAll, checkRecall, addWorkingDays, partOfDay, mobileAt, listCsv, STATUS } from "./check.js";
import { DOCS, POLICY, AS_OF, GPS } from "./samples.js";

const clone = () => JSON.parse(JSON.stringify(DOCS));
const all = (docs = DOCS) => checkAll(docs, POLICY, AS_OF, GPS);
const byId = (id, docs) => all(docs).results.find((r) => r.id === id);
const cond = (r, key) => r.conditions.find((c) => c.key === key);

test("sample: 4 of 10 open, 2 need a person, 4 on track, oldest open since 9 Nov", () => {
  const s = all();
  assert.equal(s.results.length, 10);
  assert.equal(s.open, 4);
  assert.equal(s.person, 2);
  assert.equal(s.ontrack, 4);
  assert.equal(s.oldestOpen, "2026-11-09");
});

test("working days skip the weekend", () => {
  assert.equal(addWorkingDays("2026-11-13", 2), "2026-11-17"); // Fri + 2 = Tue
  assert.equal(addWorkingDays("2026-11-19", 2), "2026-11-23"); // Thu + 2 = Mon
  assert.equal(addWorkingDays("2026-11-10", 0), "2026-11-10");
});

test("parts of the day", () => {
  assert.equal(partOfDay("2026-11-12 11:59"), "morning");
  assert.equal(partOfDay("2026-11-12 12:00"), "midday");
  assert.equal(partOfDay("2026-11-12 15:00"), "afternoon");
});

test("R-5102: urgent, SMS the same day, seen within 2 working days: on track", () => {
  const r = byId("R-5102");
  assert.equal(r.status, STATUS.ok);
  assert.equal(cond(r, "told").status, "met");
  assert.equal(cond(r, "seen").status, "met");
  assert.equal(r.due, "2026-11-12");
});

test("R-5104: SMS delivered to the old mobile does not count; the next step names the new number", () => {
  const r = byId("R-5104");
  assert.equal(r.status, STATUS.open);
  assert.equal(cond(r, "number").status, "notmet");
  assert.equal(cond(r, "told").status, "notmet");
  assert.equal(cond(r, "seen").status, "notmet");
  assert.match(cond(r, "seen").note, /that date has passed/);
  assert.match(r.next, /0491 570 313/);
  const p = DOCS.patients.lines.find((x) => x.id === "P-2230");
  assert.equal(mobileAt(p, "2026-11-02 10:00"), "0491 570 159");
  assert.equal(mobileAt(p, "2026-11-13 10:05"), "0491 570 313");
});

test("R-5111: booked in time but with a GP on leave that day: open", () => {
  const r = byId("R-5111");
  assert.equal(r.status, STATUS.open);
  assert.equal(cond(r, "told").status, "met");
  assert.equal(cond(r, "seen").status, "notmet");
  assert.match(cond(r, "seen").note, /annual leave/);
  assert.deepEqual(cond(r, "seen").refs.map((x) => x.id), ["A-3405", "L-41"]);
});

test("R-5111: the same booking with the leave entry removed is on track", () => {
  const d = clone();
  d.leave.lines = d.leave.lines.filter((l) => l.id !== "L-41");
  assert.equal(byId("R-5111", d).status, STATUS.ok);
});

test("R-5101: did not attend and not rebooked: open; a later booking in the window clears it", () => {
  assert.equal(byId("R-5101").status, STATUS.open);
  const d = clone();
  d.appts.lines.push({ id: "A-3999", date: "2026-11-20", time: "10:00", gp: "DRQ", patientId: "P-2208", type: "Standard", booked: "2026-11-16", status: "Booked" });
  assert.equal(byId("R-5101", d).status, STATUS.ok);
});

test("R-5105: two morning calls and no letter are not enough", () => {
  const r = byId("R-5105");
  assert.equal(r.status, STATUS.open);
  assert.equal(cond(r, "attempts").status, "notmet");
  assert.match(cond(r, "attempts").note, /all in the morning/);
});

test("R-5103: not reached after three calls in three parts of the day and a letter: on track", () => {
  const r = byId("R-5103");
  assert.equal(r.status, STATUS.ok);
  assert.equal(cond(r, "attempts").status, "met");
  assert.equal(cond(r, "told"), undefined);
  assert.equal(cond(r, "seen"), undefined);
});

test("R-5103: three calls all in the morning are not three different times", () => {
  const d = clone();
  for (const c of d.contacts.lines) if (["C-807", "C-808"].includes(c.id)) c.at = c.at.slice(0, 11) + "10:15";
  const r = byId("R-5103", d);
  assert.equal(r.status, STATUS.open);
  assert.equal(cond(r, "attempts").status, "notmet");
});

test("R-5103: no letter after the third call is open", () => {
  const d = clone();
  d.contacts.lines = d.contacts.lines.filter((c) => c.id !== "C-810");
  assert.equal(byId("R-5103", d).status, STATUS.open);
});

test("R-5107: the record says the patient has left: waits for the GP, nothing else checked", () => {
  const r = byId("R-5107");
  assert.equal(r.status, STATUS.person);
  assert.equal(cond(r, "identity").status, "met");
  assert.equal(cond(r, "active").status, "review");
  assert.equal(r.conditions.length, 2);
  assert.match(r.next, /Confirm with Dr R\. Elmsworth whether to contact a former patient/);
  assert.deepEqual(cond(r, "active").refs.map((x) => `${x.doc}:${x.id}:${x.field}`), ["patients:P-2236:status"]);
});

test("a date of birth that differs from the record waits; the lab and the GP are asked", () => {
  const d = clone();
  d.results.lines.find((x) => x.id === "R-5102").dob = "1958-11-04";
  const r = byId("R-5102", d);
  assert.equal(r.status, STATUS.person);
  assert.equal(cond(r, "identity").status, "review");
  assert.equal(r.conditions.length, 1);
  assert.match(r.next, /Check with the lab and Dr S\. Vennor/);
});

test("an urgent recall past its seen-by date is escalated to the GP today; one still in time is not", () => {
  assert.match(byId("R-5105").next, /Tell Dr S\. Vennor today: urgent recall, seen-by date 16 Nov has passed\./);
  assert.match(byId("R-5104").next, /Tell Dr R\. Elmsworth today/);
  assert.doesNotMatch(byId("R-5111").next, /Tell .* today/); // seen-by 23 Nov has not passed
  assert.doesNotMatch(byId("R-5101").next, /Tell .* today/); // non-urgent
});

test("R-5109: no action marked; the comment is never read as one", () => {
  const r = byId("R-5109");
  assert.equal(r.status, STATUS.person);
  assert.equal(cond(r, "action").status, "notfound");
  assert.match(r.next, /mark an action/);
});

test("R-5110: telephone action closed by a call that reached the patient", () => {
  const r = byId("R-5110");
  assert.equal(r.status, STATUS.ok);
  assert.equal(cond(r, "told").label, "GP's message passed on by phone");
});

test("a telephone action with only an SMS is open", () => {
  const d = clone();
  d.contacts.lines = d.contacts.lines.filter((c) => c.id !== "C-809");
  d.contacts.lines.push({ id: "C-900", at: "2026-11-18 09:00", patientId: "P-2211", by: "Kerrin", method: "SMS", to: "0491 570 157", outcome: "Delivered", note: "" });
  assert.equal(byId("R-5110", d).status, STATUS.open);
});

test("an urgent SMS sent the next working day is late", () => {
  const d = clone();
  d.contacts.lines.find((c) => c.id === "C-801").at = "2026-11-11 09:00";
  const r = byId("R-5102", d);
  assert.equal(cond(r, "told").status, "notmet");
  assert.equal(r.status, STATUS.open);
});

test("a patient ID with no record waits for a person", () => {
  const r = checkRecall({ ...DOCS.results.lines[0], patientId: "P-0000" }, DOCS, POLICY, AS_OF);
  assert.equal(r.status, STATUS.person);
  assert.equal(r.conditions[0].status, "notfound");
});

test("contacts made before the GP's action do not count", () => {
  const d = clone();
  d.contacts.lines.find((c) => c.id === "C-811").at = "2026-11-19 11:00"; // before the 11:30 action
  const r = byId("R-5111", d);
  assert.equal(cond(r, "told").status, "notmet");
});

test("every reference points at a line that exists and a field it has", () => {
  for (const r of all().results) for (const c of r.conditions) for (const x of c.refs) {
    const line = DOCS[x.doc].lines.find((l) => l.id === x.id);
    assert.ok(line, `${r.id} ${c.key} cites ${x.doc}:${x.id}`);
    assert.ok(x.field in line, `${r.id} ${c.key} cites missing field ${x.field}`);
  }
});

test("every condition that is not met says why in words", () => {
  for (const r of all().results) for (const c of r.conditions) assert.ok(c.note && c.note.length > 10, `${r.id} ${c.key}`);
});

test("today's list CSV: one row per listed recall, with the number on file and the record lines", () => {
  const s = all();
  const csv = listCsv(s.results, new Set(["R-5104", "R-5109"]), AS_OF).trim().split("\n");
  assert.equal(csv.length, 3);
  assert.match(csv[0], /^result,patient_id,patient,mobile_on_file/);
  const r5104 = csv.find((l) => l.startsWith("R-5104"));
  assert.match(r5104, /0491 570 313/);
  assert.match(r5104, /C-803/);
  assert.match(csv.find((l) => l.startsWith("R-5109")), /\(none marked\)/);
});

test("no result is judged: the page never reads the test or the comment to decide", () => {
  const d = clone();
  for (const r of d.results.lines) { r.test = "changed"; r.comment = "changed"; }
  const a = all().results.map((r) => r.status), b = all(d).results.map((r) => r.status);
  assert.deepEqual(a, b);
});
