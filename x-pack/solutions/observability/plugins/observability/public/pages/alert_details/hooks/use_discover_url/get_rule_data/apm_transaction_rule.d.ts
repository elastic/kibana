import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TopAlert } from '../../../../../typings/alerts';
type ApmTransactionRuleDataResult = {
    discoverAppLocatorParams: DiscoverAppLocatorParams & {
        query: {
            query: string;
            language: 'kuery';
        };
    };
} | null;
export declare const apmTransactionAlertFieldsToKqlQuery: (alert: TopAlert) => string;
export declare const getApmTransactionRuleData: ({ alert, rule, }: {
    alert: TopAlert;
    rule: Rule;
}) => ApmTransactionRuleDataResult;
export declare const getApmTransactionRuleDataOrEmpty: ({ alert, rule, }: {
    alert: TopAlert;
    rule: Rule;
}) => {};
export {};
