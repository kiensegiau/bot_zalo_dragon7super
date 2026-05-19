import { ReminderRepeatMode, ThreadType } from "../models/index.js";
import { ReminderGroup, ReminderUser } from "../models/Reminder.js";
export type EditReminderOptions = {
    title: string;
    topicId: string;
    emoji?: string;
    startTime?: number;
    repeat?: ReminderRepeatMode;
};
export type CreateReminderUser = ReminderUser;
export type CreateReminderGroup = ReminderGroup & {
    groupId: string;
    eventType: number;
    repeatInfo: null;
    repeatData: any[];
};
export type EditReminderResponse = CreateReminderUser | CreateReminderGroup;
export declare const editReminderFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (options: EditReminderOptions, threadId: string, type?: ThreadType) => Promise<EditReminderResponse>;
