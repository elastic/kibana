/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../common/constants';

type PickKey<T, K extends keyof T> = Extract<keyof T, K>;
type KeysAlertTableId = PickKey<
  typeof TableId,
  'alertsOnAlertsPage' | 'alertsOnRuleDetailsPage' | 'alertsOnCasePage' | 'alertsRiskInputs'
>;

type ValuesAlertTableId = (typeof TableId)[KeysAlertTableId];

type KeysAlertTableConfiguration = keyof typeof ALERTS_TABLE_REGISTRY_CONFIG_IDS;
type ValuesAlertTableConfiguration =
  (typeof ALERTS_TABLE_REGISTRY_CONFIG_IDS)[KeysAlertTableConfiguration];

const ScopeIdLinkToAlertTableConfiguration: Record<
  ValuesAlertTableId,
  ValuesAlertTableConfiguration
> = {
  [TableId.alertsOnAlertsPage]: ALERTS_TABLE_REGISTRY_CONFIG_IDS.ALERTS_PAGE,
  [TableId.alertsOnRuleDetailsPage]: ALERTS_TABLE_REGISTRY_CONFIG_IDS.RULE_DETAILS,
  [TableId.alertsOnCasePage]: ALERTS_TABLE_REGISTRY_CONFIG_IDS.CASE,
  [TableId.alertsRiskInputs]: ALERTS_TABLE_REGISTRY_CONFIG_IDS.RISK_INPUTS,
};

export const getAlertConfigIdByScopeId = (scopeId: string) => {
  if (ScopeIdLinkToAlertTableConfiguration[scopeId as ValuesAlertTableId]) {
    return ScopeIdLinkToAlertTableConfiguration[scopeId as ValuesAlertTableId];
  }
  return undefined;
};
