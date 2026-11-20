# Recall Check

A result comes into a GP clinic, lands with the right GP, and the GP marks what it needs: an urgent appointment, a routine one, a phone call. From there it is the front desk's job. The gap is quiet: an SMS that went to a number the patient changed last week, a booking with a GP who is on leave that day, an appointment the patient missed and nobody rebooked, two calls at 9 in the morning and then nothing.

This page checks every actioned result against the clinic's contact log and appointment book, in plain code, and says which recalls are still open and what the next step is. It never reads the result itself. The GP's action is the instruction; the page only checks that it was carried out.

**Sample result:** 4 of 10 open. 2 need a person. 4 on track.

## What it shows

- **Kaito M., urgent, open.** Two calls on 12 Nov, at 09:05 and 09:40, both in the morning, and no letter. The seen-by date, 16 Nov, has passed, so the next step also tells the GP today.
- **Ines K., urgent, open.** The recall SMS was delivered, but to 0491 570 159. The patient record changed to 0491 570 313 on 3 Nov. Delivered to the old number does not count. The seen-by date has passed, so the GP is told today.
- **Lorna B., non-urgent, open.** Did not attend on 13 Nov, and nothing booked since.
- **Wes T., urgent, open.** Booked on 23 Nov, inside the window, with a GP whose annual leave starts that day.
- **Hana W., needs a person.** The patient record says she left the practice on 4 Nov. Whether to contact a former patient is for the GP to decide, so nobody calls yet.
- **Theo S., needs a person.** No action marked. The comment "?repeat in 3/12" is not read as one.
- **Ruth A., on track.** Not reached after three calls (morning, midday, afternoon) and a letter, all recorded.
- **Margot H., Doug R., Pia N., on track.** Told and seen, told and booked in time, or told by phone as the GP asked.

Each condition opens to the record line it read: the result, the patient record, the contact log entry, the appointment, the leave entry. A person adds each open recall to today's list, and the list downloads as a CSV with the number on file, the next step and the record lines behind it. Nothing is sent from the page.

## Rules used

- **The clinic's policy, made up for this sample:** urgent means the patient is asked to book the same working day and seen within 2 working days; non-urgent, asked within 2 working days and seen within 14 days; telephone, someone spoke to the patient within 2 working days.
- **Attempts:** RACGP Standards for general practices, 5th edition criterion GP2.2 (still used for accreditation) and 6th edition criterion CG6 (released 26 Aug 2026). Both expect each attempt to contact and recall a patient to be recorded in the health record, and both give the example of up to three telephone calls at different times of the day, then a letter, email or text. Read on racgp.org.au on 20 Nov 2026. This page's reading: three calls in three parts of the day (before 12:00, 12:00 to 14:59, from 15:00), then a letter after the third call. CG6.B also asks for a system for high-risk results outside opening hours; this page does not handle those.
- **Escalation, this page's choice:** an urgent recall past its seen-by date goes back to the GP the same day, because what happens next (keep trying, another contact, a welfare check) is a clinical decision.

### This page's own choices

- An SMS counts only when it was delivered to the mobile on file on the day it was sent.
- A booking counts only with a GP who is not on leave that day.
- A patient not reached after the full set of attempts is on track: the policy was followed. A clinic may want the GP told as well.
- A result for a patient whose record is no longer active waits for the GP. A name or date of birth that does not match the record waits for the lab and the GP.
- Contacts before the GP's action time do not count.
- Public holidays are not in this sample's weeks; a real version reads the state's list.

## Not covered

Reading the clinical software directly (the files here are exports). Results ordered by someone outside the clinic. Reminders, which are a separate list. Whether the GP's action was the right one: that is the GP's call, and the page never makes it.

## Run it

Open `index.html` through any static server. Tests: `node --test` (Node 20 or later). Screenshots and layout checks: `NODE_PATH=<folder with playwright-core> node tools/shoot.cjs`.

## Files

- `samples.js`: the made-up clinic, its exports and its policy. Mobile numbers are from the list ACMA publishes for use in creative works.
- `check.js`: the rules, in plain code. No model, no network.
- `app.js`, `index.html`, `style.css`: the page.
- `check.test.js`: 25 tests.

Built on 20 Nov 2026 with AI coding agents, directed by Arnold Ikpemosi Adeyemi.
