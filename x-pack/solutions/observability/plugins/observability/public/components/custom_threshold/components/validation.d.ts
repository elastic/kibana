import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { ValidationResult } from '@kbn/triggers-actions-ui-plugin/public';
import type { CustomMetricExpressionParams, CustomThresholdSearchSourceFields } from '../../../../common/custom_threshold_rule/types';
export declare const EQUATION_REGEX: RegExp;
export declare function validateCustomThreshold({ criteria, searchConfiguration, uiSettings, }: {
    criteria: CustomMetricExpressionParams[];
    searchConfiguration: CustomThresholdSearchSourceFields;
    uiSettings: IUiSettingsClient;
}): ValidationResult;
