/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { DEFAULT_APP_CATEGORIES, IBasePath } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { observabilityPaths, sloFeatureId } from '@kbn/observability-plugin/common';
import { sloHealthParamsSchema } from '@kbn/response-ops-rule-params/slo_health';
import { SLO_HEALTH_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { SLO_HEALTH_AAD_FIELDS } from '../../../../common/field_names/slo';
import { getExecutor } from './executor';
import { ruleFieldMap } from './field_map';
import { ALERT_ACTION } from './types';

export const RULE_REGISTRATION_CONTEXT = 'observability.slo.health';

export function sloHealthRuleType(basePath: IBasePath) {
  return {
    id: SLO_HEALTH_RULE_TYPE_ID,
    name: i18n.translate('xpack.slo.rules.health.name', {
      defaultMessage: 'SLO health',
    }),
    fieldsForAAD: SLO_HEALTH_AAD_FIELDS,
    validate: {
      params: sloHealthParamsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema' as const,
        schema: sloHealthParamsSchema,
      },
    },
    defaultActionGroupId: ALERT_ACTION.id,
    actionGroups: [ALERT_ACTION],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: sloFeatureId,
    minimumLicenseRequired: 'platinum' as LicenseType,
    isExportable: true,
    executor: getExecutor(basePath),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'viewInAppUrl', description: viewInAppUrlActionVariableDescription },
        { name: 'alertDetailsUrl', description: alertDetailsUrlActionVariableDescription },
        { name: 'sloId', description: sloIdActionVariableDescription },
        { name: 'sloName', description: sloNameActionVariableDescription },
      ],
    },
    alerts: {
      context: RULE_REGISTRATION_CONTEXT,
      mappings: { fieldMap: { ...legacyExperimentalFieldMap, ...ruleFieldMap } },
      useEcs: true,
      useLegacyAlerts: true,
      shouldWrite: true,
    },
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  };
}

export const reasonActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.reasonDescription',
  { defaultMessage: 'A concise description of the reason for the alert' }
);
export const timestampActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.timestampDescription',
  { defaultMessage: 'A timestamp of when the alert was detected.' }
);

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.viewInAppUrlDescription',
  { defaultMessage: 'The url to the SLO details page to help with further investigation.' }
);

export const alertDetailsUrlActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.alertDetailsUrlDescription',
  {
    defaultMessage:
      'Link to the alert troubleshooting view for further context and details. This will be an empty string if the server.publicBaseUrl is not configured.',
  }
);

export const sloIdActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloIdDescription',
  { defaultMessage: 'The SLO unique identifier.' }
);

export const sloNameActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloNameDescription',
  { defaultMessage: 'The SLO name.' }
);
