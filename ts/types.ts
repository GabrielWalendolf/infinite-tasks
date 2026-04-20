export type TaskStatus = 'pending' | 'in-progress' | 'done';

export interface Task {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: TaskStatus;
  createdAt: number;
}

export interface WorkSpace {
  id: string;
  name: string;
  createdAt: number;
}
