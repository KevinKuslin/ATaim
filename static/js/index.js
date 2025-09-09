const video = document.getElementById('video');

function updateRecentList() {
    fetch("/api/recent_attendees")
        .then(response => response.json())
        .then(data => {
            const list = document.getElementById("recentList");
            list.innerHTML = "";  // Kosongkan list dulu
            data.forEach(nama => {
                const li = document.createElement("li");
                li.textContent = "🔍 " + nama;
                list.appendChild(li);
            });
        })
        .catch(err => console.error("Error fetching recent attendees:", err));
}

// Update setiap 1–2 detik
setInterval(updateRecentList, 1500);

/* ================= DATE ================= */
function updateDate() {
  const options = { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' };
  const today = new Date();
  document.getElementById("currentDate").textContent = today.toLocaleDateString('en-ID', options);
}
updateDate();

/* ================= CLOCK ================= */
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  document.getElementById("clock").textContent = `${h} : ${m} : ${s}`;
}
setInterval(updateClock, 1000);
updateClock();

/* ================= NAVIGATION ================= */
function goStudent() {
  window.location.href = "/student";
}
function goTemplate() {
  window.location.href = "/";
}

/* ================= GANTI STATUS ================= */
function changeStatus(status, color) {
    const selectedStudent = document.getElementById("studentName").textContent;
    if (!selectedStudent || selectedStudent === "Select a student") return;

    // Update tampilan di container-student
    const statusSpan = document.getElementById("studentStatus");
    statusSpan.textContent = status;
    statusSpan.style.color = color;

    // Update tampilan di student list
    const studentItems = document.querySelectorAll("#studentList li");
    studentItems.forEach(li => {
        if (li.dataset.name === selectedStudent) {
            li.dataset.status = status;
            li.dataset.color = color;
            const icon = li.querySelector(".icon");
            icon.className = "icon status-" + color;
        }
    });
}


/* ================= LOAD PRESENSI ================= */
async function loadPresensi() {
  try {
    const res = await fetch("/api/presensi");
    const data = await res.json();

    const list = document.getElementById("recentList");
    list.innerHTML = "";

    data.forEach(item => {
      const li = document.createElement("li");
      li.textContent = `🔍 ${item.nama} (${item.status})`;
      list.appendChild(li);
    });
  } catch (err) {
    console.error("Gagal load presensi:", err);
  }
}

/* ================= TAMBAH PRESENSI ================= */
async function tambahPresensi(nama, status = "Hadir") {
  try {
    await fetch("/api/presensi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nama, status })
    });
    loadPresensi();
  } catch (err) {
    console.error("Gagal tambah presensi:", err);
  }
}

/* ================= RESET PRESENSI (Hanya frontend) ================= */
function resetAttendance() {
    fetch("/reset_presensi", {
        method: "POST"
    })
    .then(response => {
        if (response.ok) {
            // Kosongkan list di browser
            document.getElementById("recentList").innerHTML = "";
        } else {
            console.error("Gagal reset presensi");
        }
    })
    .catch(err => console.error("Error:", err));
}

async function resetAttendance() {
    try {
        const res = await fetch("/reset_presensi", { method: "POST" });
        if (res.ok) {
            await loadStatusPresensi();
        }
    } catch (err) {
        console.error("Error reset presensi:", err);
    }
}

/* Panggil pertama kali */
loadPresensi();

async function saveAttendance() {
    const name = document.getElementById("studentName").textContent;
    const status = document.getElementById("studentStatus").textContent;

    if (!name || name === "Select a student") return;

    try {
        const res = await fetch("/api/update_status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nama: name, status: status })
        });

        if (res.ok) {
            alert(`${name} status updated to ${status}`);
        } else {
            console.error("Gagal update status");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

// async function loadStatusPresensi() {
//   try {
//     const res = await fetch("/api/status_presensi");
//     const data = await res.json();

//     const list = document.getElementById("recentList");
//     list.innerHTML = "";

//     data.forEach(item => {
//       const li = document.createElement("li");
//       li.innerHTML = `🔍 ${item.nama} <span class="${item.status === 'Hadir' ? 'status-green' : 'status-red'}">${item.status}</span>`;
//       list.appendChild(li);
//     });
//   } catch (err) {
//     console.error("Gagal load status presensi:", err);
//   }
// }

function selectStudent(element) {
  // Ambil data dari atribut li
  const name = element.getAttribute("data-name");
  const status = element.getAttribute("data-status");
  const color = element.getAttribute("data-color");

  // Update panel kiri
  document.getElementById("studentName").textContent = name;
  const statusEl = document.getElementById("studentStatus");
  statusEl.textContent = status;

  // Reset warna status
  statusEl.className = "";
  // Tambah warna sesuai status
  if (color === "green") {
    statusEl.classList.add("status-green");
  } else if (color === "red") {
    statusEl.classList.add("status-red");
  } else if (color === "blue") {
    statusEl.classList.add("status-blue");
  }
}

// async function loadStudentList() {
//   try {
//     const res = await fetch("/api/status_presensi");
//     const data = await res.json();
//     console.log("DATA STUDENT LIST:", data);

//     const list = document.getElementById("studentList");
//     list.innerHTML = "";

//     data.forEach(item => {
//       const li = document.createElement("li");
//       li.setAttribute("onclick", "selectStudent(this)");
//       li.setAttribute("data-name", item.nama);
//       li.setAttribute("data-status", item.status);

//       // tentukan warna
//       let color = "red";
//       if (item.status === "Logged In" || item.status === "Hadir") color = "green";
//       if (item.status === "Permit") color = "blue";

//       li.setAttribute("data-color", color);
//       li.innerHTML = `<span><span class="icon status-${color}"></span> ${item.nama}</span>`;
//       list.appendChild(li);
//     });
//   } catch (err) {
//     console.error("Gagal load student list:", err);
//   }
// }

async function loadStatusPresensi() {
  try {
    const res = await fetch("/api/status_presensi");
    const data = await res.json();

    // ==== Update Recent List ====
    const recentList = document.getElementById("recentList");
    if (recentList) {
      recentList.innerHTML = "";
      data.forEach(item => {
        const li = document.createElement("li");
        li.innerHTML = `🔍 ${item.nama} <span class="${item.status === 'Hadir' ? 'status-green' : 'status-red'}">${item.status}</span>`;
        recentList.appendChild(li);
      });
    }

    // ==== Update Student List ====
    const studentList = document.getElementById("studentList");
    if (studentList) {
      studentList.innerHTML = "";
      data.forEach(item => {
        const li = document.createElement("li");
        li.setAttribute("onclick", "selectStudent(this)");
        li.setAttribute("data-name", item.nama);
        li.setAttribute("data-status", item.status);

        let colorClass = "status-red";
        if (item.status === "Logged In" || item.status === "Hadir") colorClass = "status-green";
        if (item.status === "Permit") colorClass = "status-blue";

        li.setAttribute("data-color", colorClass.replace("status-", ""));
        li.innerHTML = `<span><span class="icon ${colorClass}"></span> ${item.nama}</span>`;
        studentList.appendChild(li);
      });
    }

  } catch (err) {
    console.error("Gagal load status presensi:", err);
  }
}

// auto-refresh setiap 3 detik
// if (document.getElementById("recentList")) {
//     setInterval(loadStatusPresensi, 3000);
//     loadStatusPresensi();
// }

// if (document.getElementById("studentList")) {
//     setInterval(loadStudentList, 3000);
//     loadStudentList();
// }

setInterval(loadStatusPresensi, 3000);
loadStatusPresensi();