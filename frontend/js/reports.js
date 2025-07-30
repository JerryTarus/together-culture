// Interactive Reports & Analytics for Together Culture CRM
// Uses Chart.js for modern, animated charts

document.addEventListener('DOMContentLoaded', async () => {
  // --- Sidebar and Header Navigation Setup ---
  let currentUser = null;
  // Fetch current user info
  try {
    const res = await fetch(CONFIG.apiUrl('api/users/me'), { credentials: 'include' });
    if (!res.ok) throw new Error('Not authenticated');
    const data = await res.json();
    currentUser = data.user;
  } catch (err) {
    window.location.href = '/login.html';
    return;
  }
  // Render sidebar navigation
  const sidebarNav = document.getElementById('sidebar-nav');
  if (sidebarNav && currentUser) {
    const commonLinks = `
      <a href="./events.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Events</a>
      <a href="./resources.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Resources</a>
      <a href="./messages.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Messages</a>
      <a href="./settings.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Settings</a>
      <a href="./reports.html" class="flex items-center p-3 my-1 bg-brand-beige text-brand-primary rounded-lg font-semibold">Reports</a>
    `;
    if (currentUser.role === 'admin') {
      sidebarNav.innerHTML = `
        <a href="./admin_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
        <a href="./member_directory.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Members</a>
        ${commonLinks}
      `;
    } else {
      sidebarNav.innerHTML = `
        <a href="./member_dashboard.html" class="flex items-center p-3 my-1 text-gray-600 hover:bg-gray-200 rounded-lg">Dashboard</a>
        ${commonLinks}
      `;
    }
  }
  // Update dashboard link in header if present
  const dashboardLink = document.querySelector('a[href="/member_dashboard.html"]');
  if (dashboardLink && currentUser && currentUser.role === 'admin') {
    dashboardLink.href = '/admin_dashboard.html';
  }
  // Logout button logic
  const logoutBtn = document.getElementById('logout-button');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch(CONFIG.apiUrl('api/auth/logout'), { method: 'POST', credentials: 'include' });
      } catch (e) {}
      window.location.href = '/login.html';
    });
  }

  // Example data for charts (replace with real API data as needed)
  const memberGrowthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    datasets: [{
      label: 'Members',
      data: [120, 135, 150, 180, 210, 260, 320],
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.3
    }]
  };

  const eventAttendanceData = {
    labels: ['Q1', 'Q2', 'Q3', 'Q4'],
    datasets: [{
      label: 'Attendance',
      data: [70, 110, 85, 130],
      backgroundColor: [
        '#22c55e',
        '#16a34a',
        '#f59e42',
        '#3b82f6'
      ],
      borderWidth: 1
    }]
  };

  // Member Growth Line Chart
  const ctx1 = document.getElementById('report-chart-1');
  if (ctx1) {
    new Chart(ctx1, {
      type: 'line',
      data: memberGrowthData,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Member Growth Over Time', font: { size: 16 } }
        }
      }
    });
  }

  // Event Attendance Bar Chart
  const ctx2 = document.getElementById('report-chart-2');
  if (ctx2) {
    new Chart(ctx2, {
      type: 'bar',
      data: eventAttendanceData,
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Event Attendance by Quarter', font: { size: 16 } }
        },
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }

  // Export Reports Button
  const exportBtn = document.querySelector('button.bg-brand-primary');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      window.print(); // Simple export: print to PDF
    });
  }
});
