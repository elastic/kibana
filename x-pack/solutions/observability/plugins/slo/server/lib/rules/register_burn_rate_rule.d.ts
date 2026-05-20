import type { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import type { IBasePath, Logger } from '@kbn/core/server';
import type { IRuleDataService } from '@kbn/rule-registry-plugin/server';
import type { CustomThresholdLocators } from '@kbn/observability-plugin/server';
export declare function registerBurnRateRule(alertingPlugin: AlertingServerSetup, basePath: IBasePath, logger: Logger, ruleDataService: IRuleDataService, locators: CustomThresholdLocators): void;
