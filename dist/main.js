"use strict";
(() => {
  // ts/storage.ts
  var WORKSPACES_KEY = "infinite_tasks_workspaces";
  var TASKS_KEY = "infinite_tasks_tasks";
  function loadWorkspaces() {
    const raw = localStorage.getItem(WORKSPACES_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveWorkspaces(workspaces2) {
    localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces2));
  }
  function loadTasks() {
    const raw = localStorage.getItem(TASKS_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveTasks(tasks2) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(tasks2));
  }

  // ts/main.ts
  var workspaces = [];
  var tasks = [];
  var activeWorkspaceId = null;
  var viewMode = "kanban";
  var editingTaskId = null;
  var searchQuery = "";
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }
  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function statusLabel(status) {
    const labels = {
      "pending": "Pending",
      "in-progress": "In Progress",
      "done": "Done"
    };
    return labels[status];
  }
  function init() {
    workspaces = loadWorkspaces();
    tasks = loadTasks();
    renderSidebar();
    document.getElementById("search-input").addEventListener("input", (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderSidebar();
    });
    document.getElementById("add-workspace-btn").addEventListener("click", openWorkspaceModal);
    document.getElementById("add-task-btn").addEventListener("click", () => openTaskModal(null));
    document.getElementById("kanban-btn").addEventListener("click", () => {
      viewMode = "kanban";
      document.getElementById("kanban-btn").classList.add("active");
      document.getElementById("list-btn").classList.remove("active");
      renderMain();
    });
    document.getElementById("list-btn").addEventListener("click", () => {
      viewMode = "list";
      document.getElementById("list-btn").classList.add("active");
      document.getElementById("kanban-btn").classList.remove("active");
      renderMain();
    });
    document.getElementById("delete-workspace-btn").addEventListener("click", handleDeleteWorkspace);
    document.getElementById("modal-overlay").addEventListener("click", (e) => {
      if (e.target === document.getElementById("modal-overlay")) closeModal();
    });
    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
    document.getElementById("modal-cancel-btn").addEventListener("click", closeModal);
    document.getElementById("modal-submit-btn").addEventListener("click", handleModalSubmit);
  }
  function renderSidebar() {
    const list = document.getElementById("workspace-list");
    const filtered = workspaces.filter(
      (ws) => ws.name.toLowerCase().includes(searchQuery)
    );
    if (filtered.length === 0) {
      list.innerHTML = `<p class="sidebar-empty">${searchQuery ? "No workspaces found" : "No workspaces yet"}</p>`;
      return;
    }
    list.innerHTML = filtered.map((ws) => `
    <div class="workspace-item ${ws.id === activeWorkspaceId ? "active" : ""}" data-id="${ws.id}">
      <span class="ws-icon">&#128193;</span>
      <span class="ws-name">${escapeHtml(ws.name)}</span>
    </div>
  `).join("");
    list.querySelectorAll(".workspace-item").forEach((item) => {
      item.addEventListener("click", () => selectWorkspace(item.dataset.id));
    });
  }
  function selectWorkspace(id) {
    activeWorkspaceId = id;
    renderSidebar();
    document.getElementById("empty-state").classList.add("hidden");
    document.getElementById("workspace-view").classList.remove("hidden");
    renderMain();
  }
  function showEmptyState() {
    document.getElementById("empty-state").classList.remove("hidden");
    document.getElementById("workspace-view").classList.add("hidden");
  }
  function renderMain() {
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!ws) return;
    document.getElementById("workspace-title").textContent = ws.name;
    if (viewMode === "kanban") {
      document.getElementById("kanban-view").classList.remove("hidden");
      document.getElementById("list-view").classList.add("hidden");
      renderKanban();
    } else {
      document.getElementById("list-view").classList.remove("hidden");
      document.getElementById("kanban-view").classList.add("hidden");
      renderList();
    }
  }
  function renderKanban() {
    const wsTasks = tasks.filter((t) => t.workspaceId === activeWorkspaceId);
    const columns = [
      { status: "pending", label: "To Do", color: "#f59e0b" },
      { status: "in-progress", label: "In Progress", color: "#3b82f6" },
      { status: "done", label: "Done", color: "#10b981" }
    ];
    const kanban = document.getElementById("kanban-view");
    kanban.innerHTML = columns.map((col) => {
      const colTasks = wsTasks.filter((t) => t.status === col.status);
      return `
      <div class="kanban-column">
        <div class="kanban-column-header" style="color:${col.color}">
          ${col.label}
          <span class="column-count">${colTasks.length}</span>
        </div>
        <div class="kanban-cards">
          ${colTasks.length === 0 ? '<p class="column-empty">No tasks here</p>' : colTasks.map(renderTaskCard).join("")}
        </div>
      </div>
    `;
    }).join("");
    attachTaskEvents(kanban);
  }
  function renderTaskCard(task) {
    return `
    <div class="task-card">
      <div class="task-card-title">${escapeHtml(task.title)}</div>
      ${task.description ? `<div class="task-card-desc">${escapeHtml(task.description)}</div>` : ""}
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
  function renderList() {
    const wsTasks = tasks.filter((t) => t.workspaceId === activeWorkspaceId);
    const listView = document.getElementById("list-view");
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
        ${wsTasks.map((task) => `
          <tr>
            <td class="task-title-cell">${escapeHtml(task.title)}</td>
            <td class="task-desc-cell">${task.description ? escapeHtml(task.description) : "&mdash;"}</td>
            <td><span class="badge badge-${task.status}">${statusLabel(task.status)}</span></td>
            <td>
              <div class="task-actions-cell">
                <button class="btn-icon btn-edit-task" data-id="${task.id}" title="Edit">&#9998;</button>
                <button class="btn-icon btn-delete btn-delete-task" data-id="${task.id}" title="Delete">&#128465;</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
    attachTaskEvents(listView);
  }
  function attachTaskEvents(container) {
    container.querySelectorAll(".btn-edit-task").forEach((btn) => {
      btn.addEventListener("click", () => openTaskModal(btn.dataset.id));
    });
    container.querySelectorAll(".btn-delete-task").forEach((btn) => {
      btn.addEventListener("click", () => deleteTask(btn.dataset.id));
    });
  }
  function deleteTask(id) {
    const task = tasks.find((t) => t.id === id);
    if (!task || !confirm(`Delete task "${task.title}"?`)) return;
    tasks = tasks.filter((t) => t.id !== id);
    saveTasks(tasks);
    renderMain();
  }
  function handleDeleteWorkspace() {
    if (!activeWorkspaceId) return;
    const ws = workspaces.find((w) => w.id === activeWorkspaceId);
    if (!ws || !confirm(`Delete workspace "${ws.name}" and all its tasks?`)) return;
    workspaces = workspaces.filter((w) => w.id !== activeWorkspaceId);
    tasks = tasks.filter((t) => t.workspaceId !== activeWorkspaceId);
    saveWorkspaces(workspaces);
    saveTasks(tasks);
    activeWorkspaceId = null;
    renderSidebar();
    showEmptyState();
  }
  function openWorkspaceModal() {
    editingTaskId = null;
    document.getElementById("modal-title").textContent = "New Workspace";
    document.getElementById("modal-task-fields").classList.add("hidden");
    document.getElementById("modal-workspace-fields").classList.remove("hidden");
    document.getElementById("workspace-name-input").value = "";
    document.getElementById("modal-submit-btn").textContent = "Create";
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("workspace-name-input").focus();
  }
  function openTaskModal(taskId) {
    document.getElementById("modal-task-fields").classList.remove("hidden");
    document.getElementById("modal-workspace-fields").classList.add("hidden");
    if (taskId) {
      editingTaskId = taskId;
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      document.getElementById("modal-title").textContent = "Edit Task";
      document.getElementById("task-title-input").value = task.title;
      document.getElementById("task-desc-input").value = task.description;
      document.getElementById("task-status-select").value = task.status;
      document.getElementById("modal-submit-btn").textContent = "Save";
    } else {
      editingTaskId = null;
      document.getElementById("modal-title").textContent = "New Task";
      document.getElementById("task-title-input").value = "";
      document.getElementById("task-desc-input").value = "";
      document.getElementById("task-status-select").value = "pending";
      document.getElementById("modal-submit-btn").textContent = "Create";
    }
    document.getElementById("modal-overlay").classList.remove("hidden");
    document.getElementById("task-title-input").focus();
  }
  function closeModal() {
    document.getElementById("modal-overlay").classList.add("hidden");
    editingTaskId = null;
  }
  function handleModalSubmit() {
    const isTask = !document.getElementById("modal-task-fields").classList.contains("hidden");
    if (!isTask) {
      const name = document.getElementById("workspace-name-input").value.trim();
      if (!name) {
        document.getElementById("workspace-name-input").focus();
        return;
      }
      const ws = { id: generateId(), name, createdAt: Date.now() };
      workspaces.push(ws);
      saveWorkspaces(workspaces);
      closeModal();
      renderSidebar();
      selectWorkspace(ws.id);
    } else {
      const title = document.getElementById("task-title-input").value.trim();
      if (!title) {
        document.getElementById("task-title-input").focus();
        return;
      }
      const description = document.getElementById("task-desc-input").value.trim();
      const status = document.getElementById("task-status-select").value;
      if (editingTaskId) {
        const idx = tasks.findIndex((t) => t.id === editingTaskId);
        if (idx !== -1) tasks[idx] = { ...tasks[idx], title, description, status };
      } else {
        tasks.push({ id: generateId(), workspaceId: activeWorkspaceId, title, description, status, createdAt: Date.now() });
      }
      saveTasks(tasks);
      closeModal();
      renderMain();
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();
