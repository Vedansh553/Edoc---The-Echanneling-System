// ==========================================
// DOCTORS.JS - FIXED VERSION
// Complete Doctor Management with PDF Download
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
// LOAD ALL DOCTORS
// ==========================================
async function loadDoctors() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/doctors`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const doctors = await response.json();
      displayDoctors(doctors);
    } else if (response.status === 401) {
      alert('⚠️ Session expired. Please login again.');
      window.location.href = 'login.html';
    } else {
      console.error('Failed to load doctors');
      alert('❌ Failed to load doctors');
    }
    
  } catch (error) {
    console.error('Error loading doctors:', error);
    alert('❌ Error! Make sure backend is running at http://localhost:5000');
  }
}

// ==========================================
// DISPLAY DOCTORS IN TABLE
// ==========================================
function displayDoctors(doctors) {
  const tbody = document.getElementById('doctorTable');
  
  if (!tbody) {
    console.error('Doctor table not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (doctors.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No doctors found</td></tr>';
    return;
  }
  
  doctors.forEach(doctor => {
    const row = `
      <tr data-doctor-id="${doctor.id}">
        <td>${doctor.name}</td>
        <td>${doctor.email}</td>
        <td>${doctor.specialization}</td>
        <td>
          <button class="edit" onclick="editDoctor(${doctor.id})">Edit</button>
          <button class="view" onclick="viewDoctor(${doctor.id})">View</button>
          <button class="remove" onclick="removeDoctor(${doctor.id})">Remove</button>
        </td>
        <td>
          <button class="btn-pdf" onclick="downloadDoctorPDF(${doctor.id})">
            📄 Download
          </button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// ==========================================
// SEARCH DOCTOR
// ==========================================
function searchDoctor() {
  const input = document.getElementById("searchDoctor").value.toLowerCase().trim();
  const rows = document.querySelectorAll("#doctorTable tr");
  
  let foundCount = 0;
  
  rows.forEach(row => {
    if (!row.cells[0]) return; // Skip if no cells
    
    const name = row.cells[0].innerText.toLowerCase();
    const email = row.cells[1].innerText.toLowerCase();
    
    if (name.includes(input) || email.includes(input)) {
      row.style.display = "";
      foundCount++;
    } else {
      row.style.display = "none";
    }
  });
  
  // Show message if no results
  if (foundCount === 0 && input !== "") {
    alert(`No doctors found matching "${input}"`);
  }
}

// Setup search on Enter key
document.addEventListener('DOMContentLoaded', function() {
  const searchInput = document.getElementById('searchDoctor');
  if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchDoctor();
      }
    });
  }
});

// ==========================================
// VIEW DOCTOR DETAILS
// ==========================================
async function viewDoctor(doctorId) {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/doctors/${doctorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const doctor = await response.json();
      
      // Show doctor details in alert (you can make a modal for better UX)
      alert(`
📋 DOCTOR DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Name: ${doctor.name}
📧 Email: ${doctor.email}
📱 Phone: ${doctor.phone || 'N/A'}
🏥 Specialization: ${doctor.specialization}
🎓 Qualification: ${doctor.qualification}
⏱️ Experience: ${doctor.experience} years
      `);
      
    } else {
      alert('❌ Failed to load doctor details');
    }
    
  } catch (error) {
    console.error('Error viewing doctor:', error);
    alert('❌ Error loading doctor details');
  }
}

// ==========================================
// EDIT DOCTOR
// ==========================================
async function editDoctor(doctorId) {
  const token = localStorage.getItem('token');
  
  try {
    // First, get current doctor details
    const response = await fetch(`${API_URL}/doctors/${doctorId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      alert('❌ Failed to load doctor details');
      return;
    }
    
    const doctor = await response.json();
    
    // Prompt for new values (you can make a proper form/modal)
    const newSpecialization = prompt('Enter specialization:', doctor.specialization);
    if (newSpecialization === null) return; // Cancelled
    
    const newQualification = prompt('Enter qualification:', doctor.qualification);
    if (newQualification === null) return;
    
    const newExperience = prompt('Enter experience (years):', doctor.experience);
    if (newExperience === null) return;
    
    // Update doctor
    const updateResponse = await fetch(`${API_URL}/doctors/${doctorId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        specialization: newSpecialization,
        qualification: newQualification,
        experience: parseInt(newExperience)
      })
    });
    
    if (updateResponse.ok) {
      alert('✅ Doctor updated successfully!');
      loadDoctors(); // Reload the list
    } else {
      const error = await updateResponse.json();
      alert(`❌ Failed to update: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error editing doctor:', error);
    alert('❌ Error updating doctor');
  }
}

// ==========================================
// REMOVE/DELETE DOCTOR
// ==========================================
async function removeDoctor(doctorId) {
  // Confirmation
  const confirmed = confirm('⚠️ Are you sure you want to remove this doctor?\n\nThis action cannot be undone!');
  
  if (!confirmed) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/doctors/${doctorId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      alert('✅ Doctor removed successfully!');
      
      // Remove row from table (visual feedback)
      const row = document.querySelector(`tr[data-doctor-id="${doctorId}"]`);
      if (row) {
        row.remove();
      }
      
      // Or reload entire list
      // loadDoctors();
      
    } else if (response.status === 404) {
      alert('❌ Doctor not found');
    } else {
      const error = await response.json();
      alert(`❌ Failed to remove: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error removing doctor:', error);
    alert('❌ Error removing doctor');
  }
}

// ==========================================
// ADD NEW DOCTOR (Placeholder)
// ==========================================
function addDoctor() {
  // This would open a form modal in a real application
  alert('⚠️ Add Doctor feature coming soon!\n\nFor now, use the API directly or add through database.');
  
  // Example prompt-based adding (not recommended for production)
  /*
  const name = prompt('Enter doctor name:');
  const email = prompt('Enter email:');
  const password = prompt('Enter password:');
  const specialization = prompt('Enter specialization:');
  // ... more fields
  
  // Then make POST request to /api/auth/register and /api/doctors
  */
}

// ==========================================
// PDF DOWNLOAD - SINGLE DOCTOR
// ==========================================
async function downloadDoctorPDF(doctorId) {
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('⚠️ Please login first!');
    window.location.href = 'login.html';
    return;
  }
  
  try {
    const response = await fetch(`${API_URL}/doctors/${doctorId}/pdf`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      // Get PDF blob
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `doctor_${doctorId}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ PDF downloaded successfully!');
      
    } else if (response.status === 404) {
      alert('❌ Doctor not found');
    } else {
      alert('❌ Failed to download PDF');
    }
    
  } catch (error) {
    console.error('Error downloading PDF:', error);
    alert('❌ Error! Make sure:\n\n1. Backend is running\n2. reportlab is installed\n3. Doctor exists in database');
  }
}

// ==========================================
// PDF DOWNLOAD - ALL DOCTORS
// ==========================================
async function downloadAllDoctorsPDF() {
  const token = localStorage.getItem('token');
  
  if (!token) {
    alert('⚠️ Please login first!');
    window.location.href = 'login.html';
    return;
  }
  
  // Show loading message
  const originalText = event.target.textContent;
  event.target.textContent = '⏳ Generating PDF...';
  event.target.disabled = true;
  
  try {
    const response = await fetch(`${API_URL}/doctors/pdf/all`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Filename with current date
      const today = new Date().toISOString().split('T')[0];
      a.download = `all_doctors_${today}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      alert('✅ All doctors PDF downloaded successfully!');
      
    } else {
      alert('❌ Failed to download PDF');
    }
    
  } catch (error) {
    console.error('Error:', error);
    alert('❌ Error downloading PDF. Make sure backend is running.');
  } finally {
    // Reset button
    event.target.textContent = originalText;
    event.target.disabled = false;
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
  const dateElement = document.querySelector('.date');
  
  if (dateElement) {
    const today = new Date().toISOString().split('T')[0];
    dateElement.innerHTML = `Today's Date: <strong>${today}</strong>`;
  }
}

// ==========================================
// INITIALIZE PAGE
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication
  if (!checkAuth()) {
    return;
  }
  
  // Setup logout
  setupLogout();
  
  // Update date
  updateDate();
  
  // Load doctors
  await loadDoctors();
  
  // Check if there's a search query from dashboard
  const searchQuery = localStorage.getItem('searchQuery');
  if (searchQuery) {
    document.getElementById('searchDoctor').value = searchQuery;
    searchDoctor();
    localStorage.removeItem('searchQuery'); // Clear it
  }
  
  console.log('✅ Doctors page loaded successfully');
});

// ==========================================
// EXPORT FOR USE IN HTML
// ==========================================
// These functions are already globally available
// but we can also export them if needed

window.searchDoctor = searchDoctor;
window.viewDoctor = viewDoctor;
window.editDoctor = editDoctor;
window.removeDoctor = removeDoctor;
window.addDoctor = addDoctor;
window.downloadDoctorPDF = downloadDoctorPDF;
window.downloadAllDoctorsPDF = downloadAllDoctorsPDF;