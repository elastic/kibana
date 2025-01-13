/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { createObservabilityRuleTypeRegistryMock } from '../../rules/observability_rule_type_registry_mock';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { render } from '../../utils/test_helper';
import { AlertsFlyout } from './alerts_flyout';
import {
  ALERT_DURATION,
  ALERT_END,
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_INSTANCE_ID,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  ALERT_WORKFLOW_STATUS,
  EVENT_ACTION,
  EVENT_KIND,
  SPACE_IDS,
  TIMESTAMP,
  VERSION,
} from '@kbn/rule-data-utils';
import { Alert } from '@kbn/alerting-types';

const mockUseKibanaReturnValue = kibanaStartMock.startContract();
jest.mock('../../utils/kibana_react', () => ({
  __esModule: true,
  useKibana: jest.fn(() => mockUseKibanaReturnValue),
}));

jest.mock('react-router-dom', () => ({
  useRouteMatch: jest.fn().mockReturnValue({}),
}));

describe('AlertsFlyout', () => {
  jest
    .spyOn(useUiSettingHook, 'useUiSetting')
    .mockImplementation(() => 'MMM D, YYYY @ HH:mm:ss.SSS');
  const observabilityRuleTypeRegistryMock = createObservabilityRuleTypeRegistryMock();

  it('should include a indicator for an active alert', async () => {
    const flyout = render(
      <AlertsFlyout
        alert={activeAlert}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistryMock}
        onClose={jest.fn()}
      />
    );

    expect(flyout.getByText('Active')).toBeInTheDocument();
  });

  it('should include a indicator for a recovered alert', async () => {
    const flyout = render(
      <AlertsFlyout
        alert={recoveredAlert}
        observabilityRuleTypeRegistry={observabilityRuleTypeRegistryMock}
        onClose={jest.fn()}
      />
    );

    expect(flyout.getByText('Recovered')).toBeInTheDocument();
  });
});

const activeAlert = {
  [ALERT_STATUS]: ['active'],
  [TIMESTAMP]: ['2021-09-02T13:08:51.750Z'],
  [ALERT_DURATION]: ['882076000'],
  [ALERT_REASON]: ['1957 log entries (more than 100.25) match the conditions.'],
  [ALERT_WORKFLOW_STATUS]: ['open'],
  [ALERT_RULE_UUID]: ['db2ab7c0-0bec-11ec-9ae2-5b10ca924404'],
  [ALERT_RULE_PRODUCER]: ['logs'],
  [ALERT_RULE_CONSUMER]: ['logs'],
  [ALERT_RULE_CATEGORY]: ['Log threshold'],
  [ALERT_RULE_REVISION]: ['0'],
  [ALERT_START]: ['2021-09-02T12:54:09.674Z'],
  [ALERT_RULE_TYPE_ID]: ['logs.alert.document.count'],
  [EVENT_ACTION]: ['active'],
  [ALERT_EVALUATION_VALUE]: ['1957'],
  [ALERT_INSTANCE_ID]: ['*'],
  [ALERT_RULE_NAME]: ['Log threshold (from logs)'],
  [ALERT_UUID]: ['756240e5-92fb-452f-b08e-cd3e0dc51738'],
  [SPACE_IDS]: ['default'],
  [VERSION]: ['8.0.0'],
  [EVENT_KIND]: ['signal'],
  [ALERT_EVALUATION_THRESHOLD]: ['100.25'],
  [ALERT_URL]: ['/app/logs/link-to/default/logs?time=1630587249674'],
} as unknown as Alert;

const recoveredAlert = {
  [ALERT_URL]: ['/app/metrics/inventory'],
  [ALERT_REASON]: ['CPU usage is greater than a threshold of 38 (current value is 38%)'],
  [ALERT_STATUS]: ['recovered'],
  [TIMESTAMP]: ['2021-09-02T13:08:45.729Z'],
  [ALERT_DURATION]: ['189030000'],
  [ALERT_WORKFLOW_STATUS]: ['open'],
  [ALERT_RULE_UUID]: ['92f112f0-0bed-11ec-9ae2-5b10ca924404'],
  [ALERT_RULE_PRODUCER]: ['infrastructure'],
  [ALERT_RULE_CONSUMER]: ['infrastructure'],
  [ALERT_RULE_CATEGORY]: ['Inventory'],
  [ALERT_RULE_REVISION]: ['0'],
  [ALERT_START]: ['2021-09-02T13:05:36.699Z'],
  [ALERT_RULE_TYPE_ID]: ['metrics.alert.inventory.threshold'],
  [EVENT_ACTION]: ['close'],
  [ALERT_INSTANCE_ID]: ['gke-edge-oblt-gcp-edge-oblt-gcp-pool-b6b9e929-vde2'],
  [ALERT_RULE_NAME]: ['Metrics inventory (from Metrics)'],
  [ALERT_UUID]: ['4f3a9ee4-aa45-47fd-a39a-a78758782425'],
  [SPACE_IDS]: ['default'],
  [VERSION]: ['8.0.0'],
  [EVENT_KIND]: ['signal'],
  [ALERT_END]: ['2021-09-02T13:08:45.729Z'],
} as unknown as Alert;
