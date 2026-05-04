// ==========================================
// DASHBOARD.JS - FIXED VERSION
// Complete Dashboard with Dynamic Data Loading
// ==========================================

const API_URL = 'http://localhost:5000/api';

// ==========================================
// AUTHENTICATION CHECK
// ==========================================
function checkAuth() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    alert('⚠️ Please login first!');
    window.location.href = 'login.html';
    return false;
  }
  
  // Update user info in sidebar
  if (user.name) {
    const profileName = document.querySelector('.profile h3');
    const profileEmail = document.querySelector('.profile p');
    
    if (profileName) profileName.textContent = user.name;
    if (profileEmail) profileEmail.textContent = user.email;
  }
  
  return true;
}

// ==========================================
// LOGOUT FUNCTIONALITY
// ==========================================
function setupLogout() {
  const logoutBtn = document.querySelector('.logout');
  
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function() {
      // Clear stored data
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      alert('✅ Logged out successfully!');
      window.location.href = 'login.html';
    });
  }
}

// ==========================================
// LOAD DASHBOARD STATISTICS
// ==========================================
async function loadDashboardStats() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/dashboard/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const stats = await response.json();
      
      // Update stat cards
      const cards = document.querySelectorAll('.status-cards .card');
      
      if (cards[0]) {
        cards[0].querySelector('h2').textContent = stats.total_doctors || 0;
      }
      if (cards[1]) {
        cards[1].querySelector('h2').textContent = stats.total_patients || 0;
      }
      if (cards[2]) {
        cards[2].querySelector('h2').textContent = stats.new_bookings || 0;
      }
      if (cards[3]) {
        cards[3].querySelector('h2').textContent = stats.today_sessions || 0;
      }
      
    } else {
      console.error('Failed to load stats');
    }
    
  } catch (error) {
    console.error('Error loading stats:', error);
  }
}

// ==========================================
// LOAD UPCOMING APPOINTMENTS
// ==========================================
async function loadUpcomingAppointments() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/appointments`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const appointments = await response.json();
      
      // Filter appointments for next 7 days
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 60);
      
      const upcomingAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.scheduled_datetime);
        return aptDate >= today && aptDate <= nextWeek;
      });
      
      // Update table
      const tbody = document.querySelector('.upcoming .section table tbody');
      
      if (tbody) {
        tbody.innerHTML = '';
        
        if (upcomingAppointments.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center">No upcoming appointments</td></tr>';
        } else {
          upcomingAppointments.slice(0, 5).forEach(apt => { // Show max 5
            const row = `
              <tr>
                <td>${apt.id}</td>
                <td>${apt.patient_name}</td>
                <td>${apt.doctor_name}</td>
                <td>${apt.session_title}</td>
              </tr>
            `;
            tbody.innerHTML += row;
          });
        }
      }
      
    } else {
      console.error('Failed to load appointments');
    }
    
  } catch (error) {
    console.error('Error loading appointments:', error);
  }
}

// ==========================================
// LOAD UPCOMING SESSIONS
// ==========================================
async function loadUpcomingSessions() {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const sessions = await response.json();
      
      // Filter sessions for next 7 days
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 60);
      
      const upcomingSessions = sessions.filter(session => {
        const sessionDate = new Date(session.scheduled_datetime);
        return sessionDate >= today && sessionDate <= nextWeek;
      });
      
      // Update table
      const tbody = document.querySelectorAll('.upcoming .section table tbody')[1];
      
      if (tbody) {
        tbody.innerHTML = '';
        
        if (upcomingSessions.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align:center">No upcoming sessions</td></tr>';
        } else {
          upcomingSessions.slice(0, 5).forEach(session => { // Show max 5
            const row = `
              <tr>
                <td>${session.title}</td>
                <td>${session.doctor_name}</td>
                <td>${formatDateTime(session.scheduled_datetime)}</td>
              </tr>
            `;
            tbody.innerHTML += row;
          });
        }
      }
      
    } else {
      console.error('Failed to load sessions');
    }
    
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// ==========================================
// SEARCH FUNCTIONALITY
// ==========================================
function setupSearch() {
  const searchBtn = document.querySelector('.topbar button');
  const searchInput = document.querySelector('.topbar input');
  
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', async function() {
      const query = searchInput.value.trim();
      
      if (!query) {
        alert('⚠️ Please enter a doctor name or email to search');
        return;
      }
      
      // Search doctors
      const token = localStorage.getItem('token');
      
      try {
        const response = await fetch(`${API_URL}/doctors`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const doctors = await response.json();
          
          // Filter doctors by name or email
          const results = doctors.filter(doc => 
            doc.name.toLowerCase().includes(query.toLowerCase()) ||
            doc.email.toLowerCase().includes(query.toLowerCase())
          );
          
          if (results.length > 0) {
            alert(`✅ Found ${results.length} doctor(s):\n\n${results.map(d => d.name).join('\n')}`);
            
            // Redirect to doctors page with search
            localStorage.setItem('searchQuery', query);
            window.location.href = 'doctors.html';
          } else {
            alert('❌ No doctors found matching your search');
          }
        }
        
      } catch (error) {
        console.error('Search error:', error);
        alert('❌ Error performing search');
      }
    });
    
    // Enter key support
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        searchBtn.click();
      }
    });
  }
}

// ==========================================
// BUTTON CLICK HANDLERS
// ==========================================
function setupButtons() {
  // Show all appointments button
  const showAppointmentsBtn = document.querySelector('.upcoming .section:first-child button');
  if (showAppointmentsBtn) {
    showAppointmentsBtn.addEventListener('click', function() {
      window.location.href = 'appointment.html';
    });
  }
  
  // Show all sessions button
  const showSessionsBtn = document.querySelector('.upcoming .section:last-child button');
  if (showSessionsBtn) {
    showSessionsBtn.addEventListener('click', function() {
      window.location.href = 'schedule.html';
    });
  }
}

// ==========================================
// UPDATE DATE DISPLAY
// ==========================================
function updateDate() {
  const dateElement = document.querySelector('.topbar .date strong');
  
  if (dateElement) {
    const today = new Date();
    const formatted = today.toISOString().split('T')[0]; // YYYY-MM-DD
    dateElement.textContent = formatted;
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

/**
 * Show loading indicator
 */
function showLoading() {
  // Optional: Add loading spinner
  console.log('Loading...');
}

/**
 * Hide loading indicator
 */
function hideLoading() {
  console.log('Loading complete');
}

// ==========================================
// INITIALIZE DASHBOARD
// ==========================================
document.addEventListener('DOMContentLoaded', async function() {
  // Check authentication first
  if (!checkAuth()) {
    return;
  }
  
  // Setup logout button
  setupLogout();
  
  // Update date
  updateDate();
  
  // Setup search
  setupSearch();
  
  // Setup buttons
  setupButtons();
  
  // Load all data
  showLoading();
  
  try {
    await Promise.all([
      loadDashboardStats(),
      loadUpcomingAppointments(),
      loadUpcomingSessions()
    ]);
  } catch (error) {
    console.error('Error loading dashboard:', error);
  }
  
  hideLoading();
  
  console.log('✅ Dashboard loaded successfully');
});

// ==========================================
// AUTO-REFRESH DATA (Optional)
// ==========================================
// Uncomment to enable auto-refresh every 5 minutes
/*
setInterval(async function() {
  await loadDashboardStats();
  await loadUpcomingAppointments();
  await loadUpcomingSessions();
}, 5 * 60 * 1000); // 5 minutes
*/