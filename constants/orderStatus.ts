import type { OrderStatus } from '@/types/app';

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  ready: 'Ready',
  completed: 'Completed',
  canceled: 'Canceled',
};