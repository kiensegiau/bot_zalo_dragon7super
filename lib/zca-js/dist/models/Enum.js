export var ThreadType;
(function (ThreadType) {
    ThreadType[ThreadType["User"] = 0] = "User";
    ThreadType[ThreadType["Group"] = 1] = "Group";
})(ThreadType || (ThreadType = {}));
export var DestType;
(function (DestType) {
    DestType[DestType["User"] = 3] = "User";
    DestType[DestType["Page"] = 5] = "Page";
})(DestType || (DestType = {}));
export var ReminderRepeatMode;
(function (ReminderRepeatMode) {
    ReminderRepeatMode[ReminderRepeatMode["None"] = 0] = "None";
    ReminderRepeatMode[ReminderRepeatMode["Daily"] = 1] = "Daily";
    ReminderRepeatMode[ReminderRepeatMode["Weekly"] = 2] = "Weekly";
    ReminderRepeatMode[ReminderRepeatMode["Monthly"] = 3] = "Monthly";
})(ReminderRepeatMode || (ReminderRepeatMode = {}));
export var Gender;
(function (Gender) {
    Gender[Gender["Male"] = 0] = "Male";
    Gender[Gender["Female"] = 1] = "Female";
})(Gender || (Gender = {}));
export var BoardType;
(function (BoardType) {
    BoardType[BoardType["Note"] = 1] = "Note";
    BoardType[BoardType["PinnedMessage"] = 2] = "PinnedMessage";
    BoardType[BoardType["Poll"] = 3] = "Poll";
})(BoardType || (BoardType = {}));
