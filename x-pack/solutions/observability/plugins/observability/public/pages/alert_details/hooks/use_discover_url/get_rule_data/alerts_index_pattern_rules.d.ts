import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { TopAlert } from '../../../../../typings/alerts';
export declare const getAlertsIndexPatternRuleData: ({ alert, rule }: {
    alert: TopAlert;
    rule: Rule;
}) => {
    discoverAppLocatorParams?: undefined;
} | {
    discoverAppLocatorParams: DiscoverAppLocatorParams;
};
