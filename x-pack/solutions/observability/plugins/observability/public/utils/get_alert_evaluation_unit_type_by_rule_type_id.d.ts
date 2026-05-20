export declare const ALERT_EVALUATION_UNIT_TYPE: {
    readonly DURATION: "DURATION";
    readonly PERCENT: "PERCENT";
    readonly ERROR_COUNT: "ERROR_COUNT";
    readonly NUMBER: "NUMBER";
};
type ObjectValues<T> = T[keyof T];
type AlertEvaluationUnitType = ObjectValues<typeof ALERT_EVALUATION_UNIT_TYPE>;
export declare const getAlertEvaluationUnitTypeByRuleTypeId: (ruleTypeId: string) => AlertEvaluationUnitType;
export {};
