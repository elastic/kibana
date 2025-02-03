/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertConsumers } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { render } from '@testing-library/react';
import React from 'react';
import * as uuid from 'uuid';

import { AlertsPreview } from '.';
import { useKibana } from '../../../../common/lib/kibana';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn().mockReturnValue({
    services: {
      triggersActionsUi: {
        actionTypeRegistry: {
          has: jest.fn(),
          register: jest.fn(),
          get: jest.fn(),
          list: jest.fn(),
        },
        alertsTableConfigurationRegistry: {
          objectTypes: {},
          has: jest.fn(),
          register: jest.fn(),
          get: jest.fn(),
          getActions: jest.fn(),
          list: jest.fn(),
          update: jest.fn(),
          getAlertConfigIdPerRuleTypes: jest.fn(),
        },
        getAlertsStateTable: jest.fn().mockReturnValue(<div>{'Mocked Alerts Table'}</div>),
        ruleTypeRegistry: {
          has: jest.fn(),
          register: jest.fn(),
          get: jest.fn(),
          list: jest.fn(),
        },
      },
    },
  }),
}));

describe('AlertsPreview', () => {
  it('renders the alerts preview', () => {
    const query = { bool: {} };
    const size = 10;

    const { getByTestId } = render(<AlertsPreview query={query} size={size} />);

    expect(getByTestId('alertsPreview')).toBeInTheDocument();
  });

  it('invokes getAlertsStateTable with the expected props', () => {
    const query = { bool: {} };
    const size = 10;

    render(<AlertsPreview query={query} size={size} />);

    expect(useKibana().services.triggersActionsUi.getAlertsStateTable).toHaveBeenCalledWith({
      alertsTableConfigurationRegistry:
        useKibana().services.triggersActionsUi.alertsTableConfigurationRegistry,
      configurationId: 'securitySolution-rule-details',
      consumers: [AlertConsumers.SIEM],
      id: `attack-discovery-alerts-preview-${uuid.v4()}`,
      initialPageSize: size,
      query,
      ruleTypeIds: SECURITY_SOLUTION_RULE_TYPE_IDS,
      showAlertStatusWithFlapping: false,
    });
  });
});
