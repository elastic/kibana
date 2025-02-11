/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import { i18n } from '@kbn/i18n';
import { IRuleTypeAlerts, GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { EsQueryRuleParamsExtractedParams } from '@kbn/stack-alerts-plugin/server/rule_types/es_query/rule_type_params';
import { customThresholdParamsSchema } from '@kbn/response-ops-rule-params/custom_threshold';
import { observabilityFeatureId, observabilityPaths } from '../../../../common';
import { THRESHOLD_RULE_REGISTRATION_CONTEXT } from '../../../common/constants';
import {
  alertDetailUrlActionVariableDescription,
  cloudActionVariableDescription,
  containerActionVariableDescription,
  groupByKeysActionVariableDescription,
  hostActionVariableDescription,
  labelsActionVariableDescription,
  orchestratorActionVariableDescription,
  reasonActionVariableDescription,
  tagsActionVariableDescription,
  timestampActionVariableDescription,
  valueActionVariableDescription,
  viewInAppUrlActionVariableDescription,
} from './translations';
import {
  createCustomThresholdExecutor,
  CustomThresholdLocators,
} from './custom_threshold_executor';
import { CUSTOM_THRESHOLD_AAD_FIELDS, FIRED_ACTION, NO_DATA_ACTION } from './constants';
import { ObservabilityConfig } from '../../..';
import { CustomThresholdAlert } from './types';

export const MetricsRulesTypeAlertDefinition: IRuleTypeAlerts<CustomThresholdAlert> = {
  context: THRESHOLD_RULE_REGISTRATION_CONTEXT,
  mappings: { fieldMap: legacyExperimentalFieldMap },
  useEcs: true,
  useLegacyAlerts: false,
  shouldWrite: true,
};

export function thresholdRuleType(
  basePath: IBasePath,
  config: ObservabilityConfig,
  logger: Logger,
  locators: CustomThresholdLocators
) {
  return {
    id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    name: i18n.translate('xpack.observability.threshold.ruleName', {
      defaultMessage: 'Custom threshold',
    }),
    fieldsForAAD: CUSTOM_THRESHOLD_AAD_FIELDS,
    validate: {
      params: customThresholdParamsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema' as const,
        schema: customThresholdParamsSchema,
      },
    },
    defaultActionGroupId: FIRED_ACTION.id,
    actionGroups: [FIRED_ACTION, NO_DATA_ACTION],
    minimumLicenseRequired: 'basic' as LicenseType,
    isExportable: true,
    executor: createCustomThresholdExecutor({ basePath, logger, config, locators }),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'group', description: groupByKeysActionVariableDescription },
        {
          name: 'alertDetailsUrl',
          description: alertDetailUrlActionVariableDescription,
          usesPublicBaseUrl: true,
        },
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'value', description: valueActionVariableDescription },
        { name: 'cloud', description: cloudActionVariableDescription },
        { name: 'host', description: hostActionVariableDescription },
        { name: 'container', description: containerActionVariableDescription },
        { name: 'orchestrator', description: orchestratorActionVariableDescription },
        { name: 'labels', description: labelsActionVariableDescription },
        { name: 'tags', description: tagsActionVariableDescription },
        { name: 'viewInAppUrl', description: viewInAppUrlActionVariableDescription },
      ],
    },
    useSavedObjectReferences: {
      // TODO revisit types https://github.com/elastic/kibana/issues/159714
      extractReferences: (params: any) => {
        const [searchConfiguration, references] = extractReferences(params.searchConfiguration);
        const newParams = { ...params, searchConfiguration } as EsQueryRuleParamsExtractedParams;

        return { params: newParams, references };
      },
      injectReferences: (params: any, references: any) => {
        return {
          ...params,
          searchConfiguration: injectReferences(params.searchConfiguration, references),
        };
      },
    },
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: observabilityFeatureId,
    alerts: MetricsRulesTypeAlertDefinition,
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  };
}
