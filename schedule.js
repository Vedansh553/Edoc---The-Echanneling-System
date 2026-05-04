// ==========================================
// SCHEDULE.JS - FIXED VERSION
// Complete Session/Schedule Management
// ==========================================

const API_URL = 'http://localhost:5000/api';

// ==========================================
// AUTHENTICATION CHECK
// ==========================================
function checkAuth() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('⚠️ Please login first!');
    window.location.href = 'login.html';
    return false;
  }
  
  return true;
}

// ==========================================
// LOAD ALL SESSIONS
// ==========================================
async function loadSessions() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const sessions = await response.json();
      displaySessions(sessions);
      
      // Populate doctor dropdown
      await populateDoctorDropdown();
      
    } else if (response.status === 401) {
      alert('⚠️ Session expired. Please login again.');
      window.location.href = 'login.html';
    } else {
      console.error('Failed to load sessions');
      alert('❌ Failed to load sessions');
    }
    
  } catch (error) {
    console.error('Error loading sessions:', error);
    alert('❌ Error! Make sure backend is running at http://localhost:5000');
  }
}

// ==========================================
// DISPLAY SESSIONS IN TABLE
// ==========================================
function displaySessions(sessions) {
  const tbody = document.getElementById('sessionTable');
  
  if (!tbody) {
    console.error('Session table not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (sessions.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No sessions found</td></tr>';
    return;
  }
  
  // Sort by datetime (upcoming first)
  sessions.sort((a, b) => {
    return new Date(a.scheduled_datetime) - new Date(b.scheduled_datetime);
  });
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.scheduled_datetime);
    const isPast = sessionDate < new Date();
    
    const row = `
      <tr data-session-id="${session.id}" ${isPast ? 'style="opacity:0.6"' : ''}>
        <td>${session.title}</td>
        <td>${session.doctor_name}</td>
        <td>${formatDateTime(session.scheduled_datetime)}</td>
        <td>${session.max_bookings}</td>
        <td>
          <button class="btn-primary" onclick="viewSession(${session.id})">View</button>
          <button class="btn-danger" onclick="removeSession(${session.id})" ${isPast ? 'disabled' : ''}>Remove</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// ==========================================
// POPULATE DOCTOR DROPDOWN
// ==========================================
async function populateDoctorDropdown() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/doctors`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const doctors = await response.json();
      
      // Update filter dropdown
      const filterDropdown = document.getElementById('filterDoctor');
      if (filterDropdown) {
        filterDropdown.innerHTML = '<option value="">Choose Doctor Name from the list</option>';
        
        doctors.forEach(doc => {
          const option = document.createElement('option');
          option.value = doc.id;
          option.textContent = doc.name;
          filterDropdown.appendChild(option);
        });
      }
      
      // Update modal dropdown
      const modalDropdown = document.getElementById('doctor');
      if (modalDropdown) {
        modalDropdown.innerHTML = '<option value="">Select Doctor</option>';
        
        doctors.forEach(doc => {
          const option = document.createElement('option');
          option.value = doc.id;
          option.textContent = `${doc.name} - ${doc.specialization}`;
          modalDropdown.appendChild(option);
        });
      }
      
    }
    
  } catch (error) {
    console.error('Error loading doctors:', error);
  }
}

// ==========================================
// VIEW SESSION DETAILS
// ==========================================
async function viewSession(sessionId) {
  const token = localStorage.getItem('token');
  
  try {
    // Get session details
    const response = await fetch(`${API_URL}/sessions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const sessions = await response.json();
      const session = sessions.find(s => s.id === sessionId);
      
      if (session) {
        // Get appointments for this session
        const apptResponse = await fetch(`${API_URL}/appointments`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        let bookedCount = 0;
        if (apptResponse.ok) {
          const appointments = await apptResponse.json();
          bookedCount = appointments.filter(apt => apt.session_id === sessionId).length;
        }
        
        const availableSlots = session.max_bookings - bookedCount;
        
        alert(`
📋 SESSION DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Title: ${session.title}
👨‍⚕️ Doctor: ${session.doctor_name}
🏥 Specialization: ${session.specialization}
📅 Date & Time: ${formatDateTime(session.scheduled_datetime)}
👥 Max Bookings: ${session.max_bookings}
✅ Booked: ${bookedCount}
🔓 Available: ${availableSlots}
        `);
      } else {
        alert('❌ Session not found');
      }
    }
    
  } catch (error) {
    console.error('Error viewing session:', error);
    alert('❌ Error loading session details');
  }
}

// ==========================================
// REMOVE/DELETE SESSION
// ==========================================
async function removeSession(sessionId) {
  const confirmed = confirm('⚠️ Are you sure you want to remove this session?\n\nThis will also cancel all appointments for this session!\n\nThis action cannot be undone!');
  
  if (!confirmed) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      alert('✅ Session removed successfully!');
      
      // Remove row from table
      const row = document.querySelector(`tr[data-session-id="${sessionId}"]`);
      if (row) {
        row.remove();
      }
      
    } else if (response.status === 404) {
      alert('❌ Session not found');
    } else {
      const error = await response.json();
      alert(`❌ Failed to remove: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error removing session:', error);
    alert('❌ Error removing session');
  }
}

// ==========================================
// FILTER SESSIONS
// ==========================================
function filterSessions() {
  const filterDate = document.getElementById('filterDate').value;
  const filterDoctor = document.getElementById('filterDoctor').value;
  
  const rows = document.querySelectorAll('#sessionTable tr');
  
  let foundCount = 0;
  
  rows.forEach(row => {
    if (!row.cells[0]) return;
    
    let showRow = true;
    
    // Filter by date
    if (filterDate) {
      const sessionDatetime = row.cells[2].innerText;
      if (!sessionDatetime.startsWith(filterDate)) {
        showRow = false;
      }
    }
    
    // Filter by doctor
    if (filterDoctor) {
      const doctorName = row.cells[1].innerText;
      const selectedDoctor = document.getElementById('filterDoctor');
      const selectedDoctorName = selectedDoctor.options[selectedDoctor.selectedIndex].text;
      
      if (doctorName !== selectedDoctorName) {
        showRow = false;
      }
    }
    
    if (showRow) {
      row.style.display = '';
      foundCount++;
    } else {
      row.style.display = 'none';
    }
  });
  
  if (foundCount === 0) {
    alert('❌ No sessions match the selected filters');
  }
}

// Setup filter button
document.addEventListener('DOMContentLoaded', function() {
  const filterBtn = document.getElementById('filterBtn');
  
  if (filterBtn) {
    filterBtn.addEventListener('click', filterSessions);
  }
});

// ==========================================
// MODAL FUNCTIONALITY
// ==========================================
function setupModal() {
  const modal = document.getElementById("sessionModal");
  const addBtn = document.getElementById("addSessionBtn");
  const closeBtn = document.getElementById("closeModal");
  const form = document.getElementById("sessionForm");
  
  if (!modal || !addBtn || !closeBtn || !form) {
    console.error('Modal elements not found');
    return;
  }
  
  // Open modal
  addBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });
  
  // Close modal
  closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
    form.reset();
  });
  
  // Close on outside click
  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      form.reset();
    }
  });
  
  // Form submission
  form.addEventListener("submit", handleAddSession);
}

// ==========================================
// ADD NEW SESSION
// ==========================================
async function handleAddSession(e) {
  e.preventDefault();
  
  const title = document.getElementById("title").value.trim();
  const doctorId = document.getElementById("doctor").value;
  const datetime = document.getElementById("datetime").value;
  const maxBookings = document.getElementById("maxBookings").value;
  
  // Validation
  if (!title || !doctorId || !datetime || !maxBookings) {
    alert('⚠️ Please fill all fields!');
    return;
  }
  
  if (parseInt(maxBookings) < 1) {
    alert('⚠️ Max bookings must be at least 1!');
    return;
  }
  
  // Check if datetime is in the future
  const selectedDate = new Date(datetime);
  const now = new Date();
  
  if (selectedDate <= now) {
    alert('⚠️ Please select a future date and time!');
    return;
  }
  
  const token = localStorage.getItem('token');
  
  // Show loading
  const submitBtn = document.querySelector('#sessionForm button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Adding...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: title,
        doctor_id: parseInt(doctorId),
        scheduled_datetime: datetime,
        max_bookings: parseInt(maxBookings)
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('✅ Session added successfully!');
      
      // Close modal
      document.getElementById("sessionModal").style.display = "none";
      document.getElementById("sessionForm").reset();
      
      // Reload sessions
      await loadSessions();
      
    } else {
      alert(`❌ Failed to add session: ${data.message}`);
    }
    
  } catch (error) {
    console.error('Error adding session:', error);
    alert('❌ Error adding session! Make sure backend is running.');
  } finally {
    // Reset button
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

// ==========================================
// BOOK APPOINTMENT FROM SCHEDULE
// ==========================================
async function bookAppointmentForSession(sessionId) {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (user.role !== 'patient') {
    alert('⚠️ Only patients can book appointments!');
    return;
  }
  
  const confirmed = confirm('Do you want to book this session?');
  if (!confirmed) return;
  
  const token = localStorage.getItem('token');
  
  try {
    // Get patient ID first
    const patientResponse = await fetch(`${API_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!patientResponse.ok) {
      alert('❌ Could not load patient information');
      return;
    }
    
    const patients = await patientResponse.json();
    const currentPatient = patients.find(p => p.email === user.email);
    
    if (!currentPatient) {
      alert('❌ Patient profile not found');
      return;
    }
    
    // Book appointment
    const response = await fetch(`${API_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        patient_id: currentPatient.id,
        session_id: sessionId
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('✅ Appointment booked successfully!');
      window.location.href = 'appointment.html';
    } else {
      alert(`❌ ${data.message}`);
    }
    
  } catch (error) {
    console.error('Error booking appointment:', error);
    alert('❌ Error booking appointment');
  }
}

// ==========================================
// LOGOUT FUNCTIONALITY
// ==========================================
function setupLogout() {
  const logoutBtn = document.querySelector('.logout');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      alert('✅ Logged out successfully!');
      window.location.href = 'login.html';
    });
  }
}

// ==========================================
// UPDATE TODAY'S DATE
// ==========================================
function updateDate() {
  const todayDate = document.getElementById("today-date");
  
  if (todayDate) {
    todayDate.textContent = new Date().toISOString().split("T")[0];
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Format datetime for display
 */
function formatDateTime(datetime) {
  const date = new Date(datetime);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

// ==========================================
// INITIALIZE PAGE
// ==========================================
document.addEventListener("DOMContentLoaded", async function() {
  // Check authentication
  if (!checkAuth()) {
    return;
  }
  
  // Setup logout
  setupLogout();
  
  // Update today's date
  updateDate();
  
  // Setup modal
  setupModal();
  
  // Load sessions
  await loadSessions();
  
  // Check for doctor search query from appointment page
  const searchQuery = localStorage.getItem('doctorSearchQuery');
  if (searchQuery) {
    // Auto-populate filter
    const filterInput = document.getElementById('filterDoctor');
    if (filterInput) {
      // Find matching doctor in dropdown
      for (let option of filterInput.options) {
        if (option.text.toLowerCase().includes(searchQuery.toLowerCase())) {
          filterInput.value = option.value;
          filterSessions();
          break;
        }
      }
    }
    localStorage.removeItem('doctorSearchQuery');
  }
  
  console.log('✅ Schedule page loaded successfully');
});

// ==========================================
// EXPORT FUNCTIONS
// ==========================================
window.viewSession = viewSession;
window.removeSession = removeSession;
window.filterSessions = filterSessions;
window.bookAppointmentForSession = bookAppointmentForSession;