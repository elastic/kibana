/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { IntegrationSelectablePopover } from './integrations_selectable_popover';
import { useKibana } from '../../../common/lib/kibana';
import { SiemReadinessEventTypes } from '../../../common/lib/telemetry/events/siem_readiness/types';

jest.mock('../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
  useBasePath: jest.fn(() => '/test/base/path'),
}));

const mockReportEvent = jest.fn();

describe('IntegrationSelectablePopover telemetry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue({
      services: { telemetry: { reportEvent: mockReportEvent } },
    });
  });

  const options = [{ label: 'Endpoint Security', key: 'endpoint' }];

  it('reports IntegrationPopoverOpened when the popover button is clicked', () => {
    const { getByText } = render(
      <IntegrationSelectablePopover options={options} telemetrySource="data_coverage" />
    );
    fireEvent.click(getByText('View Integrations'));
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.IntegrationPopoverOpened, {
      source: 'data_coverage',
    });
  });

  it('reports IntegrationPopoverOpened with the correct source', () => {
    const { getByText } = render(
      <IntegrationSelectablePopover options={options} telemetrySource="all_rules_enabled" />
    );
    fireEvent.click(getByText('View Integrations'));
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.IntegrationPopoverOpened, {
      source: 'all_rules_enabled',
    });
  });

  it('reports IntegrationClicked when an integration is selected from the popover', async () => {
    const { getByText } = render(
      <IntegrationSelectablePopover options={options} telemetrySource="all_rules_missing" />
    );
    fireEvent.click(getByText('View Integrations'));
    await waitFor(() => getByText('Endpoint Security'));
    fireEvent.click(getByText('Endpoint Security'));
    expect(mockReportEvent).toHaveBeenCalledWith(SiemReadinessEventTypes.IntegrationClicked, {
      integrationPackage: 'endpoint',
      source: 'all_rules_missing',
    });
  });

  it('does not report IntegrationPopoverOpened when disabled', () => {
    const { getByText } = render(
      <IntegrationSelectablePopover options={options} telemetrySource="data_coverage" disabled />
    );
    fireEvent.click(getByText('View Integrations'));
    expect(mockReportEvent).not.toHaveBeenCalled();
  });
});
