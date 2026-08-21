const API_BASE = window.location.origin;
let projects = [];
let isAdmin = false;
let authToken = localStorage.getItem('shrieve_token');

// --- SESSION MANAGEMENT ---
async function checkSession() {
    const loginBtn = document.getElementById('loginBtn');
    const addProjectBtn = document.getElementById('addProjectBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (loginBtn) loginBtn.style.display = 'none';
    if (addProjectBtn) addProjectBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'none';

    if (!authToken) {
        isAdmin = false;
        if (loginBtn) loginBtn.style.display = 'inline-block';
        return false;
    }

    try {
        const response = await fetch(`${API_BASE}/api/verify`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            const data = await response.json();
            isAdmin = data.authenticated;
            if (addProjectBtn) addProjectBtn.style.display = 'inline-block';
            if (logoutBtn) logoutBtn.style.display = 'inline-block';
            return true;
        } else {
            localStorage.removeItem('shrieve_token');
            authToken = null;
            isAdmin = false;
            if (loginBtn) loginBtn.style.display = 'inline-block';
            return false;
        }
    } catch (error) {
        isAdmin = false;
        if (loginBtn) loginBtn.style.display = 'inline-block';
        return false;
    }
}

function logout() {
    localStorage.removeItem('shrieve_token');
    authToken = null;
    isAdmin = false;
    window.location.reload();
}

// --- LOGIN MODAL ---
function openLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('passphrase').focus();
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.getElementById('passphrase').value = '';
    document.getElementById('loginErrorMsg').style.display = 'none';
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const passphrase = document.getElementById('passphrase').value;
    const errorMsg = document.getElementById('loginErrorMsg');

    try {
        const response = await fetch(`${API_BASE}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passphrase })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('shrieve_token', data.token);
            authToken = data.token;
            closeLoginModal();
            window.location.reload();
        } else {
            errorMsg.style.display = 'block';
            errorMsg.textContent = "ACCESS DENIED: " + (data.error || "Invalid Credentials");
            const card = document.querySelector('.login-card');
            card.style.animation = 'shake 0.5s';
            setTimeout(() => { card.style.animation = ''; }, 500);
        }
    } catch (error) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "SYSTEM ERROR: Connection failed";
    }
});

// --- ADMIN MODAL ---
function openAdminModal() {
    document.getElementById('adminModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
    document.getElementById('projectName').value = '';
    document.getElementById('projectDesc').value = '';
    document.getElementById('projectStatus').value = 'active';
}

// --- PROJECT MANAGEMENT ---
async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE}/api/projects`);
        const data = await response.json();
        projects = data.projects || [];
        renderProjects();
        updateStats();
    } catch (error) {
        console.error('Failed to load projects:', error);
        const grid = document.getElementById('projectGrid');
        grid.innerHTML = '<p style="color: var(--accent); text-align: center;">ERROR: Could not connect to SHRIEVE-OS backend.</p>';
    }
}

async function addProject() {
    const name = document.getElementById('projectName').value.trim();
    const desc = document.getElementById('projectDesc').value.trim();
    const status = document.getElementById('projectStatus').value;

    if (!name || !desc) {
        alert('ERROR: Project name and description are required.');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/projects`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ name, description: desc, status })
        });

        if (response.ok) {
            const data = await response.json();
            projects.push(data.project);
            renderProjects();
            updateStats();
            closeAdminModal();
            document.getElementById('projects').scrollIntoView({ behavior: 'smooth' });
        } else {
            alert('ERROR: Failed to add project.');
        }
    } catch (error) {
        alert('ERROR: Could not connect to server.');
    }
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
        const response = await fetch(`${API_BASE}/api/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.ok) {
            projects = projects.filter(p => p.id !== id);
            renderProjects();
            updateStats();
        } else {
            alert('ERROR: Failed to delete project.');
        }
    } catch (error) {
        alert('ERROR: Could not connect to server.');
    }
}

function renderProjects() {
    const grid = document.getElementById('projectGrid');
    grid.innerHTML = '';

    if (projects.length === 0) {
        grid.innerHTML = '<p style="color: var(--text-muted); text-align: center;">No projects deployed. Admin can add projects using the + ADD PROJECT button.</p>';
        return;
    }

    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <span class="status ${project.status}">${getStatusLabel(project.status)}</span>
            <h3>${project.name}</h3>
            <p>${project.description}</p>
            ${isAdmin ? `<button class="delete-btn" onclick="deleteProject(${project.id})">DELETE</button>` : ''}
        `;
        grid.appendChild(card);
    });
}

function getStatusLabel(status) {
    switch(status) {
        case 'active': return 'Active Development';
        case 'completed': return 'Mission Complete';
        case 'future': return 'Classified / Future';
        default: return status;
    }
}

// --- STATISTICS ---
function updateStats() {
    animateCounter('projectCount', projects.length);
    animateCounter('activeCount', projects.filter(p => p.status === 'active').length);
    animateCounter('completedCount', projects.filter(p => p.status === 'completed').length);
    animateCounter('futureCount', projects.filter(p => p.status === 'future').length);
}

function animateCounter(elementId, target, duration = 1500) {
    const element = document.getElementById(elementId);
    const start = parseInt(element.textContent) || 0;
    if (start === target) return;
    const increment = (target - start) / (duration / 16);
    let current = start;
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            element.textContent = target;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
}

// --- CONTACT FORM ---
document.getElementById('contactForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const name = document.getElementById('contactName').value;
    const email = document.getElementById('contactEmail').value;
    const subject = document.getElementById('contactSubject').value;
    const message = document.getElementById('contactMessage').value;

    try {
        const response = await fetch(`${API_BASE}/api/contact`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, subject, message })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('contactSuccess').style.display = 'block';
            document.getElementById('contactForm').reset();
            setTimeout(() => {
                document.getElementById('contactSuccess').style.display = 'none';
            }, 5000);
        } else {
            alert('ERROR: Failed to send message.');
        }
    } catch (error) {
        // Fallback: store locally if server unavailable
        const transmissions = JSON.parse(localStorage.getItem('shrieve_transmissions') || '[]');
        transmissions.push({ id: Date.now(), name, email, subject, message, timestamp: new Date().toISOString() });
        localStorage.setItem('shrieve_transmissions', JSON.stringify(transmissions));
        document.getElementById('contactSuccess').style.display = 'block';
        document.getElementById('contactForm').reset();
        setTimeout(() => {
            document.getElementById('contactSuccess').style.display = 'none';
        }, 5000);
    }
});

// --- INITIALIZATION ---
window.addEventListener('load', async () => {
    await checkSession();
    await loadProjects();

    console.log('%c SHRIEVE INDUSTRIES SYSTEM ONLINE ', 'background: #00f0ff; color: #000; font-weight: bold; padding: 5px;');
    console.log('%c Powered by SHRIEVE-OS v1.0 ', 'color: #7000ff; font-weight: bold;');
});

// Close modals when clicking outside
window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
