import type { Rule } from '@kbn/alerts-ui-shared';
import type { SyntheticsMonitorStatusRuleParams } from '@kbn/response-ops-rule-params/synthetics_monitor_status';
/**
 *
 * @param params from a Synthetics Monitor Status Alert
 * @returns KQL query string
 */
export declare function syntheticsMonitorStatusAlertParamsToKqlQuery(params: SyntheticsMonitorStatusRuleParams): string;
export declare const getSyntheticsStatusRuleData: ({ rule }: {
    rule: Rule;
}) => {
    discoverAppLocatorParams: {
        query: {
            language: string;
            query: string;
        };
        dataViewSpec: import("@kbn/data-views-plugin/common").DataViewSpec;
    };
};
