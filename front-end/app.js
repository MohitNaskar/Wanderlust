// 1. CONFIGURE FIREBASE
// Replace this with your own Firebase project configuration
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDliD1U3XUe6SDMDKX7cpEa_jqED8ytyKg",
  authDomain: "ai-trip-planner-144b9.firebaseapp.com",
  projectId: "ai-trip-planner-144b9",
  storageBucket: "ai-trip-planner-144b9.firebasestorage.app",
  messagingSenderId: "6203917378",
  appId: "1:6203917378:web:dc844f356d7779848199db",
  measurementId: "G-J1Y239JGES"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// 3. GET DOM ELEMENTS
const loginContainer = document.getElementById('login-container');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const userEmailSpan = document.getElementById('user-email');
const deckUploader = document.getElementById('deck-uploader');
const uploadBtn = document.getElementById('upload-btn');
const statusText = document.getElementById('status-text');
const resultsContainer = document.getElementById('results-container');

// 4. AUTHENTICATION LOGIC
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        loginContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userEmailSpan.textContent = user.email;
    } else {
        // User is signed out
        loginContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

signupBtn.addEventListener('click', () => {
    auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(error => alert(error.message));
});

loginBtn.addEventListener('click', () => {
    auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
        .catch(error => alert(error.message));
});

logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// 5. FILE UPLOAD & ANALYSIS LOGIC
uploadBtn.addEventListener('click', () => {
    const file = deckUploader.files[0];
    const user = auth.currentUser;

    if (!file) {
        alert("Please select a file first.");
        return;
    }
    if (!user) {
        alert("You must be logged in to upload a file.");
        return;
    }

    // Reset previous results
    resultsContainer.classList.add('hidden');

    // Create a storage reference
    const storageRef = storage.ref(`uploads/${user.uid}/${file.name}`);
    const uploadTask = storageRef.put(file);

    // Listen for state changes, errors, and completion of the upload.
    uploadTask.on('state_changed', 
        (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            statusText.textContent = `Uploading: ${Math.round(progress)}%`;
        }, 
        (error) => {
            console.error("Upload failed:", error);
            statusText.textContent = `Upload failed: ${error.message}`;
        }, 
        () => {
            // Upload completed successfully, now listen for analysis results
            statusText.textContent = "Upload complete! AI is now analyzing the deck... 🧠";
            listenForResults(file.name);
        }
    );
});

// 6. REAL-TIME RESULTS LISTENER
function listenForResults(docId) {
    db.collection('evaluations').doc(docId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.status === 'completed') {
                statusText.textContent = "Analysis Complete!";
                displayResults(data);
            } else if (data.status === 'error') {
                statusText.textContent = `An error occurred: ${data.error_message}`;
            }
        } else {
            console.log("No such document! Waiting for backend to create it...");
        }
    });
}

// 7. DISPLAY RESULTS FUNCTION
function displayResults(data) {
    const info = data.startup_info;
    const swot = data.swot_analysis;

    document.getElementById('result-startup-name').textContent = `Analysis for: ${info.startup_name}`;

    // Fill Key Information
    document.getElementById('info-problem').textContent = info.problem;
    document.getElementById('info-solution').textContent = info.solution;
    document.getElementById('info-model').textContent = info.business_model;
    document.getElementById('info-tam').textContent = info.market_size_tam;
    document.getElementById('info-team').textContent = info.team_summary;
    document.getElementById('info-traction').textContent = info.traction;
    document.getElementById('info-competition').textContent = info.competition;

    // Fill Red Flags
    const redFlagsUl = document.getElementById('info-red-flags');
    redFlagsUl.innerHTML = ''; // Clear previous list
    info.red_flags.forEach(flag => {
        const li = document.createElement('li');
        li.textContent = flag;
        redFlagsUl.appendChild(li);
    });

    // Fill SWOT Analysis
    const fillList = (elementId, items) => {
        const ul = document.getElementById(elementId);
        ul.innerHTML = '';
        items.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            ul.appendChild(li);
        });
    };

    fillList('swot-strengths', swot.strengths);
    fillList('swot-weaknesses', swot.weaknesses);
    fillList('swot-opportunities', swot.opportunities);
    fillList('swot-threats', swot.threats);

    resultsContainer.classList.remove('hidden');
}