/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { render } from '@testing-library/react';
import React from 'react';
import * as uuid from 'uuid';

import { AlertsPreview } from '.';
import { TableId } from '@kbn/securitysolution-data-table';
import { AlertsTable } from '../../../../detections/components/alerts_table';

vi.mock('../../../../detections/components/alerts_table', () => {
      const mocked = {
      AlertsTable: vi.fn(() => <div>{'Mocked Alerts Table'}</div>),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('uuid', () => {
      const mocked = {
      v4: vi.fn().mockReturnValue('mocked-uuid'),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../common/lib/kibana', () => {
      const mocked = {
      useKibana: vi.fn().mockReturnValue({
        services: {
          triggersActionsUi: {
            actionTypeRegistry: {
              has: vi.fn(),
              register: vi.fn(),
              get: vi.fn(),
              list: vi.fn(),
            },
            ruleTypeRegistry: {
              has: vi.fn(),
              register: vi.fn(),
              get: vi.fn(),
              list: vi.fn(),
            },
          },
        },
      }),
    };
      return { ...mocked, default: mocked };
    });

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

    expect(AlertsTable).toHaveBeenCalledWith(
      {
        id: `attack-discovery-alerts-preview-${uuid.v4()}`,
        tableType: TableId.alertsOnRuleDetailsPage,
        pageSize: size,
        query,
        showAlertStatusWithFlapping: false,
      },
      expect.anything()
    );
  });
});
