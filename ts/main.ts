import { Task, WorkSpace, TaskStatus } from './types';
import { loadWorkspaces, saveWorkspaces, loadTasks, saveTasks } from './storage';

// --- State ---
let workspaces: WorkSpace[] = [];
let tasks: Task[] = [];
let activeWorkspaceId: string | null = null;
let viewMode: 'kanban' | 'list' = 'kanban';
let editingTaskId: string | null = null;
let searchQuery = '';

// --- Utility ---
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function statusLabel(status: TaskStatus): string {
  const labels: Record<TaskStatus, string> = {
    'pending': 'Pending',
    'in-progress': 'In Progress',
    'done': 'Done',
  };
  return labels[status];
}

// --- Init ---
function init(): void {
  workspaces = loadWorkspaces();
  tasks = loadTasks();
  renderSidebar();

  document.getElementById('search-input')!.addEventListener('input', (e) => {
    searchQuery = (e.target as HTMLInputElement).value.toLowerCase();
    renderSidebar();
  });

  document.getElementById('add-workspace-btn')!.addEventListener('click', openWorkspaceModal);
  document.getElementById('add-task-btn')!.addEventListener('click', () => openTaskModal(null));

  document.getElementById('kanban-btn')!.addEventListener('click', () => {
    viewMode = 'kanban';
    document.getElementById('kanban-btn')!.classList.add('active');
    document.getElementById('list-btn')!.classList.remove('active');
    renderMain();
  });

  document.getElementById('list-btn')!.addEventListener('click', () => {
    viewMode = 'list';
    document.getElementById('list-btn')!.classList.add('active');
    document.getElementById('kanban-btn')!.classList.remove('active');
    renderMain();
  });

  document.getElementById('delete-workspace-btn')!.addEventListener('click', handleDeleteWorkspace);

  document.getElementById('modal-overlay')!.addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  document.getElementById('modal-close-btn')!.addEventListener('click', closeModal);
  document.getElementById('modal-cancel-btn')!.addEventListener('click', closeModal);
  document.getElementById('modal-submit-btn')!.addEventListener('click', handleModalSubmit);
}

// --- Sidebar ---
function renderSidebar(): void {
  const list = document.getElementById('workspace-list')!;
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

  list.querySelectorAll<HTMLElement>('.workspace-item').forEach(item => {
    item.addEventListener('click', () => selectWorkspace(item.dataset.id!));
  });
}

function selectWorkspace(id: string): void {
  activeWorkspaceId = id;
  renderSidebar();
  document.getElementById('empty-state')!.classList.add('hidden');
  document.getElementById('workspace-view')!.classList.remove('hidden');
  renderMain();
}

function showEmptyState(): void {
  document.getElementById('empty-state')!.classList.remove('hidden');
  document.getElementById('workspace-view')!.classList.add('hidden');
}

// --- Main Area ---
function renderMain(): void {
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  if (!ws) return;
  document.getElementById('workspace-title')!.textContent = ws.name;

  if (viewMode === 'kanban') {
    document.getElementById('kanban-view')!.classList.remove('hidden');
    document.getElementById('list-view')!.classList.add('hidden');
    renderKanban();
  } else {
    document.getElementById('list-view')!.classList.remove('hidden');
    document.getElementById('kanban-view')!.classList.add('hidden');
    renderList();
  }
}

// --- Kanban ---
function renderKanban(): void {
  const wsTasks = tasks.filter(t => t.workspaceId === activeWorkspaceId);
  const columns: { status: TaskStatus; label: string; color: string }[] = [
    { status: 'pending', label: 'To Do', color: '#f59e0b' },
    { status: 'in-progress', label: 'In Progress', color: '#3b82f6' },
    { status: 'done', label: 'Done', color: '#10b981' },
  ];

  const kanban = document.getElementById('kanban-view')!;
  kanban.innerHTML = columns.map(col => {
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

  attachTaskEvents(kanban);
}

function renderTaskCard(task: Task): string {
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

// --- List ---
function renderList(): void {
  const wsTasks = tasks.filter(t => t.workspaceId === activeWorkspaceId);
  const listView = document.getElementById('list-view')!;

  if (wsTasks.length === 0) {
    listView.innerHTML = '<p class="list-empty">No tasks yet. Click "+ Add Task" to get started.</p>';
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

function attachTaskEvents(container: Element): void {
  container.querySelectorAll<HTMLElement>('.btn-edit-task').forEach(btn => {
    btn.addEventListener('click', () => openTaskModal(btn.dataset.id!));
  });
  container.querySelectorAll<HTMLElement>('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', () => deleteTask(btn.dataset.id!));
  });
}

// --- Task Operations ---
function deleteTask(id: string): void {
  const task = tasks.find(t => t.id === id);
  if (!task || !confirm(`Delete task "${task.title}"?`)) return;
  tasks = tasks.filter(t => t.id !== id);
  saveTasks(tasks);
  renderMain();
}

function handleDeleteWorkspace(): void {
  if (!activeWorkspaceId) return;
  const ws = workspaces.find(w => w.id === activeWorkspaceId);
  if (!ws || !confirm(`Delete workspace "${ws.name}" and all its tasks?`)) return;
  workspaces = workspaces.filter(w => w.id !== activeWorkspaceId);
  tasks = tasks.filter(t => t.workspaceId !== activeWorkspaceId);
  saveWorkspaces(workspaces);
  saveTasks(tasks);
  activeWorkspaceId = null;
  renderSidebar();
  showEmptyState();
}

// --- Modal ---
function openWorkspaceModal(): void {
  editingTaskId = null;
  document.getElementById('modal-title')!.textContent = 'New Workspace';
  document.getElementById('modal-task-fields')!.classList.add('hidden');
  document.getElementById('modal-workspace-fields')!.classList.remove('hidden');
  (document.getElementById('workspace-name-input') as HTMLInputElement).value = '';
  document.getElementById('modal-submit-btn')!.textContent = 'Create';
  document.getElementById('modal-overlay')!.classList.remove('hidden');
  document.getElementById('workspace-name-input')!.focus();
}

function openTaskModal(taskId: string | null): void {
  document.getElementById('modal-task-fields')!.classList.remove('hidden');
  document.getElementById('modal-workspace-fields')!.classList.add('hidden');

  if (taskId) {
    editingTaskId = taskId;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('modal-title')!.textContent = 'Edit Task';
    (document.getElementById('task-title-input') as HTMLInputElement).value = task.title;
    (document.getElementById('task-desc-input') as HTMLTextAreaElement).value = task.description;
    (document.getElementById('task-status-select') as HTMLSelectElement).value = task.status;
    document.getElementById('modal-submit-btn')!.textContent = 'Save';
  } else {
    editingTaskId = null;
    document.getElementById('modal-title')!.textContent = 'New Task';
    (document.getElementById('task-title-input') as HTMLInputElement).value = '';
    (document.getElementById('task-desc-input') as HTMLTextAreaElement).value = '';
    (document.getElementById('task-status-select') as HTMLSelectElement).value = 'pending';
    document.getElementById('modal-submit-btn')!.textContent = 'Create';
  }

  document.getElementById('modal-overlay')!.classList.remove('hidden');
  document.getElementById('task-title-input')!.focus();
}

function closeModal(): void {
  document.getElementById('modal-overlay')!.classList.add('hidden');
  editingTaskId = null;
}

function handleModalSubmit(): void {
  const isTask = !document.getElementById('modal-task-fields')!.classList.contains('hidden');

  if (!isTask) {
    const name = (document.getElementById('workspace-name-input') as HTMLInputElement).value.trim();
    if (!name) { document.getElementById('workspace-name-input')!.focus(); return; }
    const ws: WorkSpace = { id: generateId(), name, createdAt: Date.now() };
    workspaces.push(ws);
    saveWorkspaces(workspaces);
    closeModal();
    renderSidebar();
    selectWorkspace(ws.id);
  } else {
    const title = (document.getElementById('task-title-input') as HTMLInputElement).value.trim();
    if (!title) { document.getElementById('task-title-input')!.focus(); return; }
    const description = (document.getElementById('task-desc-input') as HTMLTextAreaElement).value.trim();
    const status = (document.getElementById('task-status-select') as HTMLSelectElement).value as TaskStatus;

    if (editingTaskId) {
      const idx = tasks.findIndex(t => t.id === editingTaskId);
      if (idx !== -1) tasks[idx] = { ...tasks[idx], title, description, status };
    } else {
      tasks.push({ id: generateId(), workspaceId: activeWorkspaceId!, title, description, status, createdAt: Date.now() });
    }

    saveTasks(tasks);
    closeModal();
    renderMain();
  }
}

document.addEventListener('DOMContentLoaded', init);
