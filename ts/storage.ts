import { Task, WorkSpace } from './types';

const WORKSPACES_KEY = 'infinite_tasks_workspaces';
const TASKS_KEY = 'infinite_tasks_tasks';

export function loadWorkspaces(): WorkSpace[] {
  const raw = localStorage.getItem(WORKSPACES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveWorkspaces(workspaces: WorkSpace[]): void {
  localStorage.setItem(WORKSPACES_KEY, JSON.stringify(workspaces));
}

export function loadTasks(): Task[] {
  const raw = localStorage.getItem(TASKS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}
