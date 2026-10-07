/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { MAINTENANCE_FEATURE_FLAG_ACTOR } from '@kbn/significant-events-plugin/common';
import { useMaintenanceStatus } from '../hooks/use_significant_events_maintenance';
import { DetectionPausedCallout } from './detection_paused_callout';

jest.mock('../hooks/use_significant_events_maintenance');

const mockUseMaintenanceStatus = useMaintenanceStatus as jest.MockedFunction<
  typeof useMaintenanceStatus
>;

describe('DetectionPausedCallout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when detection is not paused', () => {
    mockUseMaintenanceStatus.mockReturnValue({
      data: { state: 'enabled' },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    const { container } = render(
      <I18nProvider>
        <DetectionPausedCallout />
      </I18nProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows a warning callout with actor and disabled counts when paused', () => {
    mockUseMaintenanceStatus.mockReturnValue({
      data: {
        state: 'paused',
        updatedBy: 'kate.sosedova@elastic.co',
        lastSummary: {
          workflowsDisabled: 14,
          rulesDisabled: 168,
          partialFailures: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    render(
      <I18nProvider>
        <DetectionPausedCallout />
      </I18nProvider>
    );

    expect(screen.getByTestId('streams-settings-maintenance-paused-status')).toHaveTextContent(
      'Detection is paused by kate.sosedova@elastic.co.'
    );
  });

  it('explains that detection activity is stopped until resumed from Settings', () => {
    mockUseMaintenanceStatus.mockReturnValue({
      data: {
        state: 'paused',
        updatedBy: MAINTENANCE_FEATURE_FLAG_ACTOR,
        lastSummary: {
          workflowsDisabled: 2,
          rulesDisabled: 3,
          partialFailures: [],
        },
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn(),
    } as never);

    render(
      <I18nProvider>
        <DetectionPausedCallout />
      </I18nProvider>
    );

    const callout = screen.getByTestId('streams-settings-maintenance-paused-status');
    expect(callout).toHaveTextContent('Detection is paused');
    expect(callout).toHaveTextContent(
      'Detection activity is stopped across the deployment: scheduled discovery, detections and the alerting rules backing knowledge indicator queries. Manual triggers are blocked until you resume from Settings.'
    );
  });
});

