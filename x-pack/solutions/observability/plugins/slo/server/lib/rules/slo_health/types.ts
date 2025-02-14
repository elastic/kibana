/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  ActionGroupIdsOf,
  AlertInstanceContext as AlertContext,
  AlertInstanceState as AlertState,
} from '@kbn/alerting-plugin/common';
import { RuleTypeState } from '@kbn/alerting-plugin/server';
import { ObservabilitySloHealthAlert } from '@kbn/alerts-as-data-utils';
import { i18n } from '@kbn/i18n';
import { TypeOf } from '@kbn/config-schema';
import { sloHealthParamsSchema } from '@kbn/response-ops-rule-params/slo_health';

export enum AlertStates {
  OK,
  ALERT,
}

export const ALERT_ACTION_ID = 'slo.health.alert';
export const ALERT_ACTION = {
  id: ALERT_ACTION_ID,
  name: i18n.translate('xpack.slo.alerting.health.alertAction', {
    defaultMessage: 'Alert',
  }),
  severity: { level: 2 },
};

export type HealthRuleParams = TypeOf<typeof sloHealthParamsSchema>;
export type HealthRuleTypeState = RuleTypeState; // no specific rule state
export type HealthAlertState = AlertState; // no specific alert state
export type HealthAlertContext = AlertContext; // no specific alert context
export type HealthAllowedActionGroups = ActionGroupIdsOf<typeof ALERT_ACTION>;
export type HealthAlertData = ObservabilitySloHealthAlert;
