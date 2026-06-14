import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  companyName: text('company_name').notNull(),
});

export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  eventDate: text('event_date').notNull(),
  userId: text('user_id').notNull().references(() => users.id),
  currentOffsetSeconds: integer('current_offset_seconds').notNull().default(0),
  currentRundownIndex: integer('current_rundown_index').notNull().default(-1),
  timerStatus: text('timer_status').notNull().default('stopped'), // 'running', 'paused', 'stopped'
  timerStartTime: integer('timer_start_time'), // unix timestamp in ms
  timerElapsedSeconds: integer('timer_elapsed_seconds').notNull().default(0),
});

export const roleTokens = sqliteTable('role_tokens', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  role: text('role').notNull(), // 'MC', 'Catering', 'MUA', 'All'
});

export const rundownItems = sqliteTable('rundown_items', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  targetRole: text('target_role').notNull(), // 'All', 'MC', 'Catering', 'MUA', 'Dokumentasi'
  orderIndex: integer('order_index').notNull(),
});

export const prompterMessages = sqliteTable('prompter_messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  targetRole: text('target_role').notNull(), // 'All', 'MC', 'Catering', 'MUA'
  message: text('message').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const activityLogs = sqliteTable('activity_logs', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  actionType: text('action_type').notNull(), // 'timer', 'offset', 'prompter', 'rundown'
  description: text('description').notNull(),
  createdAt: integer('created_at').notNull(),
});

