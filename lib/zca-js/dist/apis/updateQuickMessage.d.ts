import type { QuickMessage } from "../models/QuickMessage.js";
export type UpdateQuickMessagePayload = {
    keyword: string;
    title: string;
};
export type UpdateQuickMessageResponse = {
    items: QuickMessage[];
    version: number;
};
export declare const updateQuickMessageFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (updatePayload: UpdateQuickMessagePayload, itemId: number) => Promise<UpdateQuickMessageResponse>;
