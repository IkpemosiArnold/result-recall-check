// Sample data: a made-up GP clinic. Every person, number and result here is invented.
// Mobile numbers are from the list the Australian regulator (ACMA) publishes for use in creative works.
// Patients appear as first name and initial only.

export const AS_OF = "2026-11-20"; // Friday, before the phones open
export const CLINIC = { name: "Bellwyn Street Family Practice", reviewer: "Kerrin" };

// The clinic's own recall policy. Sample policy, written for this page.
export const POLICY = {
  urgent: { tellWorkingDays: 0, seenWorkingDays: 2 },
  nonurgent: { tellWorkingDays: 2, seenCalendarDays: 14 },
  phone: { tellWorkingDays: 2 },
  calls: 3, // three phone calls in three different parts of the day, then a letter
};

export const GPS = {
  DRV: "Dr S. Vennor",
  DRE: "Dr R. Elmsworth",
  DRQ: "Dr A. Quennell",
};

export const DOCS = {
  results: {
    title: "Actioned results",
    file: "results_actioned.csv",
    cols: ["id", "received", "patientId", "name", "dob", "test", "gp", "actioned", "action", "comment"],
    heads: ["Result", "Received", "Patient ID", "Name on result", "DOB on result", "Test", "GP", "Actioned", "Action", "GP comment"],
    lines: [
      { id: "R-5101", received: "2026-11-09", patientId: "P-2208", name: "Lorna B.", dob: "1955-12-05", test: "Imaging: bone density", gp: "DRQ", actioned: "2026-11-09 16:10", action: "Non-urgent appointment", comment: "Routine appt to discuss." },
      { id: "R-5102", received: "2026-11-10", patientId: "P-2201", name: "Margot H.", dob: "1958-04-11", test: "Pathology: iron studies", gp: "DRV", actioned: "2026-11-10 10:14", action: "Urgent appointment", comment: "Please book urgent appt this week to discuss results." },
      { id: "R-5103", received: "2026-11-11", patientId: "P-2225", name: "Ruth A.", dob: "1990-08-19", test: "Pathology: vitamin D", gp: "DRQ", actioned: "2026-11-11 13:15", action: "Non-urgent appointment", comment: "Routine appt please." },
      { id: "R-5104", received: "2026-11-13", patientId: "P-2230", name: "Ines K.", dob: "1949-01-23", test: "Pathology: HbA1c", gp: "DRE", actioned: "2026-11-13 09:40", action: "Urgent appointment", comment: "Book urgent appt please." },
      { id: "R-5105", received: "2026-11-12", patientId: "P-2219", name: "Kaito M.", dob: "1980-03-14", test: "Pathology: liver function", gp: "DRV", actioned: "2026-11-12 08:50", action: "Urgent appointment", comment: "Needs urgent review, please book." },
      { id: "R-5107", received: "2026-11-16", patientId: "P-2236", name: "Hana W.", dob: "1987-02-17", test: "Pathology: thyroid function", gp: "DRE", actioned: "2026-11-16 10:30", action: "Non-urgent appointment", comment: "Routine appt to discuss." },
      { id: "R-5108", received: "2026-11-16", patientId: "P-2214", name: "Doug R.", dob: "1971-09-02", test: "Pathology: lipid studies", gp: "DRQ", actioned: "2026-11-16 15:20", action: "Non-urgent appointment", comment: "Routine appt to discuss when convenient." },
      { id: "R-5109", received: "2026-11-17", patientId: "P-2247", name: "Theo S.", dob: "2001-06-28", test: "Imaging: knee X-ray", gp: "DRQ", actioned: "2026-11-17 17:05", action: "", comment: "?repeat in 3/12" },
      { id: "R-5110", received: "2026-11-17", patientId: "P-2211", name: "Pia N.", dob: "1994-10-07", test: "Imaging: ultrasound", gp: "DRV", actioned: "2026-11-17 12:05", action: "Telephone patient", comment: "Tell pt result normal, no further action needed." },
      { id: "R-5111", received: "2026-11-19", patientId: "P-2242", name: "Wes T.", dob: "1966-07-30", test: "Pathology: kidney function", gp: "DRE", actioned: "2026-11-19 11:30", action: "Urgent appointment", comment: "Urgent appt please." },
    ],
  },
  patients: {
    title: "Patient details",
    file: "patients.csv",
    cols: ["id", "name", "dob", "mobile", "mobileSince", "previousMobile", "status"],
    heads: ["Patient ID", "Name", "DOB", "Mobile", "Mobile since", "Previous mobile", "Record status"],
    lines: [
      { id: "P-2201", name: "Margot H.", dob: "1958-04-11", mobile: "0491 570 006", mobileSince: "2021-03-02", previousMobile: "", status: "Active" },
      { id: "P-2208", name: "Lorna B.", dob: "1955-12-05", mobile: "0491 571 266", mobileSince: "2019-07-15", previousMobile: "", status: "Active" },
      { id: "P-2211", name: "Pia N.", dob: "1994-10-07", mobile: "0491 570 157", mobileSince: "2024-01-20", previousMobile: "", status: "Active" },
      { id: "P-2214", name: "Doug R.", dob: "1971-09-02", mobile: "0491 570 156", mobileSince: "2022-05-11", previousMobile: "", status: "Active" },
      { id: "P-2219", name: "Kaito M.", dob: "1980-03-14", mobile: "0491 571 491", mobileSince: "2023-09-04", previousMobile: "", status: "Active" },
      { id: "P-2225", name: "Ruth A.", dob: "1990-08-19", mobile: "0491 571 804", mobileSince: "2020-11-30", previousMobile: "", status: "Active" },
      { id: "P-2230", name: "Ines K.", dob: "1949-01-23", mobile: "0491 570 313", mobileSince: "2026-11-03", previousMobile: "0491 570 159", status: "Active" },
      { id: "P-2236", name: "Hana W.", dob: "1987-02-17", mobile: "0491 572 549", mobileSince: "2018-02-08", previousMobile: "", status: "Inactive: left the practice 2026-11-04" },
      { id: "P-2242", name: "Wes T.", dob: "1966-07-30", mobile: "0491 570 737", mobileSince: "2025-06-19", previousMobile: "", status: "Active" },
      { id: "P-2247", name: "Theo S.", dob: "2001-06-28", mobile: "0491 574 632", mobileSince: "2024-08-12", previousMobile: "", status: "Active" },
    ],
  },
  contacts: {
    title: "Contact log",
    file: "contact_log.csv",
    cols: ["id", "at", "patientId", "by", "method", "to", "outcome", "note"],
    heads: ["Entry", "When", "Patient ID", "By", "Method", "To", "Outcome", "Note"],
    lines: [
      { id: "C-800", at: "2026-11-10 09:30", patientId: "P-2208", by: "Kerrin", method: "SMS", to: "0491 571 266", outcome: "Delivered", note: "Recall SMS: please call to book" },
      { id: "C-801", at: "2026-11-10 10:52", patientId: "P-2201", by: "Kerrin", method: "SMS", to: "0491 570 006", outcome: "Delivered", note: "Recall SMS: please call to book" },
      { id: "C-802", at: "2026-11-12 09:20", patientId: "P-2225", by: "Kerrin", method: "Phone", to: "0491 571 804", outcome: "No answer", note: "" },
      { id: "C-803", at: "2026-11-13 10:05", patientId: "P-2230", by: "Tash", method: "SMS", to: "0491 570 159", outcome: "Delivered", note: "Recall SMS: please call to book" },
      { id: "C-804", at: "2026-11-12 09:05", patientId: "P-2219", by: "Tash", method: "Phone", to: "0491 571 491", outcome: "No answer", note: "" },
      { id: "C-805", at: "2026-11-12 09:40", patientId: "P-2219", by: "Tash", method: "Phone", to: "0491 571 491", outcome: "No answer", note: "Left message" },
      { id: "C-806", at: "2026-11-17 09:12", patientId: "P-2214", by: "Tash", method: "SMS", to: "0491 570 156", outcome: "Delivered", note: "Recall SMS: please call to book" },
      { id: "C-807", at: "2026-11-13 13:10", patientId: "P-2225", by: "Kerrin", method: "Phone", to: "0491 571 804", outcome: "No answer", note: "" },
      { id: "C-808", at: "2026-11-16 16:40", patientId: "P-2225", by: "Tash", method: "Phone", to: "0491 571 804", outcome: "No answer", note: "" },
      { id: "C-809", at: "2026-11-18 14:20", patientId: "P-2211", by: "Kerrin", method: "Phone", to: "0491 570 157", outcome: "Spoke to patient", note: "Told result normal per Dr Vennor" },
      { id: "C-810", at: "2026-11-17 10:00", patientId: "P-2225", by: "Kerrin", method: "Letter", to: "Postal address on file", outcome: "Posted", note: "Recall letter: please book an appointment" },
      { id: "C-811", at: "2026-11-19 11:48", patientId: "P-2242", by: "Tash", method: "Phone", to: "0491 570 737", outcome: "Spoke to patient", note: "Booked Mon with Dr Elmsworth" },
    ],
  },
  appts: {
    title: "Appointment book",
    file: "appointments.csv",
    cols: ["id", "date", "time", "gp", "patientId", "type", "booked", "status"],
    heads: ["Appt", "Date", "Time", "GP", "Patient ID", "Type", "Booked on", "Status"],
    lines: [
      { id: "A-3310", date: "2026-11-12", time: "09:30", gp: "DRV", patientId: "P-2201", type: "Standard", booked: "2026-11-10", status: "Completed" },
      { id: "A-3318", date: "2026-11-13", time: "14:00", gp: "DRQ", patientId: "P-2208", type: "Standard", booked: "2026-11-10", status: "Did not attend" },
      { id: "A-3392", date: "2026-11-26", time: "11:15", gp: "DRQ", patientId: "P-2214", type: "Standard", booked: "2026-11-17", status: "Booked" },
      { id: "A-3405", date: "2026-11-23", time: "08:45", gp: "DRE", patientId: "P-2242", type: "Standard", booked: "2026-11-19", status: "Booked" },
    ],
  },
  leave: {
    title: "GP leave",
    file: "leave.csv",
    cols: ["id", "gp", "from", "to", "kind"],
    heads: ["Entry", "GP", "From", "To", "Kind"],
    lines: [
      { id: "L-41", gp: "DRE", from: "2026-11-23", to: "2026-11-27", kind: "Annual leave" },
      { id: "L-42", gp: "DRV", from: "2026-12-07", to: "2026-12-11", kind: "Conference" },
    ],
  },
};
