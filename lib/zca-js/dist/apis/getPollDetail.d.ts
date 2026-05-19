import { PollDetail } from "../models/Board.js";
export type PollDetailResponse = PollDetail;
export declare const getPollDetailFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (pollId: string) => Promise<PollDetail>;
