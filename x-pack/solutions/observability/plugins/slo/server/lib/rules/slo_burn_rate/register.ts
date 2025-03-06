/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { GetViewInAppRelativeUrlFnOpts } from '@kbn/alerting-plugin/server';
import { i18n } from '@kbn/i18n';
import { LicenseType } from '@kbn/licensing-plugin/server';
import { legacyExperimentalFieldMap } from '@kbn/alerts-as-data-utils';
import { IBasePath } from '@kbn/core/server';
import { LocatorPublic } from '@kbn/share-plugin/common';
import { AlertsLocatorParams, observabilityPaths } from '@kbn/observability-plugin/common';
import { SLO_BURN_RATE_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { sloFeatureId } from '@kbn/observability-plugin/common';
import { sloBurnRateParamsSchema } from '@kbn/response-ops-rule-params/slo_burn_rate';
import { SLO_BURN_RATE_AAD_FIELDS } from '../../../../common/field_names/slo';
import { SLO_RULE_REGISTRATION_CONTEXT } from '../../../common/constants';

import {
  ALERT_ACTION,
  HIGH_PRIORITY_ACTION,
  LOW_PRIORITY_ACTION,
  MEDIUM_PRIORITY_ACTION,
  SUPPRESSED_PRIORITY_ACTION,
} from '../../../../common/constants';

import { getRuleExecutor } from './executor';
import { sloRuleFieldMap } from './field_map';

export function sloBurnRateRuleType(
  basePath: IBasePath,
  alertsLocator?: LocatorPublic<AlertsLocatorParams>
) {
  return {
    id: SLO_BURN_RATE_RULE_TYPE_ID,
    name: i18n.translate('xpack.slo.rules.burnRate.name', {
      defaultMessage: 'SLO burn rate',
    }),
    fieldsForAAD: SLO_BURN_RATE_AAD_FIELDS,
    validate: {
      params: sloBurnRateParamsSchema,
    },
    schemas: {
      params: {
        type: 'config-schema' as const,
        schema: sloBurnRateParamsSchema,
      },
    },
    defaultActionGroupId: ALERT_ACTION.id,
    actionGroups: [
      ALERT_ACTION,
      HIGH_PRIORITY_ACTION,
      MEDIUM_PRIORITY_ACTION,
      LOW_PRIORITY_ACTION,
      SUPPRESSED_PRIORITY_ACTION,
    ],
    category: DEFAULT_APP_CATEGORIES.observability.id,
    producer: sloFeatureId,
    minimumLicenseRequired: 'platinum' as LicenseType,
    isExportable: true,
    executor: getRuleExecutor(basePath),
    doesSetRecoveryContext: true,
    actionVariables: {
      context: [
        { name: 'reason', description: reasonActionVariableDescription },
        { name: 'timestamp', description: timestampActionVariableDescription },
        { name: 'burnRateThreshold', description: thresholdActionVariableDescription },
        { name: 'longWindow', description: windowActionVariableDescription },
        { name: 'shortWindow', description: windowActionVariableDescription },
        { name: 'viewInAppUrl', description: viewInAppUrlActionVariableDescription },
        { name: 'alertDetailsUrl', description: alertDetailsUrlActionVariableDescription },
        { name: 'sloId', description: sloIdActionVariableDescription },
        { name: 'sloName', description: sloNameActionVariableDescription },
        { name: 'sloInstanceId', description: sloInstanceIdActionVariableDescription },
        { name: 'suppressedAction', description: suppressedActionVariableDescription },
        { name: 'sliValue', description: sliValueActionVariableDescription },
        { name: 'sloStatus', description: sloStatusActionVariableDescription },
        {
          name: 'sloErrorBudgetRemaining',
          description: sloErrorBudgetRemainingActionVariableDescription,
        },
        {
          name: 'sloErrorBudgetConsumed',
          description: sloErrorBudgetConsumedActionVariableDescription,
        },
      ],
    },
    alerts: {
      context: SLO_RULE_REGISTRATION_CONTEXT,
      mappings: { fieldMap: { ...legacyExperimentalFieldMap, ...sloRuleFieldMap } },
      useEcs: true,
      useLegacyAlerts: true,
      shouldWrite: true,
    },
    getViewInAppRelativeUrl: ({ rule }: GetViewInAppRelativeUrlFnOpts<{}>) =>
      observabilityPaths.ruleDetails(rule.id),
  };
}

const thresholdActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.thresholdDescription',
  {
    defaultMessage: 'The burn rate threshold value.',
  }
);

const windowActionVariableDescription = i18n.translate('xpack.slo.alerting.windowDescription', {
  defaultMessage: 'The window duration with the associated burn rate value.',
});

export const reasonActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.reasonDescription',
  {
    defaultMessage: 'A concise description of the reason for the alert',
  }
);
export const timestampActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.timestampDescription',
  {
    defaultMessage: 'A timestamp of when the alert was detected.',
  }
);

export const viewInAppUrlActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.viewInAppUrlDescription',
  {
    defaultMessage: 'The url to the SLO details page to help with further investigation.',
  }
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
  {
    defaultMessage: 'The SLO unique identifier.',
  }
);

export const sloNameActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloNameDescription',
  {
    defaultMessage: 'The SLO name.',
  }
);

export const sloInstanceIdActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloInstanceIdDescription',
  {
    defaultMessage: 'The SLO instance id.',
  }
);

export const suppressedActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.suppressedActionDescription',
  {
    defaultMessage: 'The suppressed action group.',
  }
);

export const sliValueActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sliValueDescription',
  {
    defaultMessage: 'The SLI value at the time of firing the alert.',
  }
);

export const sloStatusActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloStatusDescription',
  {
    defaultMessage: 'The SLO status at the time of firing the alert.',
  }
);

export const sloErrorBudgetRemainingActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloErrorBudgetRemainingDescription',
  {
    defaultMessage: 'The remaining error budget at the time of firing the alert.',
  }
);

export const sloErrorBudgetConsumedActionVariableDescription = i18n.translate(
  'xpack.slo.alerting.sloErrorBudgetConsumedDescription',
  {
    defaultMessage: 'The consumed error budget at the time of firing the alert.',
  }
);
