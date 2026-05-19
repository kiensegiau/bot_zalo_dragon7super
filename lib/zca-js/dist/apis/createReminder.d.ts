import { ReminderRepeatMode, ThreadType } from "../models/index.js";
import { ReminderGroup, ReminderUser } from "../models/Reminder.js";
export type CreateReminderOptions = {
    title: string;
    emoji?: string;
    startTime?: number;
    repeat?: ReminderRepeatMode;
};
export type CreateReminderResponse = ReminderUser | ReminderGroup;
export declare const createReminderFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (options: CreateReminderOptions, threadId: string, type?: ThreadType) => Promise<CreateReminderResponse>;
