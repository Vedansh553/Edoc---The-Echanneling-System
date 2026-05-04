// API URL
const API_URL = 'http://localhost:5000/api';

// Login Form Handler
document.getElementById("loginForm").addEventListener("submit", async function(e) {
  e.preventDefault();
  
  console.log('Login attempt started...');
  
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  
  console.log('Email:', email);
  
  // Show loading
  const submitBtn = document.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Logging in...';
  submitBtn.disabled = true;
  
  try {
    console.log('Calling API:', `${API_URL}/auth/login`);
    
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password
      })
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', data);
    
    if (response.ok) {
      // Save token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      alert('✅ Login Successful! Welcome ' + data.user.name);
      window.location.href = 'dashboard.html';
    } else {
      alert('❌ Login Failed: ' + data.message);
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
    
  } catch (error) {
    console.error('Login error:', error);
    alert('❌ Cannot connect to server!\n\nMake sure:\n1. Backend is running at http://localhost:5000\n2. Check terminal for errors');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
});

// Auto-redirect if already logged in
document.addEventListener('DOMContentLoaded', function() {
  const token = localStorage.getItem('token');
  if (token) {
    window.location.href = 'dashboard.html';
  }
});