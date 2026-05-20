import type { RulesClientApi } from '@kbn/alerting-plugin/server/types';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { AlertData } from './alert_data';
export declare class InvestigateAlertsClient {
    private alertsClient;
    private rulesClient;
    constructor(alertsClient: AlertsClient, rulesClient: RulesClientApi);
    getAlertById(alertId: string): Promise<AlertData>;
    getRuleById(ruleId: string): Promise<import("@kbn/alerting-types/rule_types").SanitizedRule<never> | import("@kbn/alerting-plugin/server/types").SanitizedRuleWithLegacyId<never>>;
    getAlertsIndices(): Promise<string[] | undefined>;
}
