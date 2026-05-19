import type { GroupSetting } from "../models/GroupEvent.js";
export type GroupInfoResponse = {
    removedsGroup: string[];
    unchangedsGroup: string[];
    gridInfoMap: {
        [groupId: string]: GroupInfo;
    };
};
export type GroupInfo = {
    groupId: string;
    name: string;
    desc: string;
    type: number;
    creatorId: string;
    version: string;
    avt: string;
    fullAvt: string;
    memberIds: any[];
    adminIds: string[];
    currentMems: any[];
    updateMems: any[];
    memVerList: string[];
    admins: any[];
    hasMoreMember: number;
    subType: number;
    totalMember: number;
    maxMember: number;
    setting: GroupSetting;
    createdTime: number;
    visibility: number;
    globalId: string;
    e2ee: number;
    pendingApprove: GroupInfoPendingApprove;
    extraInfo: GroupInfoExtra;
};
export type GroupInfoPendingApprove = {
    time: number;
    uids: null | string[];
};
export type GroupInfoExtra = {
    enable_media_store: number;
};
export declare const getGroupInfoFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (groupId: string | string[]) => Promise<GroupInfoResponse>;
