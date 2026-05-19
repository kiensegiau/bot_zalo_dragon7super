import { ThreadType } from "../models/index.js";
import { ReminderGroup, ReminderUser } from "../models/Reminder.js";
export type ListReminderOptions = {
    page?: number;
    count?: number;
};
export type ReminderListUser = ReminderUser;
export type ReminderListGroup = ReminderGroup & {
    groupId: string;
    eventType: number;
    responseMem: {
        rejectMember: number;
        myResp: number;
        acceptMember: number;
    };
    repeatInfo: {
        list_ts: any[];
    };
    repeatData: any[];
};
export type GetListReminderResponse = (ReminderListUser & ReminderListGroup)[];
export declare const getListReminderFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (options: ListReminderOptions, threadId: string, type?: ThreadType) => Promise<GetListReminderResponse>;
