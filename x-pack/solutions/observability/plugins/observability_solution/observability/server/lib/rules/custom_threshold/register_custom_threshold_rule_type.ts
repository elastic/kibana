/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { schema } from '@kbn/config-schema';
import { extractReferences, injectReferences } from '@kbn/data-plugin/common';
import { dataViewSpecSchema } from '@kbn/data-views-plugin/server/rest_api_routes/schema';
import { i18n } from '@kbn/i18n';
import { IRuleTypeAlerts, GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { IBasePath, Logger } from '@kbn/core/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { OBSERVABILITY_THRESHOLD_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { COMPARATORS } from '@kbn/alerting-comparators';
import { EsQueryRuleParamsExtractedParams } from '@kbn/stack-alerts-plugin/server/rule_types/es_query/rule_type_params';
import { LEGACY_COMPARATORS } from '../../../../common/utils/convert_legacy_outside_comparator';
import { observabilityFeatureId, observabilityPaths } from '../../../../common';
import { Aggregators } from '../../../../common/custom_threshold_rule/types';
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
import { oneOfLiterals, validateKQLStringFilter } from './utils';
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

export const searchConfigurationSchema = schema.object({
  index: schema.oneOf([schema.string(), dataViewSpecSchema]),
  query: schema.object({
    language: schema.string(),
    query: schema.string({
      validate: validateKQLStringFilter,
    }),
  }),
  filter: schema.maybe(
    schema.arrayOf(
      schema.object({
        query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
        meta: schema.recordOf(schema.string(), schema.any()),
      })
    )
  ),
});

export function thresholdRuleType(
  basePath: IBasePath,
  config: ObservabilityConfig,
  logger: Logger,
  locators: CustomThresholdLocators
) {
  const comparators = Object.values({ ...COMPARATORS, ...LEGACY_COMPARATORS });
  const baseCriterion = {
    threshold: schema.arrayOf(schema.number()),
    comparator: oneOfLiterals(comparators),
    timeUnit: schema.string(),
    timeSize: schema.number(),
  };
  const allowedAggregators = Object.values(Aggregators);
  allowedAggregators.splice(Object.values(Aggregators).indexOf(Aggregators.COUNT), 1);

  const customCriterion = schema.object({
    ...baseCriterion,
    aggType: schema.maybe(schema.literal('custom')),
    metric: schema.never(),
    metrics: schema.arrayOf(
      schema.oneOf([
        schema.object({
          name: schema.string(),
          aggType: oneOfLiterals(allowedAggregators),
          field: schema.string(),
          filter: schema.never(),
        }),
        schema.object({
          name: schema.string(),
          aggType: schema.literal('count'),
          filter: schema.maybe(
            schema.string({
              validate: validateKQLStringFilter,
            })
          ),
          field: schema.never(),
        }),
      ])
    ),
    equation: schema.maybe(schema.string()),
    label: schema.maybe(schema.string()),
  });

  const paramsSchema = schema.object(
    {
      criteria: schema.arrayOf(customCriterion),
      groupBy: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
      alertOnNoData: schema.maybe(schema.boolean()),
      alertOnGroupDisappear: schema.maybe(schema.boolean()),
      searchConfiguration: searchConfigurationSchema,
    },
    { unknowns: 'allow' }
  );

  return {
    id: OBSERVABILITY_THRESHOLD_RULE_TYPE_ID,
    name: i18n.translate('xpack.observability.threshold.ruleName', {
      defaultMessage: 'Custom threshold',
    }),
    fieldsForAAD: CUSTOM_THRESHOLD_AAD_FIELDS,
    validate: {
      params: paramsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema' as const,
        schema: paramsSchema,
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
