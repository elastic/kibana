import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
export declare class AlertData {
    private alert;
    constructor(alert: Awaited<ReturnType<AlertsClient['get']>>);
    getRuleParameters(): {
        [key: string]: unknown;
    } | undefined;
    getRuleId(): string | undefined;
    getRelevantRuleFields(): Set<string>;
    getRelevantAADFields(): string[];
    getAllRelevantFields(): string[];
    getAlertTags(): string[];
    getRuleQueryIndex(): string | null;
    getRuleTypeId(): string | undefined;
}
