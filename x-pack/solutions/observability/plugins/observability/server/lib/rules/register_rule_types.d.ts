import type { CoreSetup } from '@kbn/core/server';
import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { IBasePath, Logger } from '@kbn/core/server';
import type { CustomThresholdLocators } from './custom_threshold/custom_threshold_executor';
import type { ObservabilityConfig } from '../..';
export declare function registerRuleTypes(alertingPlugin: AlertingServerSetup, core: CoreSetup, basePath: IBasePath, config: ObservabilityConfig, logger: Logger, locators: CustomThresholdLocators): void;
