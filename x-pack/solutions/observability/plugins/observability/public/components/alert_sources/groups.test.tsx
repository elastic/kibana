/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { render } from '../../utils/test_helper';
import { useKibana } from '../../utils/kibana_react';
import { kibanaStartMock } from '../../utils/kibana_react.mock';
import { ALERT_SOURCES_ELEMENT, Groups } from './groups';

jest.mock('../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const APM_RULE_TYPE_ID = 'apm.transaction_duration';
const TIME_RANGE = { from: 'now-15m', to: 'now' };

const mockApmGetRedirectUrl = jest.fn().mockReturnValue('http://test-apm-url');

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    services: {
      ...kibanaStartMock.startContract().services,
      http: {
        basePath: {
          prepend: (path: string) => path,
        },
      },
      share: {
        url: {
          locators: {
            get: () => ({ getRedirectUrl: mockApmGetRedirectUrl }),
          },
        },
      },
    },
  });
};

describe('Groups', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });

  it('renders APM source links with `openInApm` EBT action', async () => {
    const { findAllByTestId } = render(
      <Groups
        groups={[
          { field: SERVICE_NAME, value: 'opbeans-go' },
          { field: SERVICE_ENVIRONMENT, value: 'production' },
          { field: TRANSACTION_TYPE, value: 'request' },
          { field: TRANSACTION_NAME, value: 'GET /api' },
        ]}
        timeRange={TIME_RANGE}
        alertRuleTypeId={APM_RULE_TYPE_ID}
        element={ALERT_SOURCES_ELEMENT.ALERT_DETAILS}
      />
    );

    const links = await findAllByTestId('o11yAlertSourceLink');

    expect(links).toHaveLength(4);
    links.forEach((link) => {
      expect(link).toHaveAttribute('data-ebt-action', 'openInApm');
      expect(link).toHaveAttribute('data-ebt-element', 'alertDetailsSources');
      expect(link).toHaveAttribute('data-ebt-detail', APM_RULE_TYPE_ID);
    });
  });

  it('renders infra source links with `openInInfra` EBT action', async () => {
    const { findAllByTestId } = render(
      <Groups
        groups={[
          { field: 'host.name', value: 'host-0' },
          { field: 'container.id', value: 'container-0' },
        ]}
        timeRange={TIME_RANGE}
        alertRuleTypeId="metrics.alert.threshold"
        element={ALERT_SOURCES_ELEMENT.ALERT_FLYOUT}
      />
    );

    const links = await findAllByTestId('o11yAlertSourceLink');

    expect(links).toHaveLength(2);
    links.forEach((link) => {
      expect(link).toHaveAttribute('data-ebt-action', 'openInInfra');
      expect(link).toHaveAttribute('data-ebt-element', 'alertFlyoutSources');
      expect(link).toHaveAttribute('data-ebt-detail', 'metrics.alert.threshold');
    });
  });
});
