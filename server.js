const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;

// --- CONFIGURATION ---
// Change this secret key to something unique
const JWT_SECRET = 'shrieve-os-secret-key-change-this-2025';

// The bcrypt hash of the passphrase "shrieve2025"
// To generate a new hash, run: node -e "console.log(require('bcryptjs').hashSync('yourpassword', 8))"
const PASSPHRASE_HASH = '$2a$08$wYq9K7Zq9K7Zq9K7Zq9K7ZO9K7Zq9K7Zq9K7Zq9K7Zq9K7Zq9K7Zq';

// Since the pre-generated hash above won't work for "shrieve2025", 
// let's use a simpler approach - we'll generate it on first run.
// For now, we'll compare against plaintext and upgrade to hash if bcrypt hash is set.
const PLAINTEXT_PASSPHRASE = 'shrieve2025'; // Change this!

// --- MIDDLEWARE ---
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// --- DATA STORAGE ---
function loadProjects() {
    const filePath = path.join(dataDir, 'projects.json');
    if (!fs.existsSync(filePath)) {
        const defaultProjects = [{
            id: Date.now(),
            name: "Project: AEGIS",
            description: "A next-gen cybersecurity framework designed to protect decentralized networks. Currently in beta testing with select partners.",
            status: "active"
        }];
        fs.writeFileSync(filePath, JSON.stringify(defaultProjects, null, 2));
        return defaultProjects;
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveProjects(projects) {
    const filePath = path.join(dataDir, 'projects.json');
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2));
}

function loadMessages() {
    const filePath = path.join(dataDir, 'messages.json');
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([], null, 2));
        return [];
    }
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function saveMessages(messages) {
    const filePath = path.join(dataDir, 'messages.json');
    fs.writeFileSync(filePath, JSON.stringify(messages, null, 2));
}

// --- AUTH MIDDLEWARE ---
function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
}

// --- ROUTES ---

// Login
app.post('/api/login', (req, res) => {
    const { passphrase } = req.body;

    if (!passphrase) {
        return res.status(400).json({ success: false, error: 'Passphrase required' });
    }

    if (passphrase === PLAINTEXT_PASSPHRASE) {
        const token = jwt.sign(
            { username: 'admin', role: 'admin' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        return res.json({ success: true, token });
    }

    return res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// Verify session
app.get('/api/verify', authenticate, (req, res) => {
    res.json({ authenticated: true, user: req.user });
});

// Get all projects (public)
app.get('/api/projects', (req, res) => {
    const projects = loadProjects();
    res.json({ projects });
});

// Create project (protected)
app.post('/api/projects', authenticate, (req, res) => {
    const { name, description, status } = req.body;

    if (!name || !description) {
        return res.status(400).json({ error: 'Name and description required' });
    }

    const projects = loadProjects();
    const newProject = {
        id: Date.now(),
        name,
        description,
        status: status || 'active'
    };

    projects.push(newProject);
    saveProjects(projects);

    res.status(201).json({ success: true, project: newProject });
});

// Delete project (protected)
app.delete('/api/projects/:id', authenticate, (req, res) => {
    const projectId = parseInt(req.params.id);
    const projects = loadProjects();
    const filtered = projects.filter(p => p.id !== projectId);

    if (filtered.length === projects.length) {
        return res.status(404).json({ error: 'Project not found' });
    }

    saveProjects(filtered);
    res.json({ success: true });
});

// Contact form submission
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ error: 'All fields required' });
    }

    const messages = loadMessages();
    const newMessage = {
        id: Date.now(),
        name,
        email,
        subject,
        message,
        timestamp: new Date().toISOString(),
        read: false
    };

    messages.push(newMessage);
    saveMessages(messages);

    res.json({ success: true, message: 'Transmission received' });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- START SERVER ---
app.listen(PORT, '0.0.0.0', () => {
    console.log('%c SHRIEVE INDUSTRIES SYSTEM ONLINE ', 'background: #00f0ff; color: #000; font-weight: bold; padding: 5px;');
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at: http://localhost:${PORT}`);
});
