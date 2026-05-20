import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TopAlert } from '../../../../../typings/alerts';
type ApmErrorCountRuleDataResult = {
    discoverAppLocatorParams: DiscoverAppLocatorParams & {
        query: {
            query: string;
            language: 'kuery';
        };
    };
} | null;
export declare const getApmErrorCountRuleData: ({ alert, rule, }: {
    alert: TopAlert;
    rule: Rule;
}) => ApmErrorCountRuleDataResult;
export declare const getApmErrorCountRuleDataOrEmpty: ({ alert, rule }: {
    alert: TopAlert;
    rule: Rule;
}) => {};
export {};
