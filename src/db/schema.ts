import { pgTable, text, integer, bigint } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  companyName: text('company_name').notNull(),
});

export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  eventDate: text('event_date').notNull(),
  rundownStartTime: text('rundown_start_time').notNull().default('08:00'),
  userId: text('user_id').notNull().references(() => users.id),
  currentOffsetSeconds: integer('current_offset_seconds').notNull().default(0),
  currentRundownIndex: integer('current_rundown_index').notNull().default(-1),
  timerStatus: text('timer_status').notNull().default('stopped'), // 'running', 'paused', 'stopped'
  timerStartTime: bigint('timer_start_time', { mode: 'number' }), // unix timestamp in ms
  timerElapsedSeconds: integer('timer_elapsed_seconds').notNull().default(0),
});

export const roleTokens = pgTable('role_tokens', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  role: text('role').notNull(), // 'MC', 'Catering', 'MUA', 'All'
});

export const rundownItems = pgTable('rundown_items', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  appliedOffsetSeconds: integer('applied_offset_seconds').notNull().default(0),
  targetRole: text('target_role').notNull(), // 'All', 'MC', 'Catering', 'MUA', 'Dokumentasi'
  targetPics: text('target_pics'), // Stores JSON array of PIC names e.g. '["MC", "MUA"]'
  orderIndex: integer('order_index').notNull(),
});

export const prompterMessages = pgTable('prompter_messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  targetRole: text('target_role').notNull(), // 'All', 'MC', 'Catering', 'MUA'
  message: text('message').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const activityLogs = pgTable('activity_logs', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'timer', 'offset', 'prompter', 'rundown'
  description: text('description').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  role: text('role').notNull(), // 'All', 'MC', 'Catering', 'MUA', 'Admin'
  endpoint: text('endpoint').notNull().unique(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  deviceInfo: text('device_info'),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});

export const pics = pgTable('pics', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: bigint('created_at', { mode: 'number' }).notNull(),
});
