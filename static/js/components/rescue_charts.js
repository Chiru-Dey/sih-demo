// Initialize charts when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Rescue Charts: Initializing...');
    initializeOperationsStatusChart();
    initializeResourceAvailabilityChart();
    initializeResponseTimeTrendsChart();
});

// Active Operations Status Chart (Doughnut)
function initializeOperationsStatusChart() {
    const ctx = document.getElementById('operationsStatusChart');
    if (!ctx) return;

    const data = {
        labels: ['In Progress', 'Pending', 'Completed', 'Critical'],
        datasets: [{
            data: [35, 25, 30, 10],
            backgroundColor: [
                'rgba(54, 162, 235, 0.8)',  // Blue - In Progress
                'rgba(255, 206, 86, 0.8)',  // Yellow - Pending
                'rgba(75, 192, 192, 0.8)',  // Green - Completed
                'rgba(255, 99, 132, 0.8)'   // Red - Critical
            ],
            borderColor: [
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(255, 99, 132, 1)'
            ],
            borderWidth: 1
        }]
    };

    new Chart(ctx, {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.5,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((acc, curr) => acc + curr, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Resource Availability Chart (Horizontal Bar)
function initializeResourceAvailabilityChart() {
    const ctx = document.getElementById('resourceAvailabilityChart');
    if (!ctx) return;

    const data = {
        labels: ['Rescue Teams', 'Medical Units', 'Vehicles', 'Equipment'],
        datasets: [
            {
                label: 'Available',
                data: [15, 12, 20, 30],
                backgroundColor: 'rgba(75, 192, 192, 0.8)',  // Green
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            },
            {
                label: 'Deployed',
                data: [10, 8, 15, 25],
                backgroundColor: 'rgba(255, 99, 132, 0.8)',  // Red
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }
        ]
    };

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',  // Horizontal bars
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.75,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Units'
                    }
                },
                y: {
                    stacked: true
                }
            }
        }
    });
}

// Response Time Trends Chart (Line)
function initializeResponseTimeTrendsChart() {
    const ctx = document.getElementById('responseTimeTrendsChart');
    if (!ctx) return;

    // Generate dates for last 7 days
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    const data = {
        labels: dates,
        datasets: [
            {
                label: 'Peak Hours',
                data: [25, 28, 22, 30, 24, 27, 23],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Off-Peak Hours',
                data: [15, 18, 14, 20, 16, 19, 17],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.1)',
                tension: 0.4,
                fill: true
            }
        ]
    };

    new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Response Time (minutes)'
                    }
                }
            }
        }
    });
}