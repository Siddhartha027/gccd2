const storageKeys = {
  patient: "careSync.patient",
  meds: "careSync.medicines",
  notifications: "careSync.notifications",
  bp: "careSync.bp",
  reminderLog: "careSync.reminderLog"
};

const defaultPatient = {
  name: "Anita Sharma",
  age: 72,
  doctorPhone: "+91 98765 43210",
  diseases: "Diabetes, Hypertension",
  history: "Type 2 diabetes for 8 years. Mild arthritis. Allergy to penicillin."
};

const defaultMeds = [
  { id: crypto.randomUUID(), name: "Metformin", dose: "500 mg", time: "08:00", frequency: "Daily" },
  { id: crypto.randomUUID(), name: "Amlodipine", dose: "5 mg", time: "20:00", frequency: "Daily" }
];

const defaultNotifications = [
  { id: crypto.randomUUID(), type: "info", text: "Care dashboard ready. Add medicine timings to start reminders." }
];

const patientForm = document.getElementById("patientForm");
const medicationForm = document.getElementById("medicationForm");
const bpForm = document.getElementById("bpForm");

const patientSummary = document.getElementById("patientSummary");
const medicationList = document.getElementById("medicationList");
const caregiverPanel = document.getElementById("caregiverPanel");
const notificationFeed = document.getElementById("notificationFeed");
const healthAlertBox = document.getElementById("healthAlertBox");

const heroNextDose = document.getElementById("nextDoseHero");
const patientCount = document.getElementById("patientCount");
const todayMedCount = document.getElementById("todayMedCount");
const activeAlertCount = document.getElementById("activeAlertCount");

const requestNotificationsBtn = document.getElementById("requestNotifications");
const viewRecordsBtn = document.getElementById("viewRecordsBtn");
const jumpMedicationBtn = document.getElementById("jumpMedicationBtn");
const callDoctorBtn = document.getElementById("callDoctorBtn");

const getStoredJSON = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

let patient = getStoredJSON(storageKeys.patient, defaultPatient);
let medicines = getStoredJSON(storageKeys.meds, defaultMeds);
let notifications = getStoredJSON(storageKeys.notifications, defaultNotifications);
let bpReading = getStoredJSON(storageKeys.bp, null);
let reminderLog = getStoredJSON(storageKeys.reminderLog, {});

function saveState() {
  localStorage.setItem(storageKeys.patient, JSON.stringify(patient));
  localStorage.setItem(storageKeys.meds, JSON.stringify(medicines));
  localStorage.setItem(storageKeys.notifications, JSON.stringify(notifications.slice(0, 12)));
  localStorage.setItem(storageKeys.bp, JSON.stringify(bpReading));
  localStorage.setItem(storageKeys.reminderLog, JSON.stringify(reminderLog));
}

function addNotification(text, type = "info") {
  notifications.unshift({
    id: crypto.randomUUID(),
    type,
    text,
    createdAt: new Date().toLocaleString()
  });
  notifications = notifications.slice(0, 12);
  saveState();
  renderNotifications();
  updateHeroStats();
}

function getNextDose() {
  if (!medicines.length) return null;

  const now = new Date();
  const ranked = medicines
    .map((med) => {
      const [hours, minutes] = med.time.split(":").map(Number);
      const due = new Date();
      due.setHours(hours, minutes, 0, 0);
      if (due < now) due.setDate(due.getDate() + 1);
      return { ...med, due };
    })
    .sort((a, b) => a.due - b.due);

  return ranked[0];
}

function renderPatientSummary() {
  patientSummary.innerHTML = `
    <div class="fade-in">
      <h3>${patient.name || "No patient selected"}</h3>
      <p class="summary-meta">
        Age ${patient.age || "--"} - Diagnosed with ${patient.diseases || "no conditions added yet"}
      </p>
      <p><strong>Doctor contact:</strong> ${patient.doctorPhone || "Not added yet"}</p>
      <p>${patient.history || "Medical history will appear here once entered."}</p>
      <div class="metrics-row">
        <span class="metric-pill">Digital record active</span>
        <span class="metric-pill">Caregiver access ready</span>
        <span class="metric-pill">${medicines.length} medicine reminders</span>
      </div>
    </div>
  `;
}

function renderMedicationList() {
  if (!medicines.length) {
    medicationList.innerHTML = `<div class="list-item empty-state">No medications added yet. Use the form above to create reminders.</div>`;
    return;
  }

  const items = [...medicines].sort((a, b) => a.time.localeCompare(b.time)).map((med) => `
    <article class="list-item fade-in">
      <h3>${med.name}</h3>
      <p><strong>Dosage:</strong> ${med.dose}</p>
      <p><strong>Time:</strong> ${formatTime(med.time)} - <strong>Frequency:</strong> ${med.frequency}</p>
      <div class="status-row">
        <span class="badge">Reminder active</span>
        <button class="action-btn" data-remove-med="${med.id}">Remove</button>
      </div>
    </article>
  `).join("");

  medicationList.innerHTML = items;
}

function evaluateBP() {
  if (!bpReading) {
    healthAlertBox.className = "alert-box calm";
    healthAlertBox.textContent = "Add a blood pressure reading to generate smart health alerts.";
    return;
  }

  const { systolic, diastolic } = bpReading;
  let message = `Latest BP reading: ${systolic}/${diastolic} mmHg.`;
  let tone = "calm";

  if (systolic >= 140 || diastolic >= 90) {
    tone = "high";
    message = `BP is too high: ${systolic}/${diastolic} mmHg. Contact a doctor or monitor again soon.`;
  } else if (systolic <= 90 || diastolic <= 60) {
    tone = "low";
    message = `BP is too low: ${systolic}/${diastolic} mmHg. Ensure the patient rests and consider medical advice.`;
  } else {
    message = `BP is stable at ${systolic}/${diastolic} mmHg. Continue regular monitoring.`;
  }

  healthAlertBox.className = `alert-box ${tone}`;
  healthAlertBox.textContent = message;
}

function renderCaregiverPanel() {
  const nextDose = getNextDose();
  caregiverPanel.innerHTML = `
    <article class="caregiver-card fade-in">
      <h3>Patient snapshot</h3>
      <p><strong>Name:</strong> ${patient.name}</p>
      <p><strong>Age:</strong> ${patient.age}</p>
      <p><strong>Doctor:</strong> ${patient.doctorPhone || "Not added yet"}</p>
      <p><strong>Conditions:</strong> ${patient.diseases || "Not added yet"}</p>
    </article>
    <article class="caregiver-card fade-in">
      <h3>Medication schedule</h3>
      <p>${medicines.length ? `${medicines.length} active medicines on the plan.` : "No medicines scheduled yet."}</p>
      <p><strong>Next dose:</strong> ${nextDose ? `${nextDose.name} at ${formatTime(nextDose.time)}` : "No medicine reminders configured"}</p>
    </article>
    <article class="caregiver-card fade-in">
      <h3>Health status</h3>
      <p><strong>Latest BP:</strong> ${bpReading ? `${bpReading.systolic}/${bpReading.diastolic} mmHg` : "No reading yet"}</p>
      <p><strong>Alert state:</strong> ${healthAlertBox.textContent}</p>
    </article>
  `;
}

function renderNotifications() {
  notificationFeed.innerHTML = notifications.length
    ? notifications.map((item) => `
      <article class="list-item fade-in notification-${item.type}">
        <h3>${item.type === "alert" ? "Health alert" : "Reminder update"}</h3>
        <p>${item.text}</p>
        <p><strong>${item.createdAt || "Just now"}</strong></p>
      </article>
    `).join("")
    : `<div class="list-item empty-state">No notifications yet.</div>`;
}

function updateHeroStats() {
  const nextDose = getNextDose();
  const alertTotal = notifications.filter((item) => item.type === "alert").length;

  heroNextDose.textContent = nextDose
    ? `${nextDose.name} at ${formatTime(nextDose.time)}`
    : "No medicines added";
  patientCount.textContent = patient.name ? "1" : "0";
  todayMedCount.textContent = String(medicines.length);
  activeAlertCount.textContent = String(alertTotal);
}

function formatTime(value) {
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function fillForms() {
  document.getElementById("patientName").value = patient.name || "";
  document.getElementById("patientAge").value = patient.age || "";
  document.getElementById("doctorPhone").value = patient.doctorPhone || "";
  document.getElementById("patientDiseases").value = patient.diseases || "";
  document.getElementById("patientHistory").value = patient.history || "";
}

function renderAll() {
  callDoctorBtn.href = `tel:${(patient.doctorPhone || "+911234567890").replace(/\s+/g, "")}`;
  renderPatientSummary();
  renderMedicationList();
  evaluateBP();
  renderCaregiverPanel();
  renderNotifications();
  updateHeroStats();
}

function triggerBrowserNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification(title, { body });
}

function checkMedicineReminders() {
  if (!medicines.length) return;

  const now = new Date();
  const currentSlot = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

  medicines.forEach((med) => {
    const [hours, minutes] = med.time.split(":").map(Number);
    if (now.getHours() === hours && now.getMinutes() === minutes) {
      const reminderKey = `${med.id}-${currentSlot}`;
      if (!reminderLog[reminderKey]) {
        const message = `Time for ${med.name} (${med.dose}) at ${formatTime(med.time)}.`;
        addNotification(message, "info");
        triggerBrowserNotification("Medicine Reminder", message);
        reminderLog[reminderKey] = true;
        saveState();
      }
    }
  });
}

patientForm.addEventListener("submit", (event) => {
  event.preventDefault();
  patient = {
    name: document.getElementById("patientName").value.trim(),
    age: document.getElementById("patientAge").value.trim(),
    doctorPhone: document.getElementById("doctorPhone").value.trim(),
    diseases: document.getElementById("patientDiseases").value.trim(),
    history: document.getElementById("patientHistory").value.trim()
  };
  saveState();
  renderAll();
  addNotification(`Patient details updated for ${patient.name}.`, "info");
});

medicationForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const medicine = {
    id: crypto.randomUUID(),
    name: document.getElementById("medicineName").value.trim(),
    dose: document.getElementById("medicineDose").value.trim(),
    time: document.getElementById("medicineTime").value,
    frequency: document.getElementById("medicineFrequency").value
  };

  medicines.push(medicine);
  medicationForm.reset();
  saveState();
  renderAll();
  addNotification(`${medicine.name} added with a reminder at ${formatTime(medicine.time)}.`, "info");
});

bpForm.addEventListener("submit", (event) => {
  event.preventDefault();
  bpReading = {
    systolic: Number(document.getElementById("systolicInput").value),
    diastolic: Number(document.getElementById("diastolicInput").value),
    updatedAt: new Date().toISOString()
  };

  saveState();
  renderAll();

  if (bpReading.systolic >= 140 || bpReading.diastolic >= 90) {
    addNotification(`BP is too high: ${bpReading.systolic}/${bpReading.diastolic} mmHg.`, "alert");
  } else if (bpReading.systolic <= 90 || bpReading.diastolic <= 60) {
    addNotification(`BP is too low: ${bpReading.systolic}/${bpReading.diastolic} mmHg.`, "alert");
  } else {
    addNotification(`BP logged as stable: ${bpReading.systolic}/${bpReading.diastolic} mmHg.`, "info");
  }

  bpForm.reset();
});

medicationList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove-med]");
  if (!button) return;
  const medId = button.getAttribute("data-remove-med");
  medicines = medicines.filter((item) => item.id !== medId);
  saveState();
  renderAll();
  addNotification("Medication removed from the schedule.", "info");
});

requestNotificationsBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    addNotification("Browser notifications are not supported on this device.", "alert");
    return;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    addNotification("Browser reminder alerts enabled.", "info");
  } else {
    addNotification("Reminder alerts were not enabled. The dashboard will still show on-screen reminders.", "alert");
  }
});

viewRecordsBtn.addEventListener("click", () => {
  document.getElementById("dashboard").scrollIntoView({ behavior: "smooth" });
  addNotification("Viewing patient health records.", "info");
});

jumpMedicationBtn.addEventListener("click", () => {
  document.getElementById("medicationSection").scrollIntoView({ behavior: "smooth" });
  document.getElementById("medicineName").focus();
});

fillForms();
renderAll();
checkMedicineReminders();
setInterval(checkMedicineReminders, 30000);
