// Interactive Reports & Analytics for Together Culture CRM
// Uses Chart.js for modern, animated charts

document.addEventListener('DOMContentLoaded', () => {
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
