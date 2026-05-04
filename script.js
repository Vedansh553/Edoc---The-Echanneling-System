// eDoc Landing Page Script
// Fixed: Button uses correct querySelector instead of wrong id

document.addEventListener('DOMContentLoaded', function () {
  // Make Appointment button — matches index.html's <button> inside <a>
  const appointmentBtn = document.querySelector('.hero-content button');
  if (appointmentBtn) {
    appointmentBtn.addEventListener('click', function () {
      window.location.href = 'login.html';
    });
  }

  // Dynamic year in footer
  const footer = document.querySelector('footer p');
  if (footer) {
    const year = new Date().getFullYear();
    footer.textContent = `© ${year} eDoc - The Echanneling Project. A Web Solution.`;
  }
});