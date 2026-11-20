// The recall check, in plain code. No model, no network.
// For each result a GP has actioned, it asks one question: did the front desk do what the GP marked?
// It never judges the result itself. The GP's action is the instruction; this page only follows it up.

export const STATUS = { ok: "ontrack", open: "open", person: "person" };

const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const toDate = (s) => new Date(s.slice(0, 10) + "T00:00:00Z");
export const dayOf = (s) => s.slice(0, 10);
export const timeOf = (s) => s.slice(11, 16);

export function isWorkingDay(s) {
  const wd = toDate(s).getUTCDay();
  return wd !== 0 && wd !== 6; // no public holidays fall in this sample's weeks
}
export function addWorkingDays(s, n) {
  const d = toDate(s);
  let left = n;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (isWorkingDay(iso(d))) left--;
  }
  return iso(d);
}
export function addDays(s, n) {
  const d = toDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(s) {
  const d = toDate(s);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
export function fmtWhen(s) {
  return s.length > 10 ? `${fmtDate(s)}, ${timeOf(s)}` : fmtDate(s);
}

// Morning before 12:00, midday 12:00 to 14:59, afternoon from 15:00.
export function partOfDay(at) {
  const h = Number(timeOf(at).slice(0, 2));
  return h < 12 ? "morning" : h < 15 ? "midday" : "afternoon";
}

const ref = (doc, id, field) => ({ doc, id, field });

// Which mobile was on file when the message went out.
export function mobileAt(patient, at) {
  if (patient.previousMobile && dayOf(at) < patient.mobileSince) return patient.previousMobile;
  return patient.mobile;
}

export function onLeave(docs, gp, date) {
  return docs.leave.lines.find((l) => l.gp === gp && l.from <= date && date <= l.to) || null;
}

const ACTIONS = {
  "Urgent appointment": "urgent",
  "Non-urgent appointment": "nonurgent",
  "Telephone patient": "phone",
};

export function checkRecall(result, docs, policy, asOf) {
  const conds = [];
  const out = { id: result.id, result, patient: null, kind: ACTIONS[result.action] || null, conditions: conds, status: null, due: null, next: "" };
  const patient = docs.patients.lines.find((p) => p.id === result.patientId);
  out.patient = patient || null;

  // 1. Whose result is it? The name and date of birth on the result must match the record.
  if (!patient) {
    conds.push({ key: "identity", label: "Patient on file", status: "notfound", note: "No patient record has this ID. Nobody is called until a person matches it.", refs: [ref("results", result.id, "patientId")] });
  } else if (patient.dob !== result.dob || patient.name !== result.name) {
    const what = patient.dob !== result.dob ? "date of birth" : "name";
    conds.push({
      key: "identity", label: "Same patient as the record", status: "review",
      note: `The ${what} on the result does not match the patient record. Nobody is called until a person confirms whose result this is.`,
      refs: [ref("results", result.id, patient.dob !== result.dob ? "dob" : "name"), ref("patients", patient.id, patient.dob !== result.dob ? "dob" : "name")],
    });
  } else {
    conds.push({ key: "identity", label: "Same patient as the record", status: "met", note: "Name and date of birth on the result match the record.", refs: [ref("results", result.id, "dob"), ref("patients", patient.id, "dob")] });
  }
  if (conds[0].status !== "met") {
    out.status = STATUS.person;
    out.next = `Check with the lab and ${result.gp} whose result this is before anyone is called.`;
    return out;
  }

  // 1b. Is the patient still with the practice? A former patient is not called on the desk's own judgement.
  if (patient.status && patient.status !== "Active") {
    conds.push({
      key: "active", label: "Patient record active", status: "review",
      note: `The record says "${patient.status}". Whether to contact a former patient about a result is for the GP to decide.`,
      refs: [ref("patients", patient.id, "status")],
    });
    out.status = STATUS.person;
    out.next = `Confirm with ${result.gp} whether to contact a former patient.`;
    return out;
  }

  // 2. What did the GP mark? A blank action is never read from the comment.
  if (!out.kind) {
    conds.push({ key: "action", label: "Action marked by the GP", status: "notfound", note: `No action is marked. The comment is not read as an instruction.`, refs: [ref("results", result.id, "action"), ref("results", result.id, "comment")] });
    out.status = STATUS.person;
    out.next = `Ask ${result.gp} to mark an action.`;
    return out;
  }
  conds.push({ key: "action", label: "Action marked by the GP", status: "met", note: `${result.action}, marked ${fmtWhen(result.actioned)}.`, refs: [ref("results", result.id, "action")] });

  const actDay = dayOf(result.actioned);
  const mine = docs.contacts.lines.filter((c) => c.patientId === patient.id && c.at >= result.actioned).sort((a, b) => (a.at < b.at ? -1 : 1));
  const p = policy[out.kind];
  const tellBy = addWorkingDays(actDay, p.tellWorkingDays);

  // 3. Was the patient told? A delivered SMS counts only if it went to the mobile on file that day.
  const sms = mine.filter((c) => c.method === "SMS");
  const wrongNumber = sms.filter((c) => c.to !== mobileAt(patient, c.at));
  const goodSms = sms.filter((c) => c.outcome === "Delivered" && c.to === mobileAt(patient, c.at));
  const spoke = mine.filter((c) => c.method === "Phone" && c.outcome === "Spoke to patient");
  const told = out.kind === "phone" ? spoke[0] : [...goodSms, ...spoke].sort((a, b) => (a.at < b.at ? -1 : 1))[0];

  if (wrongNumber.length) {
    const c = wrongNumber[0];
    conds.push({
      key: "number", label: "Sent to the mobile on file", status: "notmet",
      note: `The SMS on ${fmtWhen(c.at)} went to ${c.to}. The record changed to ${patient.mobile} on ${fmtDate(patient.mobileSince)}. Delivered to the old number does not count.`,
      refs: [ref("contacts", c.id, "to"), ref("patients", patient.id, "mobile"), ref("patients", patient.id, "mobileSince")],
    });
  } else if (sms.length) {
    conds.push({ key: "number", label: "Sent to the mobile on file", status: "met", note: `${sms[0].to} is the mobile on file.`, refs: [ref("contacts", sms[0].id, "to"), ref("patients", patient.id, "mobile")] });
  }

  const tellLabel = out.kind === "phone" ? "GP's message passed on by phone" : "Patient asked to book";
  const tellWhen = out.kind === "urgent" ? `the same working day (${fmtDate(tellBy)})` : `within ${p.tellWorkingDays} working days (by ${fmtDate(tellBy)})`;
  if (told) {
    const inTime = dayOf(told.at) <= tellBy;
    conds.push({
      key: "told", label: tellLabel, status: inTime ? "met" : "notmet",
      note: `${told.method === "SMS" ? "SMS delivered" : "Spoke to the patient"} ${fmtWhen(told.at)}${inTime ? "" : `, after ${fmtDate(tellBy)}`}. Policy: ${tellWhen}.`,
      refs: [ref("contacts", told.id, "outcome")],
    });
  }
  const notToldCond = { key: "told", label: tellLabel, status: "notmet", note: `No ${out.kind === "phone" ? "call that reached the patient" : "delivered SMS to the mobile on file, and no call that reached the patient"} on record. Policy: ${tellWhen}.`, refs: mine.map((c) => ref("contacts", c.id, "outcome")) };

  // 4. Not reached: three calls in three parts of the day, then a letter, every attempt recorded.
  let attemptsDone = false;
  if (!told) {
    const calls = mine.filter((c) => c.method === "Phone");
    const parts = [...new Set(calls.map((c) => partOfDay(c.at)))];
    const lastCall = calls[calls.length - 1];
    const letter = mine.find((c) => c.method === "Letter" && (!lastCall || c.at > lastCall.at));
    attemptsDone = calls.length >= policy.calls && parts.length >= policy.calls && !!letter;
    const callText = calls.length ? `${calls.length} call${calls.length === 1 ? "" : "s"} (${calls.map((c) => `${fmtDate(c.at)} ${timeOf(c.at)}`).join(", ")}), ${parts.length === 1 ? `all in the ${parts[0]}` : parts.join(", ")}` : "No calls";
    // Not reached after the full set of attempts is the policy followed, not a failure.
    if (!attemptsDone) conds.push(notToldCond);
    conds.push({
      key: "attempts", label: "Three calls at different times, then a letter", status: attemptsDone ? "met" : "notmet",
      note: `${attemptsDone ? "Not reached. " : ""}${callText}. ${letter ? `Letter ${letter.outcome.toLowerCase()} ${fmtDate(letter.at)}.` : "No letter."}`,
      refs: [...calls.map((c) => ref("contacts", c.id, "at")), ...(letter ? [ref("contacts", letter.id, "method")] : [])],
    });
  }

  // 5. Seen in time, by a GP who is in that day.
  if (out.kind !== "phone" && !attemptsDone) {
    const seenBy = out.kind === "urgent" ? addWorkingDays(actDay, p.seenWorkingDays) : addDays(actDay, p.seenCalendarDays);
    out.due = seenBy;
    const appts = docs.appts.lines.filter((a) => a.patientId === patient.id && a.date >= actDay).sort((a, b) => (a.date < b.date ? -1 : 1));
    const live = appts.filter((a) => a.status === "Booked" || a.status === "Completed" || a.status === "Arrived");
    const a = live[live.length - 1] || appts[appts.length - 1];
    const when = out.kind === "urgent" ? `within ${p.seenWorkingDays} working days, by ${fmtDate(seenBy)}` : `within ${p.seenCalendarDays} days, by ${fmtDate(seenBy)}`;
    if (!a) {
      conds.push({ key: "seen", label: "Appointment in time", status: "notmet", note: `No appointment on or after ${fmtDate(actDay)}. Policy: seen ${when}${seenBy < asOf ? "; that date has passed" : ""}.`, refs: [] });
    } else if (a.status === "Did not attend" || a.status === "Cancelled") {
      conds.push({ key: "seen", label: "Appointment in time", status: "notmet", note: `${a.status} on ${fmtDate(a.date)}, and nothing booked since. Policy: seen ${when}.`, refs: [ref("appts", a.id, "status")] });
    } else if (a.date > seenBy) {
      conds.push({ key: "seen", label: "Appointment in time", status: "notmet", note: `Booked ${fmtDate(a.date)}, after ${fmtDate(seenBy)}. Policy: seen ${when}.`, refs: [ref("appts", a.id, "date")] });
    } else {
      const lv = a.status === "Booked" ? onLeave(docs, a.gp, a.date) : null;
      if (lv) {
        conds.push({ key: "seen", label: "Appointment in time", status: "notmet", note: `Booked ${fmtDate(a.date)} at ${a.time} with ${a.gp}, who is on ${lv.kind.toLowerCase()} ${fmtDate(lv.from)} to ${fmtDate(lv.to)}.`, refs: [ref("appts", a.id, "gp"), ref("leave", lv.id, "from")] });
      } else {
        const done = a.status !== "Booked";
        conds.push({ key: "seen", label: "Appointment in time", status: "met", note: `${done ? `Seen ${fmtDate(a.date)}` : `Booked ${fmtDate(a.date)} at ${a.time}`} with ${a.gp}. Policy: seen ${when}.`, refs: [ref("appts", a.id, done ? "status" : "date")] });
      }
    }
  }

  out.status = conds.some((c) => c.status === "notmet") ? STATUS.open : STATUS.ok;
  if (out.status === STATUS.open) out.next = nextStep(out, patient, asOf);
  return out;
}

function nextStep(r, patient, asOf) {
  const step = deskStep(r, patient);
  // An urgent recall past its seen-by date goes back to the GP the same day: what happens next is a clinical call.
  if (r.kind === "urgent" && r.due && r.due < asOf) return `${step} Tell ${r.result.gp} today: urgent recall, seen-by date ${fmtDate(r.due)} has passed.`;
  return step;
}

function deskStep(r, patient) {
  const c = (k) => r.conditions.find((x) => x.key === k);
  if (c("number") && c("number").status === "notmet") return `Call or text the mobile on file, ${patient.mobile}, and book.`;
  const seen = c("seen");
  if (seen && seen.status === "notmet" && /on .*leave/.test(seen.note)) return "Move the booking to a GP who is in.";
  if (seen && seen.status === "notmet" && /Did not attend|Cancelled/.test(seen.note)) return "Call to rebook the missed appointment.";
  const at = c("attempts");
  if (at && at.status === "notmet") return "Make the next call at a different time of day, then send a letter after the third.";
  return "Contact the patient and book.";
}

export function checkAll(docs, policy, asOf, gps) {
  const results = docs.results.lines
    .map((r) => checkRecall({ ...r, gp: gps ? gps[r.gp] || r.gp : r.gp }, withGpNames(docs, gps), policy, asOf))
    .sort((a, b) => (a.result.actioned < b.result.actioned ? -1 : 1));
  const count = (s) => results.filter((r) => r.status === s).length;
  const openOnes = results.filter((r) => r.status !== STATUS.ok);
  return {
    results,
    ontrack: count(STATUS.ok),
    open: count(STATUS.open),
    person: count(STATUS.person),
    oldestOpen: openOnes.length ? dayOf(openOnes.map((r) => r.result.actioned).sort()[0]) : null,
  };
}

// GP codes are kept in the files; names are shown on the page.
function withGpNames(docs, gps) {
  if (!gps) return docs;
  return {
    ...docs,
    appts: { ...docs.appts, lines: docs.appts.lines.map((a) => ({ ...a, gp: gps[a.gp] || a.gp })) },
    leave: { ...docs.leave, lines: docs.leave.lines.map((l) => ({ ...l, gp: gps[l.gp] || l.gp })) },
  };
}

const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
export function listCsv(results, picked, asOf) {
  const head = ["result", "patient_id", "patient", "mobile_on_file", "gp", "action", "why_open", "next_step", "due", "record_lines", "listed_on"];
  const rows = results.filter((r) => picked.has(r.id)).map((r) => {
    const why = r.conditions.filter((c) => c.status !== "met").map((c) => c.label).join("; ");
    const lines = [...new Set(r.conditions.flatMap((c) => c.refs.map((x) => x.id)))].join(" ");
    return [r.id, r.result.patientId, r.result.name, r.patient ? r.patient.mobile : "", r.result.gp, r.result.action || "(none marked)", why, r.next, r.due || "", lines, asOf];
  });
  return [head, ...rows].map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}
