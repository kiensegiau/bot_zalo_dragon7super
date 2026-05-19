export type QuickMessageMediaItem = {
    type: number;
    photoId: number;
    title: string;
    width: number;
    height: number;
    previewThumb: string;
    rawUrl: string;
    thumbUrl: string;
    normalUrl: string;
    hdUrl: string;
};
export type GetQuickMessageResponse = {
    cursor: number;
    version: number;
    items: {
        id: number;
        keyword: string;
        type: number;
        createdTime: number;
        lastModified: number;
        message: {
            title: string;
            params: string | null;
        };
        media: {
            items: QuickMessageMediaItem[];
        } | null;
    }[];
};
export declare const getQuickMessageFactory: (ctx: import("../context.js").ContextBase, api: import("../zalo.js").API) => () => Promise<GetQuickMessageResponse>;
