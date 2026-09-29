/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render } from '@testing-library/react';
import { MonitorDetailsLocation } from './monitor_details_location';

const mockNavigateToApp = vi.fn();

vi.mock('react-router-dom', () => {
      const mocked = {
      useParams: () => ({ monitorId: 'cfg-123' }),
      useRouteMatch: () => false,
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/kibana-react-plugin/public', () => {
      const mocked = {
      useKibana: () => ({
        services: { application: { navigateToApp: mockNavigateToApp } },
      }),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('../../../../hooks/use_kibana_space', () => {
      const mocked = {
      useKibanaSpace: () => ({ space: { id: 'default' } }),
    };
      return { ...mocked, default: mocked };
    });

const mockUrlParams = vi.fn();
vi.mock('../../hooks', () => {
      const mocked = {
      useGetUrlParams: () => mockUrlParams(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseSelectedLocation = vi.fn();
vi.mock('./hooks/use_selected_location', () => {
      const mocked = {
      useSelectedLocation: () => mockUseSelectedLocation(),
    };
      return { ...mocked, default: mocked };
    });

const mockUseSelectedMonitor = vi.fn();
vi.mock('./hooks/use_selected_monitor', () => {
      const mocked = {
      useSelectedMonitor: () => mockUseSelectedMonitor(),
    };
      return { ...mocked, default: mocked };
    });

// Render the dropdown directly so the test does not depend on the inner
// EuiPopover open/close cycle; we just need a way to invoke `onChange`.
let capturedOnChange: ((id: string, label: string) => void) | undefined;
vi.mock('../common/components/monitor_location_select', () => {
      const mocked = {
      MonitorLocationSelect: (props: { onChange: (id: string, label: string) => void }) => {
        capturedOnChange = props.onChange;
        return null;
      },
    };
      return { ...mocked, default: mocked };
    });

describe('MonitorDetailsLocation navigation', () => {
  beforeEach(() => {
    capturedOnChange = undefined;
    mockUseSelectedLocation.mockReturnValue({ id: 'us-east', label: 'US East' });
    mockUseSelectedMonitor.mockReturnValue({
      monitor: {
        locations: [
          { id: 'us-east', label: 'US East' },
          { id: 'eu-west', label: 'EU West' },
        ],
      },
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('does not include remoteName when the URL has none (local monitor)', () => {
    mockUrlParams.mockReturnValue({
      dateRangeStart: 'now-24h',
      dateRangeEnd: 'now',
    });

    render(<MonitorDetailsLocation />);
    capturedOnChange?.('eu-west', 'EU West');

    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
    const path = mockNavigateToApp.mock.calls[0][1].path as string;
    expect(path).toContain('locationId=eu-west');
    expect(path).not.toContain('remoteName=');
  });

  it('preserves remoteName in the navigation URL for remote monitors', () => {
    mockUrlParams.mockReturnValue({
      dateRangeStart: 'now-24h',
      dateRangeEnd: 'now',
      remoteName: 'remote-a',
    });

    render(<MonitorDetailsLocation />);
    capturedOnChange?.('eu-west', 'EU West');

    expect(mockNavigateToApp).toHaveBeenCalledTimes(1);
    const path = mockNavigateToApp.mock.calls[0][1].path as string;
    expect(path).toContain('locationId=eu-west');
    expect(path).toContain('remoteName=remote-a');
  });
});
