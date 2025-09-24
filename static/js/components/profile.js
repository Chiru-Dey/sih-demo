// Profile Component JavaScript

document.addEventListener('DOMContentLoaded', function () {
    loadProfile();
    loadContacts();
});

// Profile Functions
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

// Contacts Functions
function getContacts() {
    const contactsJSON = localStorage.getItem('emergency-contacts');
    return contactsJSON ? JSON.parse(contactsJSON) : [];
}

function saveContacts(contacts) {
    localStorage.setItem('emergency-contacts', JSON.stringify(contacts));
}

function loadContacts() {
    const contacts = getContacts();
    const contactsContainer = document.getElementById('contacts');
    contactsContainer.innerHTML = '';

    if (contacts.length === 0) {
        contactsContainer.innerHTML = '<p>No contacts added yet.</p>';
        return;
    }

    contacts.forEach((contact, index) => {
        const contactEl = document.createElement('div');
        contactEl.className = 'contact-item';
        contactEl.innerHTML = `
            <div class="contact-info">
                <h4>${contact.name}</h4>
                <p><i class="fas fa-phone"></i> ${contact.phone}</p>
                <p><i class="fas fa-user-tag"></i> ${contact.relation}</p>
            </div>
            <div class="contact-actions">
                <button type="button" class="btn-secondary" onclick="editContact(${index})"><i class="fas fa-edit"></i></button>
                <button type="button" class="btn-danger" onclick="deleteContact(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        contactsContainer.appendChild(contactEl);
    });
}

function addContact() {
    const nameInput = document.getElementById('contact-name');
    const phoneInput = document.getElementById('contact-phone');
    const relationInput = document.getElementById('contact-relation');

    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();
    const relation = relationInput.value.trim();

    if (!name || !phone || !relation) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    const contacts = getContacts();
    contacts.push({ name, phone, relation });
    saveContacts(contacts);

    nameInput.value = '';
    phoneInput.value = '';
    relationInput.value = '';

    loadContacts();
    showNotification('Contact added successfully', 'success');
}

function editContact(index) {
    const contacts = getContacts();
    const contact = contacts[index];

    const newName = prompt('Enter new name:', contact.name);
    const newPhone = prompt('Enter new phone number:', contact.phone);
    const newRelation = prompt('Enter new relation:', contact.relation);

    if (newName && newPhone && newRelation) {
        contacts[index] = { name: newName, phone: newPhone, relation: newRelation };
        saveContacts(contacts);
        loadContacts();
        showNotification('Contact updated successfully', 'success');
    }
}

function deleteContact(index) {
    if (confirm('Are you sure you want to delete this contact?')) {
        const contacts = getContacts();
        contacts.splice(index, 1);
        saveContacts(contacts);
        loadContacts();
        showNotification('Contact deleted successfully', 'success');
    }
}