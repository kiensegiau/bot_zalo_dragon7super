export type GetBizAccountResponse = {
    biz?: {
        desc: string;
        cate: number;
        addr: string;
        website: string;
        email: string;
    };
    setting_start_page?: {
        enable_biz_label: number;
        enable_cate: number;
        enable_add: number;
        cta_profile: number;
        cta_catalog: any;
    };
    pkgId: number;
};
export declare const getBizAccountFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => (friendId: string) => Promise<GetBizAccountResponse>;
