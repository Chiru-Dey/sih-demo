// Profile Component JavaScript

document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
});

function getProfile() {
    const profileJSON = localStorage.getItem('user-profile');
    return profileJSON ? JSON.parse(profileJSON) : {};
}

function saveProfileData(profile) {
    localStorage.setItem('user-profile', JSON.stringify(profile));
}

function loadProfile() {
    const profile = getProfile();
    document.getElementById('profile-name').value = profile.name || '';
    document.getElementById('profile-email').value = profile.email || '';
    document.getElementById('profile-phone').value = profile.phone || '';
    document.getElementById('profile-address').value = profile.address || '';
}

function saveProfile() {
    const name = document.getElementById('profile-name').value.trim();
    const email = document.getElementById('profile-email').value.trim();
    const phone = document.getElementById('profile-phone').value.trim();
    const address = document.getElementById('profile-address').value.trim();

    if (!name || !email || !phone || !address) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    const profile = { name, email, phone, address };
    saveProfileData(profile);

    showNotification('Profile saved successfully', 'success');
}