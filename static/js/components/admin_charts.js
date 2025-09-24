// Initialize charts when document is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Charts: Initializing...');
    initializeUserActivityChart();
    initializeAlertDistributionChart();
    initializeResourceAllocationChart();
});

// Generate fake dates for the last 7 days
function getLast7Days() {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }
    return dates;
}

// User Activity Chart
function initializeUserActivityChart() {
    const ctx = document.getElementById('userActivityChart');
    if (!ctx) return;

    const dates = getLast7Days();
    const newUsers = [45, 62, 38, 75, 53, 89, 70];
    const totalUsers = [250, 312, 350, 425, 478, 567, 637];

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'New Registrations',
                    data: newUsers,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: true
                },
                {
                    label: 'Total Users',
                    data: totalUsers,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    tension: 0.4,
                    fill: true
                }
            ]
        },
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
                        text: 'Number of Users'
                    }
                }
            }
        }
    });
}

// Alert Distribution Chart
function initializeAlertDistributionChart() {
    const ctx = document.getElementById('alertDistributionChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Natural Disasters', 'Medical Emergencies', 'Infrastructure Issues', 'Fire Hazards', 'Other'],
            datasets: [{
                data: [35, 25, 20, 15, 5],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
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
                            return `${label}: ${value}%`;
                        }
                    }
                }
            }
        }
    });
}

// Resource Allocation Chart
function initializeResourceAllocationChart() {
    const ctx = document.getElementById('resourceAllocationChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Personnel', 'Vehicles', 'Equipment', 'Supplies', 'Medical'],
            datasets: [{
                label: 'Resource Distribution',
                data: [120, 45, 75, 60, 35],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Units: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Units'
                    }
                }
            }
        }
    });
}

// Export chart creation functions for reuse
const AdminCharts = {
    /**
     * Creates a bar chart
     * @param {string} elementId - The ID of the canvas element
     * @param {object} data - The chart data
     * @param {object} options - Chart options (optional)
     */
    createBarChart: function(elementId, data, options = {}) {
        const ctx = document.getElementById(elementId);
        if (!ctx) {
            console.error(`Admin Charts: Canvas element with ID "${elementId}" not found`);
            return;
        }

        return new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                ...options
            }
        });
    },

    /**
     * Creates a line chart
     * @param {string} elementId - The ID of the canvas element
     * @param {object} data - The chart data
     * @param {object} options - Chart options (optional)
     */
    createLineChart: function(elementId, data, options = {}) {
        const ctx = document.getElementById(elementId);
        if (!ctx) {
            console.error(`Admin Charts: Canvas element with ID "${elementId}" not found`);
            return;
        }

        return new Chart(ctx, {
            type: 'line',
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                ...options
            }
        });
    }
};