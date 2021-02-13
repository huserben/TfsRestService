"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneralFunctions = void 0;
class GeneralFunctions {
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    trimValues(values) {
        var returnValue = [];
        if (values != null) {
            values.forEach(value => {
                returnValue.push(this.trimValue(value));
            });
        }
        return returnValue;
    }
    trimValue(value) {
        if (value !== null && value !== undefined) {
            return value.trim();
        }
        return value;
    }
}
exports.GeneralFunctions = GeneralFunctions;
