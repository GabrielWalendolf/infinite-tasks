'use strict';

const WORKSPACES_KEY = 'infinite_tasks_workspaces';
const TASKS_KEY = 'infinite_tasks_tasks';

let workspaces = [];
let tasks = [];
let activeWorkspaceId = null;
let viewMode = 'kanban';
let editingTaskId = null;
let searchQuery = '';

// ── Storage ──────────────────────────────────────────────────────────────────

function loadWorkspaces() {
  const raw = localStorage.getItem(WORKSPACES_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveWorkspaces() {
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

function loadTasks() {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTasks() {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function statusLabel(status) {
  const map = { pending: 'Pending', 'in-progress': 'In Progress', done: 'Done' };
  return map[status] || status;
}

function el(id) {
  return document.getElementById(id);
}

// ── Init ──────────────────────────────────────────────────────────────────────

function init() {
  workspaces = loadWorkspaces();
  tasks = loadTasks();
  renderSidebar();

  el('search-input').addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderSidebar();
  });

  el('add-workspace-btn').addEventListener('click', openWorkspaceModal);
  el('add-task-btn').addEventListener('click', () => openTaskModal(null));

  el('kanban-btn').addEventListener('click', () => {
    viewMode = 'kanban';
    el('kanban-btn').classList.add('active');
    el('list-btn').classList.remove('active');
    renderMain();
  });

  el('list-btn').addEventListener('click', () => {
    viewMode = 'list';
    el('list-btn').classList.add('active');
    el('kanban-btn').classList.remove('active');
    renderMain();
  });

  el('delete-workspace-btn').addEventListener('click', handleDeleteWorkspace);

  el('modal-overlay').addEventListener('click', (e) => {
    if (e.target === el('modal-overlay')) closeModal();
  });

  el('modal-close-btn').addEventListener('click', closeModal);
  el('modal-cancel-btn').addEventListener('click', closeModal);
  el('modal-submit-btn').addEventListener('click', handleModalSubmit);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function renderSidebar() {
  const list = el('workspace-list');
  const filtered = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery)
  );

  if (filtered.length === 0) {
    list.innerHTML = `<p class="sidebar-empty">${searchQuery ? 'No workspaces found' : 'No workspaces yet'}</p>`;
    return;
  }

  list.innerHTML = filtered.map(ws => `
    <div class="workspace-item ${ws.id === activeWorkspaceId ? 'active' : ''}" data-id="${ws.id}">
      <span class="ws-icon">&#128193;</span>
      <span class="ws-name">${escapeHtml(ws.name)}</span>
    </div>
  `).join('');

  list.querySelectorAll('.workspace-item').forEach(item => {
    item.addEventListener('click', () => selectWorkspace(item.dataset.id));
  });
}

function selectWorkspace(id) {
  activeWorkspaceId = id;
  renderSidebar();
  el('empty-state').classList.add('hidden');
  el('workspace-view').classList.remove('hidden');
  renderMain();
}

function showEmptyState() {
  el('empty-state').classList.remove('hidden');
  el('workspace-view').classList.add('hidden');
}

// ── Main area ─────────────────────────────────────────────────────────────────

function renderMain() {
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  if (!ws) return;
  el('workspace-title').textContent = ws.name;

  if (viewMode === 'kanban') {
    el('kanban-view').classList.remove('hidden');
    el('list-view').classList.add('hidden');
    renderKanban();
  } else {
    el('list-view').classList.remove('hidden');
    el('kanban-view').classList.add('hidden');
    renderList();
  }
}

// ── Kanban ────────────────────────────────────────────────────────────────────

function renderKanban() {
  const wsTasks = tasks.filter(t => t.workspaceId === activeWorkspaceId);
  const columns = [
    { status: 'pending',     label: 'To Do',       color: '#f59e0b' },
    { status: 'in-progress', label: 'In Progress',  color: '#3b82f6' },
    { status: 'done',        label: 'Done',         color: '#10b981' },
  ];

  el('kanban-view').innerHTML = columns.map(col => {
    const colTasks = wsTasks.filter(t => t.status === col.status);
    return `
      <div class="kanban-column">
        <div class="kanban-column-header" style="color:${col.color}">
          ${col.label}
          <span class="column-count">${colTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${colTasks.length === 0
            ? '<p class="column-empty">No tasks here</p>'
            : colTasks.map(renderTaskCard).join('')}
        </div>
      </div>
    `;
  }).join('');

  attachTaskEvents(el('kanban-view'));
}

function renderTaskCard(task) {
  return `
    <div class="task-card">
      <div class="task-card-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-card-footer">
        <span class="badge badge-${task.status}">${statusLabel(task.status)}</span>
        <div class="task-actions">
          <button class="btn-icon btn-edit-task" data-id="${task.id}" title="Edit">&#9998;</button>
          <button class="btn-icon btn-delete btn-delete-task" data-id="${task.id}" title="Delete">&#128465;</button>
        </div>
      </div>
    </div>
  `;
}

// ── List ──────────────────────────────────────────────────────────────────────

function renderList() {
  const wsTasks = tasks.filter(t => t.workspaceId === activeWorkspaceId);
  const listView = el('list-view');

  if (wsTasks.length === 0) {
    listView.innerHTML = '<p class="list-empty">No tasks yet. Click &ldquo;+ Add Task&rdquo; to get started.</p>';
    return;
  }

  listView.innerHTML = `
    <table class="list-table">
      <thead>
        <tr>
          <th>Title</th>
          <th>Description</th>
          <th>Status</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${wsTasks.map(task => `
          <tr>
            <td class="task-title-cell">${escapeHtml(task.title)}</td>
            <td class="task-desc-cell">${task.description ? escapeHtml(task.description) : '&mdash;'}</td>
            <td><span class="badge badge-${task.status}">${statusLabel(task.status)}</span></td>
            <td>
              <div class="task-actions-cell">
                <button class="btn-icon btn-edit-task" data-id="${task.id}" title="Edit">&#9998;</button>
                <button class="btn-icon btn-delete btn-delete-task" data-id="${task.id}" title="Delete">&#128465;</button>
              </div>
            </td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;

  attachTaskEvents(listView);
}

function attachTaskEvents(container) {
  container.querySelectorAll('.btn-edit-task').forEach(btn => {
    btn.addEventListener('click', () => openTaskModal(btn.dataset.id));
  });
  container.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id));
  });
}

// ── Task operations ───────────────────────────────────────────────────────────

function deleteTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task || !confirm(`Delete task "${task.title}"?`)) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  renderMain();
}

function handleDeleteWorkspace() {
  if (!activeWorkspaceId) return;
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  if (!ws || !confirm(`Delete workspace "${ws.name}" and all its tasks?`)) return;
  workspaces = workspaces.filter(w => w.id !== activeWorkspaceId);
  tasks = tasks.filter(t => t.workspaceId !== activeWorkspaceId);
  saveWorkspaces();
  saveTasks();
  activeWorkspaceId = null;
  renderSidebar();
  showEmptyState();
}

// ── Modal ─────────────────────────────────────────────────────────────────────

function openWorkspaceModal() {
  editingTaskId = null;
  el('modal-title').textContent = 'New Workspace';
  el('modal-task-fields').classList.add('hidden');
  el('modal-workspace-fields').classList.remove('hidden');
  el('workspace-name-input').value = '';
  el('modal-submit-btn').textContent = 'Create';
  el('modal-overlay').classList.remove('hidden');
  el('workspace-name-input').focus();
}

function openTaskModal(taskId) {
  el('modal-task-fields').classList.remove('hidden');
  el('modal-workspace-fields').classList.add('hidden');

  if (taskId) {
    editingTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    el('modal-title').textContent = 'Edit Task';
    el('task-title-input').value = task.title;
    el('task-desc-input').value = task.description;
    el('task-status-select').value = task.status;
    el('modal-submit-btn').textContent = 'Save';
  } else {
    editingTaskId = null;
    el('modal-title').textContent = 'New Task';
    el('task-title-input').value = '';
    el('task-desc-input').value = '';
    el('task-status-select').value = 'pending';
    el('modal-submit-btn').textContent = 'Create';
  }

  el('modal-overlay').classList.remove('hidden');
  el('task-title-input').focus();
}

function closeModal() {
  el('modal-overlay').classList.add('hidden');
  editingTaskId = null;
}

function handleModalSubmit() {
  const isTask = !el('modal-task-fields').classList.contains('hidden');

  if (!isTask) {
    const name = el('workspace-name-input').value.trim();
    if (!name) { el('workspace-name-input').focus(); return; }
    const ws = { id: generateId(), name, createdAt: Date.now() };
    workspaces.push(ws);
    saveWorkspaces();
    closeModal();
    renderSidebar();
    selectWorkspace(ws.id);
  } else {
    const title = el('task-title-input').value.trim();
    if (!title) { el('task-title-input').focus(); return; }
    const description = el('task-desc-input').value.trim();
    const status = el('task-status-select').value;

    if (editingTaskId) {
      const idx = tasks.findIndex(t => t.id === editingTaskId);
      if (idx !== -1) tasks[idx] = { ...tasks[idx], title, description, status };
    } else {
      tasks.push({
        id: generateId(),
        workspaceId: activeWorkspaceId,
        title,
        description,
        status,
        createdAt: Date.now(),
      });
    }

    saveTasks();
    closeModal();
    renderMain();
  }
}

document.addEventListener('DOMContentLoaded', init);
