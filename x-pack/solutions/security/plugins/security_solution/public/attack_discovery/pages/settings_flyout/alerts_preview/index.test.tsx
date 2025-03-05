/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import * as uuid from 'uuid';

import { AlertsPreview } from '.';
import { TableId } from '@kbn/securitysolution-data-table';
import { DetectionEngineAlertsTable } from '../../../../detections/components/alerts_table';

jest.mock('../../../../detections/components/alerts_table', () => ({
  DetectionEngineAlertsTable: jest.fn().mockReturnValue(<div>{'Mocked Alerts Table'}</div>),
}));

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

  it('renders the alerts table component with the expected props', () => {
    const query = { bool: {} };
    const size = 10;

    render(<AlertsPreview query={query} size={size} />);

    expect(DetectionEngineAlertsTable).toHaveBeenCalledWith(
      {
        id: `attack-discovery-alerts-preview-${uuid.v4()}`,
        tableType: TableId.alertsOnRuleDetailsPage,
        initialPageSize: size,
        query,
        showAlertStatusWithFlapping: false,
      },
      expect.anything()
    );
  });
});
