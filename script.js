// ===== SHORTCUTS =====
const qs = s => document.querySelector(s);
const qsa = s => document.querySelectorAll(s);

// ===== FIREBASE INIT =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getFirestore, collection, getDocs, addDoc, setDoc, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// 🔹 Remplace ces valeurs par celles de ton projet Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAH_j9YWxaIelxp_zlU9F3WigzhGa_MIgA",
  authDomain: "cas-projets-web.firebaseapp.com",
  projectId: "cas-projets-web",
  storageBucket: "cas-projets-web.firebasestorage.app",
  messagingSenderId: "273373409121",
  appId: "1:273373409121:web:70cbb6054f379e062d9f20",
  measurementId: "G-5W5B3R71WP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const colRef = collection(db, "projects");

// ===== IDENTITÉ LOCALE =====
let localUserId = localStorage.getItem("cas_user_id");
if (!localUserId) {
  localUserId = "u_" + Math.random().toString(36).slice(2, 11);
  localStorage.setItem("cas_user_id", localUserId);
}

// ===== ÉTAT GLOBAL =====
const state = { 
  view: 'home',
  filter: null,
  projects: []
};

// ===== UTILITAIRES =====
function escapeHtml(s) {
  return (s + '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
function nl2br(s) { return s.replaceAll('\n', '<br/>'); }
function short(s, n) { return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ===== CHARGER PROJETS =====
async function loadProjects() {
  state.projects = [];
  const snap = await getDocs(colRef);
  snap.forEach(docSnap => state.projects.push({ ...docSnap.data(), _id: docSnap.id }));
  if (state.view === "category") renderProjects(state.filter);
}

// ===== GESTION DES VUES =====
function show(view, opt) {
  state.view = view;
  ['home', 'category', 'add'].forEach(v => qs('#' + v).style.display = v === view ? 'block' : 'none');

  if (view === 'category') renderProjects(opt?.cat);
}

// ===== RENDER LISTE PROJETS =====
function renderProjects(cat) {
  const container = qs('#projects-list');
  container.innerHTML = '';

  const list = state.projects.filter(p => !cat || p.cat === cat);

  qs('#cat-title').textContent = cat ? (cat === 'Creativity' ? 'Créativité' : cat === 'Activity' ? 'Activité' : 'Service') : 'Tous';
  qs('#cat-sub').textContent = list.length + ' projet(s) trouvé(s)';

  list.forEach(p => {
    const el = document.createElement('div');
    el.className = 'project-card';
    el.innerHTML = `
      <h3>${escapeHtml(p.title)}</h3>
      <div class="meta">${escapeHtml(p.cat)} • ${escapeHtml(p.duration || '—')} • Par ${escapeHtml(p.owner || '—')}</div>
      <p style="color:var(--muted)">${short(p.desc, 140)}</p>
      <div style="display:flex;justify-content:flex-end;margin-top:8px">
          <button class="btn" data-id="${p._id}">Voir</button>
      </div>
    `;
    container.appendChild(el);

    el.querySelector('button').addEventListener('click', () => openDetail(p._id));
  });
}

// ===== MODAL DETAIL =====
function openDetail(id) {
  const p = state.projects.find(x => x._id === id);
  if (!p) return;

  let html = `
    <h2>${escapeHtml(p.title)}</h2>
    <div class="meta">${escapeHtml(p.cat)} • ${escapeHtml(p.duration || '—')} • Par ${escapeHtml(p.owner || 'Anonyme')}</div>
    <hr style="border:none;border-top:1px solid rgba(255,255,255,0.05)"/>
    <p>${nl2br(escapeHtml(p.desc))}</p>
    ${p.tips ? '<h4>Conseils / Retours</h4><p>' + nl2br(escapeHtml(p.tips)) + '</p>' : ''}
  `;

  if (p.ownerId === localUserId) {
    html += `
      <div class="modal-buttons">
        <button class="btn ghost" id="btn-edit">Modifier</button>
        <button class="btn" id="btn-delete">Supprimer</button>
      </div>
    `;
  }

  qs('#modal-content').innerHTML = html;
  qs('#modal').classList.add('show');

  if (p.ownerId === localUserId) {
    qs('#btn-delete').addEventListener('click', async () => {
      if (confirm('Supprimer ce projet ?')) {
        await deleteDoc(doc(db, "projects", id));
        qs('#modal').classList.remove('show');
        await loadProjects();
        show('category', { cat: state.filter });
      }
    });

    qs('#btn-edit').addEventListener('click', () => {
      fillForm(p);
      qs('#modal').classList.remove('show');
      show('add');
    });
  }
}

// ===== FORMULAIRE =====
function fillForm(p) {
  qs('#p-owner').value = p.owner || '';
  qs('#p-title').value = p.title;
  qs('#p-cat').value = p.cat;
  qs('#p-duration').value = p.duration || '';
  qs('#p-desc').value = p.desc;
  qs('#p-tips').value = p.tips || '';
  qs('#form-project').dataset.editId = p._id;
}

function clearForm() {
  qs('#form-project').reset();
  delete qs('#form-project').dataset.editId;
}

// ===== ÉVÉNEMENTS =====
document.addEventListener('click', e => {
  const c = e.target.closest('.cat-card');
  if (c) { 
    const cat = c.dataset.cat; 
    state.filter = cat; 
    show('category', { cat }); 
  }
});

qs('#btn-add').addEventListener('click', () => { clearForm(); show('add'); });
qs('#add-from-cat').addEventListener('click', () => { 
  clearForm(); 
  if (state.filter) qs('#p-cat').value = state.filter; 
  show('add'); 
});
qs('#back-home').addEventListener('click', () => { show('home'); });
qs('#cancel-add').addEventListener('click', () => { show('home'); });
qs('#close-modal').addEventListener('click', () => qs('#modal').classList.remove('show'));

// Soumission formulaire
qs('#form-project').addEventListener('submit', async e => {
  e.preventDefault();
  const id = qs('#form-project').dataset.editId;
  const data = {
    ownerId: localUserId,
    owner: qs('#p-owner').value.trim(),
    title: qs('#p-title').value.trim(),
    cat: qs('#p-cat').value,
    duration: qs('#p-duration').value.trim(),
    desc: qs('#p-desc').value.trim(),
    tips: qs('#p-tips').value.trim()
  };

  if (id) {
    await setDoc(doc(db, "projects", id), data);
  } else {
    await addDoc(colRef, data);
  }

  clearForm();
  await loadProjects();
  show(state.filter ? 'category' : 'home', { cat: state.filter });
});

// Effacer formulaire
qs('#btn-clear-form').addEventListener('click', () => clearForm());

// Reset (efface tout Firestore ⚠️ seulement pour tests)
qs('#btn-reset').addEventListener('click', async () => {
  if (confirm('Supprimer tous les projets ?')) {
    const snap = await getDocs(colRef);
    for (let d of snap.docs) await deleteDoc(doc(db, "projects", d.id));
    await loadProjects();
    show('home');
  }
});

// ===== INIT =====
await loadProjects();
show('home');
