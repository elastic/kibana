import type { ValidFeatureId } from '@kbn/rule-data-utils';
import type { RuleCreationValidConsumer } from '@kbn/triggers-actions-ui-plugin/public';
export declare const INVALID_EQUATION_REGEX: RegExp;
export declare const ALERT_STATUS_ALL = "all";
export declare const ALERTS_URL_STORAGE_KEY = "_a";
export declare const observabilityAlertFeatureIds: ValidFeatureId[];
export declare const observabilityRuleCreationValidConsumers: RuleCreationValidConsumer[];
export declare const EventsAsUnit = "events";
export declare enum ALERTS_API_URLS {
    INTERNAL_RELATED_DASHBOARDS = "/internal/observability/alerts/related_dashboards"
}
