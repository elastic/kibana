import type { LocatorPublic } from '@kbn/share-plugin/common';
import type { IBasePath, Logger } from '@kbn/core/server';
import type { RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import type { AlertsLocatorParams } from '../../../../common';
import type { ObservabilityConfig } from '../../..';
import type { CustomThresholdRuleTypeParams, CustomThresholdRuleTypeState, CustomThresholdAlertState, CustomThresholdAlertContext, CustomThresholdSpecificActionGroups, CustomThresholdAlert } from './types';
import type { MissingGroupsRecord } from './lib/check_missing_group';
export interface CustomThresholdLocators {
    alertsLocator?: LocatorPublic<AlertsLocatorParams>;
    logsLocator?: LocatorPublic<DiscoverAppLocatorParams>;
}
export declare const createCustomThresholdExecutor: ({ basePath, logger, config, locators: { logsLocator }, }: {
    basePath: IBasePath;
    logger: Logger;
    config: ObservabilityConfig;
    locators: CustomThresholdLocators;
}) => (options: RuleExecutorOptions<CustomThresholdRuleTypeParams, CustomThresholdRuleTypeState, CustomThresholdAlertState, CustomThresholdAlertContext, CustomThresholdSpecificActionGroups, CustomThresholdAlert>) => Promise<{
    state: {
        lastRunTimestamp: number;
        missingGroups: MissingGroupsRecord[];
        groupBy: string | string[] | undefined;
        searchConfiguration: import("../../../../common/custom_threshold_rule/types").SearchConfigurationWithExtractedReferenceType;
    };
}>;
