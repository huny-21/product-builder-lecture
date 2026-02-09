import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  arrayUnion
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfigKey = 'pi_firebase_config';
const AUTH_DISABLED = true;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const state = {
  firebaseConfig: null,
  app: null,
  auth: null,
  db: null,
  user: null,
  userProfile: null,
  currentOrgId: localStorage.getItem('pi_current_org') || null,
  currentOrgRole: null,
  orgs: [],
  expenses: [],
  uploads: [],
  audits: [],
  ratios: [],
  boards: [],
  tasks: [],
  members: []
};

function loadFirebaseConfig() {
  const raw = localStorage.getItem(firebaseConfigKey);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function saveFirebaseConfig(config) {
  localStorage.setItem(firebaseConfigKey, JSON.stringify(config));
}

function setToday() {
  const now = new Date();
  $('#today').textContent = now.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short'
  });
}

function showLoginModal(show) {
  $('#loginModal').classList.toggle('is-active', show);
}

function applyAuthDisabledUI() {
  if (!AUTH_DISABLED) return;
  const loginForm = $('#loginForm');
  const signupForm = $('#signupForm');
  if (loginForm) loginForm.style.display = 'none';
  if (signupForm) signupForm.style.display = 'none';
  const logoutBtn = $('#logoutBtn');
  if (logoutBtn) logoutBtn.style.display = 'none';
  const header = $('#loginModal .modal-header h2');
  const desc = $('#loginModal .modal-header .muted');
  if (header) header.textContent = 'Firebase 설정';
  if (desc) desc.textContent = '로그인 서비스가 비활성화되어 있습니다.';
}

function setActivePanel(target) {
  $$('.panel').forEach((panel) => panel.classList.remove('is-active'));
  $(`#${target}`)?.classList.add('is-active');
  $$('.nav-item').forEach((btn) => btn.classList.remove('is-active'));
  $(`.nav-item[data-target="${target}"]`)?.classList.add('is-active');
}

function setUserChip() {
  if (!state.userProfile) {
    $('#userChip').textContent = '로그인 필요';
    return;
  }
  $('#userChip').textContent = `${state.userProfile.name} (${state.userProfile.email})`;
}

function currentOrg() {
  return state.orgs.find((org) => org.id === state.currentOrgId) || null;
}

function getRoleLabel(role) {
  const map = { admin: '관리자', manager: '실무자', viewer: '열람자' };
  return map[role] || role || '-';
}

function canEdit() {
  return ['admin', 'manager'].includes(state.currentOrgRole);
}

function canManageOrg() {
  if (!state.currentOrgId) return true;
  return state.currentOrgRole === 'admin';
}

function setFormDisabled(form, disabled) {
  if (!form) return;
  form.querySelectorAll('input, select, textarea, button').forEach((el) => {
    el.disabled = disabled;
  });
}

function applyRoleGates() {
  const editDisabled = !canEdit();
  setFormDisabled($('#expenseForm'), editDisabled);
  setFormDisabled($('#uploadCheckForm'), editDisabled);
  setFormDisabled($('#excelUploadForm'), editDisabled);
  setFormDisabled($('#auditForm'), editDisabled);
  setFormDisabled($('#ratioForm'), editDisabled);
  setFormDisabled($('#boardForm'), editDisabled);
  setFormDisabled($('#taskForm'), editDisabled);

  const orgDisabled = !canManageOrg();
  setFormDisabled($('#orgForm'), orgDisabled);
  setFormDisabled($('#memberForm'), orgDisabled || !state.currentOrgId);
  $('#addOrgBtn').disabled = orgDisabled;
}

function renderOrgSelect() {
  const select = $('#orgSelect');
  select.innerHTML = '';
  if (state.orgs.length === 0) {
    const option = document.createElement('option');
    option.textContent = '법인 없음';
    option.value = '';
    select.appendChild(option);
  }
  state.orgs.forEach((org) => {
    const option = document.createElement('option');
    option.value = org.id;
    option.textContent = org.name;
    if (org.id === state.currentOrgId) option.selected = true;
    select.appendChild(option);
  });
  const status = $('#orgStatus');
  const org = currentOrg();
  const roleText = state.currentOrgRole ? `· ${getRoleLabel(state.currentOrgRole)}` : '';
  status.textContent = org ? `${org.name} · ${org.regNo || '등록번호 없음'} ${roleText}` : '선택된 법인 없음';
}

function renderOrgList() {
  const container = $('#orgList');
  container.innerHTML = '';
  if (state.orgs.length === 0) {
    container.textContent = '등록된 법인이 없습니다.';
    return;
  }
  state.orgs.forEach((org) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${org.name}</strong><div class="muted">${org.regNo || '등록번호 없음'}</div></div>
      <div>회계연도: ${org.yearStartMonth}월</div>
      <div>담당자: ${org.contact || '미등록'}</div>
      <button class="ghost" data-org="${org.id}">선택</button>
    `;
    container.appendChild(row);
  });
  container.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', async () => {
      state.currentOrgId = btn.dataset.org;
      localStorage.setItem('pi_current_org', state.currentOrgId);
      await loadOrgData();
    });
  });
}

function renderMembers() {
  const list = $('#memberList');
  list.innerHTML = '';
  const org = currentOrg();
  if (!org) {
    list.textContent = '법인을 선택하세요.';
    return;
  }
  if (state.members.length === 0) {
    list.textContent = '구성원이 없습니다.';
    return;
  }
  const table = document.createElement('div');
  table.className = 'table';
  state.members.forEach((member) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${member.name}</strong><div class="muted">${member.email}</div></div>
      <div>${getRoleLabel(member.role)}</div>
    `;
    table.appendChild(row);
  });
  list.appendChild(table);
}

function renderExpenses() {
  const list = $('#expenseList');
  const org = currentOrg();
  list.innerHTML = '';
  if (!org) {
    list.textContent = '법인을 선택하세요.';
    return;
  }
  if (state.expenses.length === 0) {
    list.textContent = '등록된 지출이 없습니다.';
    return;
  }
  const table = document.createElement('div');
  table.className = 'table';
  state.expenses.slice().reverse().forEach((expense) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${expense.date}</strong><div class="muted">${expense.category} · ${expense.subCategory || '-'}</div></div>
      <div>${Number(expense.amount).toLocaleString('ko-KR')}원</div>
      <div>${expense.payeeName}<div class="muted">${expense.payeeId || '식별정보 없음'}</div></div>
      <div>${expense.isHigh ? '<span class="tag">고액</span>' : ''}</div>
    `;
    table.appendChild(row);
  });
  list.appendChild(table);
}

function renderHighValue() {
  const list = $('#highValueList');
  const org = currentOrg();
  list.innerHTML = '';
  if (!org) {
    list.textContent = '법인을 선택하세요.';
    return;
  }
  const items = state.expenses.filter((e) => e.isHigh);
  if (items.length === 0) {
    list.textContent = '고액 거래가 없습니다.';
    return;
  }
  const table = document.createElement('div');
  table.className = 'table';
  items.slice().reverse().forEach((expense) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${expense.payeeName}</strong><div class="muted">${expense.category}</div></div>
      <div>${Number(expense.amount).toLocaleString('ko-KR')}원</div>
      <div>${expense.date}</div>
      <div>${expense.assetType || '-'}</div>
    `;
    table.appendChild(row);
  });
  list.appendChild(table);
}

function renderUploadLog() {
  const log = $('#uploadLog');
  const org = currentOrg();
  log.innerHTML = '';
  if (!org) {
    log.textContent = '법인을 선택하세요.';
    return;
  }
  if (state.uploads.length === 0) {
    log.textContent = '저장된 점검 기록이 없습니다.';
    return;
  }
  state.uploads.slice().reverse().forEach((item) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${item.date}</strong><div class="muted">${item.note || '메모 없음'}</div></div>
      <div>서식:${item.format ? 'OK' : 'NO'} / 합계:${item.sum ? 'OK' : 'NO'}</div>
      <div>식별:${item.ids ? 'OK' : 'NO'} / 부동산:${item.realEstate ? 'OK' : 'NO'}</div>
    `;
    log.appendChild(row);
  });
}

function renderAuditLog() {
  const log = $('#auditLog');
  const org = currentOrg();
  log.innerHTML = '';
  if (!org) {
    log.textContent = '법인을 선택하세요.';
    return;
  }
  if (state.audits.length === 0) {
    log.textContent = '감사 기록이 없습니다.';
    return;
  }
  state.audits.slice().reverse().forEach((item) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${item.date}</strong><div class="muted">${item.debtNote || '메모 없음'}</div></div>
      <div>감사대상: ${item.required ? '예' : '아니오'}</div>
      <div>첨부: ${item.attached ? '완료' : '미완료'}</div>
    `;
    log.appendChild(row);
  });
}

function renderBoardList() {
  const list = $('#boardList');
  const org = currentOrg();
  list.innerHTML = '';
  if (!org) {
    list.textContent = '법인을 선택하세요.';
    return;
  }
  if (state.boards.length === 0) {
    list.textContent = '등기 기록이 없습니다.';
    return;
  }
  const table = document.createElement('div');
  table.className = 'table';
  state.boards.slice().reverse().forEach((item) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${item.name}</strong><div class="muted">${item.type}</div></div>
      <div>효력일: ${item.effectiveDate}</div>
      <div>등기 마감: ${item.deadline}</div>
      <div>${item.isLate ? '<span class="tag">지연 위험</span>' : ''}</div>
    `;
    table.appendChild(row);
  });
  list.appendChild(table);
}

function renderTasks() {
  const org = currentOrg();
  const list = $('#calendarList');
  const dash = $('#taskList');
  list.innerHTML = '';
  dash.innerHTML = '';
  if (!org) {
    list.textContent = '법인을 선택하세요.';
    dash.textContent = '법인을 선택하세요.';
    return;
  }
  if (state.tasks.length === 0) {
    list.textContent = '등록된 태스크가 없습니다.';
    dash.textContent = '등록된 태스크가 없습니다.';
    return;
  }
  const table = document.createElement('div');
  table.className = 'table';
  state.tasks.slice().reverse().forEach((task) => {
    const row = document.createElement('div');
    row.className = 'table-row';
    row.innerHTML = `
      <div><strong>${task.title}</strong><div class="muted">${task.category || '-'}</div></div>
      <div>마감: ${task.dueDate}</div>
      <div>${task.status}</div>
    `;
    table.appendChild(row);
  });
  list.appendChild(table);
  dash.appendChild(table.cloneNode(true));
}

function renderMetrics() {
  const org = currentOrg();
  if (!org) {
    $('#metricMapping').textContent = '0%';
    $('#metricRatio').textContent = '0%';
    $('#metricBoard').textContent = '0건';
    $('#riskList').innerHTML = '';
    return;
  }
  const requiredFilled = state.expenses.filter((e) => e.payeeName && e.category && e.amount).length;
  const mappingRate = state.expenses.length ? Math.round((requiredFilled / state.expenses.length) * 100) : 0;
  $('#metricMapping').textContent = `${mappingRate}%`;

  const ratio = state.ratios.slice(-1)[0];
  $('#metricRatio').textContent = ratio ? `${ratio.rate}%` : '0%';

  const lateCount = state.boards.filter((b) => b.isLate).length;
  $('#metricBoard').textContent = `${lateCount}건`;

  const risks = $('#riskList');
  risks.innerHTML = '';
  const items = [];
  if (mappingRate < 95) items.push('지출 분류 필수 항목 누락 가능성');
  if (ratio && ratio.rate < 80) items.push('운용소득 80% 미달 위험');
  if (lateCount > 0) items.push('임원 등기 기한 임박');
  if (items.length === 0) items.push('현재 주요 리스크 없음');
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    risks.appendChild(li);
  });
}

function renderAll() {
  setUserChip();
  renderOrgSelect();
  renderOrgList();
  renderMembers();
  renderExpenses();
  renderHighValue();
  renderUploadLog();
  renderAuditLog();
  renderBoardList();
  renderTasks();
  renderMetrics();
  applyRoleGates();
}

function normalizeCategory(value = '') {
  const text = String(value).trim();
  if (text.includes('지원') || text.includes('수혜')) return '지원';
  if (text.includes('자산')) return '자산';
  if (text.includes('운영') || text.includes('경비') || text.includes('관리')) return '운영';
  return text || '운영';
}

function mapExcelRow(row) {
  const mapping = {
    date: ['지출일자', '날짜', 'date'],
    amount: ['금액', 'amount', '지출금액'],
    category: ['지출 분류', '분류', 'category'],
    subCategory: ['세부 목적', '세부목적', 'purpose'],
    payeeName: ['지급처', '수혜자명', '지급처/수혜자명', 'payee'],
    payeeId: ['고유식별번호', '사업자등록번호', '주민등록번호', 'id'],
    description: ['설명', '비고', 'description'],
    assetType: ['자산 유형', '자산유형', 'assetType']
  };

  const lookup = (keys) => {
    for (const key of keys) {
      if (row[key] !== undefined) return row[key];
    }
    return '';
  };

  const amount = Number(lookup(mapping.amount) || 0);
  const category = normalizeCategory(lookup(mapping.category));

  return {
    date: lookup(mapping.date) || '',
    amount,
    category,
    subCategory: lookup(mapping.subCategory) || '',
    payeeName: lookup(mapping.payeeName) || '',
    payeeId: lookup(mapping.payeeId) || '',
    description: lookup(mapping.description) || '',
    assetType: lookup(mapping.assetType) || '',
    isHigh: amount >= 1000000
  };
}

async function loadOrgData() {
  if (!state.currentOrgId || !state.user) {
    state.currentOrgRole = null;
    renderAll();
    return;
  }
  if (AUTH_DISABLED) {
    state.currentOrgRole = 'admin';
  } else {
    const memberDocId = `${state.currentOrgId}_${state.user.uid}`;
    const memberSnap = await getDoc(doc(state.db, 'orgMembers', memberDocId));
    state.currentOrgRole = memberSnap.exists() ? memberSnap.data().role : null;
  }

  state.expenses = await fetchCollection('expenses');
  state.uploads = await fetchCollection('uploads');
  state.audits = await fetchCollection('audits');
  state.ratios = await fetchCollection('ratios');
  state.boards = await fetchCollection('boards');
  state.tasks = await fetchCollection('tasks');
  state.members = await fetchMembers();

  renderAll();
}

async function fetchCollection(name) {
  const q = query(
    collection(state.db, name),
    where('orgId', '==', state.currentOrgId),
    orderBy('createdAt', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function fetchMembers() {
  const q = query(
    collection(state.db, 'orgMembers'),
    where('orgId', '==', state.currentOrgId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((docSnap) => docSnap.data());
}

async function loadUserOrgs() {
  if (!state.user) return;
  if (AUTH_DISABLED) {
    const snap = await getDocs(query(collection(state.db, 'orgs'), orderBy('createdAt', 'asc')));
    state.orgs = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    if (!state.currentOrgId && state.orgs.length > 0) {
      state.currentOrgId = state.orgs[0].id;
      localStorage.setItem('pi_current_org', state.currentOrgId);
    }
    await loadOrgData();
    return;
  }
  const q = query(collection(state.db, 'orgMembers'), where('uid', '==', state.user.uid));
  const snap = await getDocs(q);
  const orgIds = snap.docs.map((docSnap) => docSnap.data().orgId);
  const orgDocs = await Promise.all(
    orgIds.map(async (orgId) => {
      const orgSnap = await getDoc(doc(state.db, 'orgs', orgId));
      return orgSnap.exists() ? { id: orgSnap.id, ...orgSnap.data() } : null;
    })
  );
  state.orgs = orgDocs.filter(Boolean);
  if (!state.currentOrgId && state.orgs.length > 0) {
    state.currentOrgId = state.orgs[0].id;
    localStorage.setItem('pi_current_org', state.currentOrgId);
  }
  await loadOrgData();
}

async function ensureUserProfile(user, nameOverride) {
  const ref = doc(state.db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    state.userProfile = snap.data();
    return;
  }
  const profile = {
    name: nameOverride || user.displayName || '운영자',
    email: user.email,
    role: 'admin',
    createdAt: serverTimestamp()
  };
  await setDoc(ref, profile);
  state.userProfile = profile;
}

async function addOrg(data) {
  const ref = await addDoc(collection(state.db, 'orgs'), {
    ...data,
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  const memberRef = doc(state.db, 'orgMembers', `${ref.id}_${state.user.uid}`);
  await setDoc(memberRef, {
    orgId: ref.id,
    uid: state.user.uid,
    name: state.userProfile.name,
    email: state.userProfile.email,
    role: 'admin'
  });
  await updateDoc(doc(state.db, 'users', state.user.uid), {
    orgIds: arrayUnion(ref.id)
  });
  await loadUserOrgs();
}

function calculateDeadline(effectiveDate, days) {
  const date = new Date(effectiveDate);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function isPast(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  return date < new Date(now.toDateString());
}

async function addExpense(item) {
  await addDoc(collection(state.db, 'expenses'), {
    ...item,
    orgId: state.currentOrgId,
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
}

function parseFirebaseConfig(text) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return JSON.parse(trimmed);
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const slice = trimmed.slice(start, end + 1);
    return JSON.parse(slice);
  }
  return null;
}

function initFirebase() {
  state.firebaseConfig = loadFirebaseConfig();
  if (!state.firebaseConfig) {
    showLoginModal(true);
    return false;
  }
  state.app = initializeApp(state.firebaseConfig);
  state.auth = AUTH_DISABLED ? null : getAuth(state.app);
  state.db = getFirestore(state.app);
  return true;
}

async function handleExcelUpload(file, autoImport) {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  if (rows.length === 0) {
    alert('엑셀에 데이터가 없습니다.');
    return;
  }

  const mapped = rows.map(mapExcelRow).filter((row) => row.date || row.payeeName || row.amount);
  if (mapped.length === 0) {
    alert('매핑 가능한 데이터가 없습니다.');
    return;
  }

  if (autoImport) {
    if (!canEdit()) {
      alert('지출 등록 권한이 없습니다.');
      return;
    }
    if (!confirm(`${mapped.length}건을 지출로 등록할까요?`)) return;
    await Promise.all(mapped.map((row) => addExpense(row)));
    await loadOrgData();
  }

  const note = `엑셀 ${mapped.length}건 처리${autoImport ? ' (자동 등록)' : ''}`;
  await addDoc(collection(state.db, 'uploads'), {
    orgId: state.currentOrgId,
    date: new Date().toISOString().slice(0, 10),
    format: true,
    sum: true,
    ids: true,
    realEstate: false,
    note,
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  await loadOrgData();
}

$('#nav').addEventListener('click', (event) => {
  const button = event.target.closest('.nav-item');
  if (!button) return;
  setActivePanel(button.dataset.target);
});

$('#orgSelect').addEventListener('change', async (event) => {
  state.currentOrgId = event.target.value;
  localStorage.setItem('pi_current_org', state.currentOrgId);
  await loadOrgData();
});

$('#addOrgBtn').addEventListener('click', () => {
  setActivePanel('orgs');
});

$('#orgForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canManageOrg()) {
    alert('법인 생성 권한이 없습니다.');
    return;
  }
  const form = event.target;
  const data = {
    name: form.name.value.trim(),
    regNo: form.regNo.value.trim(),
    yearStartMonth: form.yearStartMonth.value || '1',
    contact: form.contact.value.trim()
  };
  if (!data.name) return;
  await addOrg(data);
  form.reset();
});

$('#memberForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canManageOrg()) {
    alert('구성원 관리 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  const email = form.email.value.trim();
  const role = form.role.value;
  const q = query(collection(state.db, 'users'), where('email', '==', email));
  const snap = await getDocs(q);
  if (snap.empty) {
    alert('해당 이메일 사용자가 없습니다. 먼저 회원가입이 필요합니다.');
    return;
  }
  const userDoc = snap.docs[0];
  const memberRef = doc(state.db, 'orgMembers', `${org.id}_${userDoc.id}`);
  await setDoc(memberRef, {
    orgId: org.id,
    uid: userDoc.id,
    name: userDoc.data().name,
    email: userDoc.data().email,
    role
  });
  await updateDoc(doc(state.db, 'users', userDoc.id), {
    orgIds: arrayUnion(org.id)
  });
  form.reset();
  await loadOrgData();
});

$('#expenseForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canEdit()) {
    alert('지출 등록 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  const amount = Number(form.amount.value || 0);
  const item = {
    date: form.date.value,
    amount,
    category: form.category.value,
    subCategory: form.subCategory.value.trim(),
    payeeName: form.payeeName.value.trim(),
    payeeId: form.payeeId.value.trim(),
    description: form.description.value.trim(),
    assetType: form.assetType.value.trim(),
    isHigh: amount >= 1000000,
    isAsset: form.isAsset.checked
  };
  await addExpense(item);
  await loadOrgData();
  form.reset();
});

$('#uploadCheckForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canEdit()) {
    alert('업로드 체크 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  await addDoc(collection(state.db, 'uploads'), {
    orgId: org.id,
    date: new Date().toISOString().slice(0, 10),
    format: form.format.checked,
    sum: form.sum.checked,
    ids: form.ids.checked,
    realEstate: form.realEstate.checked,
    note: form.note.value.trim(),
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  await loadOrgData();
  form.reset();
});

$('#excelUploadForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!state.user) return;
  const form = event.target;
  const file = form.excel.files[0];
  if (!file) return;
  await handleExcelUpload(file, form.autoImport.checked);
  form.reset();
});

$('#auditForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canEdit()) {
    alert('감사 기록 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  await addDoc(collection(state.db, 'audits'), {
    orgId: org.id,
    date: new Date().toISOString().slice(0, 10),
    required: form.required.checked,
    attached: form.attached.checked,
    debtNote: form.debtNote.value.trim(),
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  await loadOrgData();
  form.reset();
});

$('#ratioForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canEdit()) {
    alert('계산 저장 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  const bizIncome = Number(form.bizIncome.value || 0);
  const reserveReturn = Number(form.reserveReturn.value || 0);
  const separateInterest = Number(form.separateInterest.value || 0);
  const tax = Number(form.tax.value || 0);
  const loss = Number(form.loss.value || 0);
  const used = Number(form.used.value || 0);
  const base = bizIncome + reserveReturn + separateInterest - tax - loss;
  const rate = base > 0 ? Math.round((used / base) * 100) : 0;
  $('#ratioResult').textContent = `${rate}%`;
  $('#ratioDetail').textContent = `기준금액 ${base.toLocaleString('ko-KR')}원 · 사용실적 ${used.toLocaleString('ko-KR')}원`;
  await addDoc(collection(state.db, 'ratios'), {
    orgId: org.id,
    date: new Date().toISOString().slice(0, 10),
    base,
    used,
    rate,
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  await loadOrgData();
});

$('#boardForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canEdit()) {
    alert('등기 관리 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  const days = Number(form.deadlineRule.value || 14);
  const deadline = calculateDeadline(form.effectiveDate.value, days);
  await addDoc(collection(state.db, 'boards'), {
    orgId: org.id,
    name: form.name.value.trim(),
    type: form.type.value,
    effectiveDate: form.effectiveDate.value,
    deadline,
    isLate: isPast(deadline),
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  await loadOrgData();
  form.reset();
});

$('#taskForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!canEdit()) {
    alert('태스크 등록 권한이 없습니다.');
    return;
  }
  const org = currentOrg();
  if (!org) return;
  const form = event.target;
  await addDoc(collection(state.db, 'tasks'), {
    orgId: org.id,
    title: form.title.value.trim(),
    category: form.category.value.trim(),
    dueDate: form.dueDate.value,
    status: '진행중',
    createdBy: state.user.uid,
    createdAt: serverTimestamp()
  });
  await loadOrgData();
  form.reset();
});

$('#openTaskBtn').addEventListener('click', () => {
  setActivePanel('calendar');
});

$('#logoutBtn').addEventListener('click', async () => {
  if (AUTH_DISABLED) return;
  if (state.auth) {
    await signOut(state.auth);
  }
});

$('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (AUTH_DISABLED) return;
  const form = event.target;
  try {
    await signInWithEmailAndPassword(state.auth, form.email.value.trim(), form.password.value.trim());
    form.reset();
  } catch (error) {
    alert('로그인 정보가 올바르지 않습니다.');
  }
});

$('#signupForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (AUTH_DISABLED) return;
  const form = event.target;
  try {
    const credential = await createUserWithEmailAndPassword(state.auth, form.email.value.trim(), form.password.value.trim());
    await ensureUserProfile(credential.user, form.name.value.trim());
    form.reset();
  } catch (error) {
    alert('회원가입에 실패했습니다.');
  }
});

$('#exportBtn').addEventListener('click', () => {
  const org = currentOrg();
  if (!org) {
    alert('법인을 선택하세요.');
    return;
  }
  const payload = {
    org,
    expenses: state.expenses,
    uploads: state.uploads,
    audits: state.audits,
    ratios: state.ratios,
    boards: state.boards,
    tasks: state.tasks
  };
  const dataStr = JSON.stringify(payload, null, 2);
  navigator.clipboard.writeText(dataStr);
  alert('요약 JSON을 클립보드에 복사했습니다.');
});

$('#applyFirebaseBtn').addEventListener('click', () => {
  const raw = $('#firebaseConfig').value;
  try {
    const parsed = parseFirebaseConfig(raw);
    if (!parsed) {
      alert('유효한 Firebase 설정을 붙여넣어 주세요.');
      return;
    }
    saveFirebaseConfig(parsed);
    location.reload();
  } catch (error) {
    alert('Firebase 설정을 읽을 수 없습니다. JSON 형태로 입력해 주세요.');
  }
});

function initAuthListener() {
  onAuthStateChanged(state.auth, async (user) => {
    state.user = user || null;
    state.userProfile = null;
    if (user) {
      await ensureUserProfile(user);
      await loadUserOrgs();
      showLoginModal(false);
    } else {
      state.orgs = [];
      state.currentOrgId = null;
      showLoginModal(true);
      renderAll();
    }
  });
}

function init() {
  setToday();
  applyAuthDisabledUI();
  const ok = initFirebase();
  if (!ok) return;
  if (AUTH_DISABLED) {
    state.user = { uid: 'guest', email: 'guest@local', displayName: '게스트' };
    state.userProfile = { name: '게스트', email: 'guest@local', role: 'admin' };
    setUserChip();
    showLoginModal(false);
    ensureUserProfile(state.user, '게스트').then(() => loadUserOrgs());
    return;
  }
  initAuthListener();
}

init();
