/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TableId } from '@kbn/securitysolution-data-table';
import { ALERTS_TABLE_REGISTRY_CONFIG_IDS } from '../../../../common/constants';
import { getAlertConfigIdByScopeId } from './alert_table_scope_config';

describe('getAlertConfigIdByScopeId', () => {
  it('should return an alert configuration ID when the scope is valid', async () => {
    expect(getAlertConfigIdByScopeId(TableId.alertsOnAlertsPage)).toEqual(
      ALERTS_TABLE_REGISTRY_CONFIG_IDS.ALERTS_PAGE
    );
    expect(getAlertConfigIdByScopeId(TableId.alertsOnRuleDetailsPage)).toEqual(
      ALERTS_TABLE_REGISTRY_CONFIG_IDS.RULE_DETAILS
    );
    expect(getAlertConfigIdByScopeId(TableId.alertsOnCasePage)).toEqual(
      ALERTS_TABLE_REGISTRY_CONFIG_IDS.CASE
    );
    expect(getAlertConfigIdByScopeId(TableId.alertsRiskInputs)).toEqual(
      ALERTS_TABLE_REGISTRY_CONFIG_IDS.RISK_INPUTS
    );
  });

  it('should return undefined when the scope is NOT valid', async () => {
    expect(getAlertConfigIdByScopeId(TableId.test)).toEqual(undefined);
    expect(getAlertConfigIdByScopeId('hereWeGo')).toEqual(undefined);
  });
});
