import type { QuickMessage } from "../models/QuickMessage.js";
export type AddQuickMessagePayload = {
    keyword: string;
    title: string;
};
export type AddQuickMessageResponse = {
    items: QuickMessage[];
    version: number;
};
export declare const addQuickMessageFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (addPayload: AddQuickMessagePayload) => Promise<AddQuickMessageResponse>;
