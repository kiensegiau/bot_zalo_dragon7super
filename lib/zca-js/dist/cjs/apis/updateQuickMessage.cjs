'use strict';

var ZaloApiError = require('../Errors/ZaloApiError.cjs');
var utils = require('../utils.cjs');

const updateQuickMessageFactory = utils.apiFactory()((api, _ctx, utils) => {
    const serviceURL = utils.makeURL(`${api.zpwServiceMap.quick_message[0]}/api/quickmessage/update`);
    /**
     * Update quick message
     *
     * @param updatePayload - The payload containing data to update the quick message
     * @param itemId - The id of the quick message to update
     *
     * @note Zalo might throw an error with code 212 if the itemId does not exist.
     *
     * @throws ZaloApiError
     */
    return async function updateQuickMessage(updatePayload, itemId) {
        const params = {
            itemId: itemId,
            keyword: updatePayload.keyword,
            message: {
                title: updatePayload.title,
                params: "",
            },
            media: null,
            type: 0,
        };
        const encryptedParams = utils.encodeAES(JSON.stringify(params));
        if (!encryptedParams)
            throw new ZaloApiError.ZaloApiError("Failed to encrypt params");
        const response = await utils.request(utils.makeURL(serviceURL, { params: encryptedParams }), {
            method: "GET",
        });
        return utils.resolve(response);
    };
});

exports.updateQuickMessageFactory = updateQuickMessageFactory;
