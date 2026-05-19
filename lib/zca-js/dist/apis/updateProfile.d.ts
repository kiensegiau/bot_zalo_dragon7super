import { Gender } from "../models/Enum.js";
export type ChangeAccountSettingResponse = "";
export declare const updateProfileFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (name: string, dob: `${string}-${string}-${string}`, gender: Gender) => Promise<"">;
