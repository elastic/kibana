/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddToCaseContextItem } from './add_to_case_action';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useSelectedMonitor } from './hooks/use_selected_monitor';
import { useGetUrlParams } from '../../hooks';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

jest.mock('./hooks/use_selected_monitor', () => ({
  useSelectedMonitor: jest.fn(),
}));

jest.mock('../../hooks', () => ({
  useGetUrlParams: jest.fn(),
  useMonitorDetailLocator: jest
    .fn()
    .mockImplementation(
      ({ timeRange, locationId, configId, tabId, useAbsoluteDate }) =>
        `/history?locationId=${locationId}&dateRangeStart=${
          useAbsoluteDate ? '2025-06-26T12:42:38.568Z' : timeRange.from
        }&dateRangeEnd=${
          useAbsoluteDate ? '2025-06-26T12:57:38.568Z' : timeRange.to
        }&configId=${configId}`
    ),
}));

describe('AddToCaseContextItem', () => {
  const mockUseKibana = useKibana as jest.Mock;
  const mockUseSelectedMonitor = useSelectedMonitor as jest.Mock;
  const mockUseGetUrlParams = useGetUrlParams as jest.Mock;
  const mockAddDanger = jest.fn();
  const mockOpen = jest.fn();

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-26T12:57:38.568Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseKibana.mockReturnValue({
      services: {
        cases: {
          ui: {
            getCasesContext: jest.fn(() => ({ children }: any) => <>{children}</>),
          },
          helpers: {
            canUseCases: jest.fn(() => ({
              read: true,
              update: true,
              push: true,
            })),
          },
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn(() => ({
              open: mockOpen,
            })),
          },
        },
        notifications: {
          toasts: {
            addDanger: mockAddDanger,
          },
        },
      },
    });

    mockUseSelectedMonitor.mockReturnValue({
      monitor: { config_id: 'test-config-id', name: 'Test Monitor' },
    });

    mockUseGetUrlParams.mockReturnValue({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      locationId: 'test-location-id',
    });
  });

  it('renders the AddToCaseContextItem component', () => {
    render(<AddToCaseContextItem />);
    expect(screen.getByText('Add to case')).toBeInTheDocument();
  });

  it('opens the page attachment modal when clicked', async () => {
    mockUseKibana.mockReturnValueOnce({
      services: {
        cases: {
          ui: {
            getCasesContext: jest.fn(() => ({ children }: any) => <>{children}</>),
          },
          helpers: {
            canUseCases: jest.fn(() => ({
              read: true,
              update: true,
              push: true,
            })),
          },
          hooks: {
            useCasesAddToExistingCaseModal: jest.fn().mockReturnValue({
              open: mockOpen,
            }),
          },
        },
        notifications: {
          toasts: {
            addDanger: jest.fn(),
          },
        },
      },
    });

    render(<AddToCaseContextItem />);
    fireEvent.click(screen.getByText('Add to case'));

    await waitFor(() => {
      expect(screen.getByText('Add page to case')).toBeInTheDocument();
    });
  });

  it('defines persistableStateAttachmentState correctly when case modal is opened', () => {
    render(<AddToCaseContextItem />);
    fireEvent.click(screen.getByText('Add to case'));
    fireEvent.click(screen.getByText('Confirm'));

    const getAttachments = mockOpen.mock.calls[0][0].getAttachments;
    const attachments = getAttachments();

    expect(attachments).toHaveLength(1);
    expect(attachments[0]).toEqual({
      persistableStateAttachmentState: {
        type: 'synthetics_monitor',
        url: {
          pathAndQuery:
            '/history?locationId=test-location-id&dateRangeStart=2025-06-26T12:42:38.568Z&dateRangeEnd=2025-06-26T12:57:38.568Z&configId=test-config-id',
          label: 'Test Monitor',
          actionLabel: 'Go to Monitor History',
          iconType: 'uptimeApp',
        },
        summary: '',
        screenContext: [],
      },
      persistableStateAttachmentTypeId: '.page',
      type: 'persistableState',
    });
  });

  it('converts relative date ranges to absolute date ranges via the component', async () => {
    mockUseGetUrlParams.mockReturnValue({
      dateRangeStart: 'now-15m',
      dateRangeEnd: 'now',
      locationId: 'test-location-id',
    });

    render(<AddToCaseContextItem />);
    fireEvent.click(screen.getByText('Add to case'));

    await waitFor(() => {
      expect(screen.getByText('Add page to case')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Confirm'));

    const getAttachments = mockOpen.mock.calls[0][0].getAttachments;
    const attachments = getAttachments();

    expect(attachments[0].persistableStateAttachmentState.url.pathAndQuery).toEqual(
      '/history?locationId=test-location-id&dateRangeStart=2025-06-26T12:42:38.568Z&dateRangeEnd=2025-06-26T12:57:38.568Z&configId=test-config-id'
    );
  });
});
