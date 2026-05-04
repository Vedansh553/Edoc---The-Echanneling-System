// ==========================================
// PATIENT.JS - FIXED VERSION
// Complete Patient Management System
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
// LOAD ALL PATIENTS
// ==========================================
async function loadPatients() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const patients = await response.json();
      displayPatients(patients);
    } else if (response.status === 401) {
      alert('⚠️ Session expired. Please login again.');
      window.location.href = 'login.html';
    } else {
      console.error('Failed to load patients');
      alert('❌ Failed to load patients');
    }
    
  } catch (error) {
    console.error('Error loading patients:', error);
    alert('❌ Error! Make sure backend is running at http://localhost:5000');
  }
}

// ==========================================
// DISPLAY PATIENTS IN TABLE
// ==========================================
function displayPatients(patients) {
  const tbody = document.getElementById('patientTable');
  
  if (!tbody) {
    console.error('Patient table not found');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (patients.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center">No patients found</td></tr>';
    return;
  }
  
  patients.forEach(patient => {
    const row = `
      <tr data-patient-id="${patient.id}">
        <td>${patient.id}</td>
        <td>${patient.name}</td>
        <td>${patient.email}</td>
        <td>${patient.phone || 'N/A'}</td>
        <td>
          <button class="btn-primary" onclick="viewPatient(${patient.id})">View</button>
          <button class="btn-danger" onclick="deletePatient(${patient.id})">Delete</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += row;
  });
}

// ==========================================
// VIEW PATIENT DETAILS
// ==========================================
async function viewPatient(patientId) {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/patients/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const patient = await response.json();
      
      // Format date of birth if exists
      const dob = patient.dob ? new Date(patient.dob).toLocaleDateString() : 'N/A';
      
      // Show patient details
      alert(`
📋 PATIENT DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 Name: ${patient.name}
📧 Email: ${patient.email}
📱 Phone: ${patient.phone || 'N/A'}
🏠 Address: ${patient.address || 'N/A'}
🎂 Date of Birth: ${dob}
🩸 Blood Group: ${patient.blood_group || 'N/A'}
      `);
      
    } else if (response.status === 404) {
      alert('❌ Patient not found');
    } else {
      alert('❌ Failed to load patient details');
    }
    
  } catch (error) {
    console.error('Error viewing patient:', error);
    alert('❌ Error loading patient details');
  }
}

// ==========================================
// DELETE PATIENT
// ==========================================
async function deletePatient(patientId) {
  // Confirmation
  const confirmed = confirm('⚠️ Are you sure you want to delete this patient?\n\nThis will also delete all their appointments!\n\nThis action cannot be undone!');
  
  if (!confirmed) return;
  
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/patients/${patientId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      alert('✅ Patient deleted successfully!');
      
      // Remove row from table
      const row = document.querySelector(`tr[data-patient-id="${patientId}"]`);
      if (row) {
        row.remove();
      }
      
      // Or reload entire list
      // loadPatients();
      
    } else if (response.status === 404) {
      alert('❌ Patient not found');
    } else {
      const error = await response.json();
      alert(`❌ Failed to delete: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error deleting patient:', error);
    alert('❌ Error deleting patient');
  }
}

// ==========================================
// ADD NEW PATIENT
// ==========================================
function addPatient() {
  // This would open a form modal in a real application
  alert('⚠️ Add Patient feature coming soon!\n\nFor now, patients can register through the registration page.');
  
  // Redirect to registration page
  const goToRegister = confirm('Would you like to go to the registration page?');
  if (goToRegister) {
    window.location.href = 'register.html';
  }
}

// Setup add patient button
document.addEventListener('DOMContentLoaded', function() {
  const addPatientBtn = document.getElementById('addPatientBtn');
  
  if (addPatientBtn) {
    addPatientBtn.addEventListener('click', addPatient);
  }
});

// ==========================================
// SEARCH PATIENT (Optional Enhancement)
// ==========================================
function searchPatient() {
  const searchInput = document.getElementById('searchPatient');
  
  if (!searchInput) return;
  
  const query = searchInput.value.toLowerCase().trim();
  const rows = document.querySelectorAll('#patientTable tr');
  
  let foundCount = 0;
  
  rows.forEach(row => {
    if (!row.cells[1]) return; // Skip if no cells
    
    const name = row.cells[1].innerText.toLowerCase();
    const email = row.cells[2].innerText.toLowerCase();
    
    if (name.includes(query) || email.includes(query)) {
      row.style.display = "";
      foundCount++;
    } else {
      row.style.display = "none";
    }
  });
  
  if (foundCount === 0 && query !== "") {
    alert(`No patients found matching "${query}"`);
  }
}

// ==========================================
// FILTER PATIENTS BY CRITERIA
// ==========================================
async function filterPatients(criteria) {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      let patients = await response.json();
      
      // Apply filters based on criteria
      if (criteria.bloodGroup) {
        patients = patients.filter(p => p.blood_group === criteria.bloodGroup);
      }
      
      if (criteria.ageMin || criteria.ageMax) {
        patients = patients.filter(p => {
          if (!p.dob) return false;
          
          const age = calculateAge(new Date(p.dob));
          
          if (criteria.ageMin && age < criteria.ageMin) return false;
          if (criteria.ageMax && age > criteria.ageMax) return false;
          
          return true;
        });
      }
      
      displayPatients(patients);
    }
    
  } catch (error) {
    console.error('Error filtering patients:', error);
  }
}

// ==========================================
// EXPORT PATIENTS TO CSV (Optional)
// ==========================================
async function exportPatientsToCSV() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const patients = await response.json();
      
      // Create CSV content
      let csv = 'ID,Name,Email,Phone,Address,DOB,Blood Group\n';
      
      patients.forEach(p => {
        csv += `${p.id},"${p.name}","${p.email}","${p.phone || 'N/A'}","${p.address || 'N/A'}","${p.dob || 'N/A'}","${p.blood_group || 'N/A'}"\n`;
      });
      
      // Create download link
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      alert('✅ Patient list exported to CSV!');
    }
    
  } catch (error) {
    console.error('Error exporting patients:', error);
    alert('❌ Error exporting patient list');
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
// UTILITY FUNCTIONS
// ==========================================

/**
 * Calculate age from date of birth
 */
function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return 'N/A';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
  }
  
  return phone;
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
  
  // Load patients
  await loadPatients();
  
  console.log('✅ Patient page loaded successfully');
});

// ==========================================
// EXPORT FUNCTIONS FOR HTML
// ==========================================
window.viewPatient = viewPatient;
window.deletePatient = deletePatient;
window.addPatient = addPatient;
window.searchPatient = searchPatient;
window.exportPatientsToCSV = exportPatientsToCSV;