'use strict';

exports.ThreadType = void 0;
(function (ThreadType) {
    ThreadType[ThreadType["User"] = 0] = "User";
    ThreadType[ThreadType["Group"] = 1] = "Group";
})(exports.ThreadType || (exports.ThreadType = {}));
exports.DestType = void 0;
(function (DestType) {
    DestType[DestType["User"] = 3] = "User";
    DestType[DestType["Page"] = 5] = "Page";
})(exports.DestType || (exports.DestType = {}));
exports.ReminderRepeatMode = void 0;
(function (ReminderRepeatMode) {
    ReminderRepeatMode[ReminderRepeatMode["None"] = 0] = "None";
    ReminderRepeatMode[ReminderRepeatMode["Daily"] = 1] = "Daily";
    ReminderRepeatMode[ReminderRepeatMode["Weekly"] = 2] = "Weekly";
    ReminderRepeatMode[ReminderRepeatMode["Monthly"] = 3] = "Monthly";
})(exports.ReminderRepeatMode || (exports.ReminderRepeatMode = {}));
exports.Gender = void 0;
(function (Gender) {
    Gender[Gender["Male"] = 0] = "Male";
    Gender[Gender["Female"] = 1] = "Female";
})(exports.Gender || (exports.Gender = {}));
exports.BoardType = void 0;
(function (BoardType) {
    BoardType[BoardType["Note"] = 1] = "Note";
    BoardType[BoardType["PinnedMessage"] = 2] = "PinnedMessage";
    BoardType[BoardType["Poll"] = 3] = "Poll";
})(exports.BoardType || (exports.BoardType = {}));
