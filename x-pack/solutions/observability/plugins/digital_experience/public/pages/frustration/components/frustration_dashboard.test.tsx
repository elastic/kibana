/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
import { useKibanaServices } from '../../../hooks/use_kibana_services';
import { buildFrustrationPanels } from '../utils/frustration_panels';
import { FrustrationDashboard } from './frustration_dashboard';

const mockRendererProps = jest.fn();
const mockRendererMounted = jest.fn();

jest.mock('@kbn/dashboard-plugin/public', () => ({
  DashboardRenderer: (props: DashboardRendererProps) => {
    mockRendererProps(props);
    const { useEffect } = jest.requireActual('react');
    useEffect(() => mockRendererMounted(), []);
    return null;
  },
}));
jest.mock('../../../hooks/use_kibana_services');
jest.mock('../utils/frustration_panels');

const addDanger = jest.fn();
const panels = [{ uid: 'rage' }] as unknown as ReturnType<typeof buildFrustrationPanels>;

const timeRange = { rangeFrom: 'now-24h', rangeTo: 'now' };

const createApi = () => ({
  setTimeRange: jest.fn(),
  forceRefresh: jest.fn(),
  setViewMode: jest.fn(),
});

const lastProps = (): DashboardRendererProps => mockRendererProps.mock.lastCall?.[0];

const renderDashboard = (
  props: Partial<React.ComponentProps<typeof FrustrationDashboard>> = {}
) => {
  const element = (override: Partial<React.ComponentProps<typeof FrustrationDashboard>> = {}) => (
    <EuiProvider>
      <FrustrationDashboard
        serviceName="checkout-web"
        environment="production"
        timeRange={timeRange}
        refreshCount={0}
        {...props}
        {...override}
      />
    </EuiProvider>
  );
  const view = render(element());
  return {
    ...view,
    update: (override: Partial<React.ComponentProps<typeof FrustrationDashboard>>) =>
      view.rerender(element(override)),
  };
};

const publishApi = (api = createApi()) => {
  act(() => lastProps().onApiAvailable?.(api as unknown as DashboardApi, {} as never));
  return api;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useKibanaServices).mockReturnValue({
    notifications: { toasts: { addDanger } },
  } as unknown as ReturnType<typeof useKibanaServices>);
  jest.mocked(buildFrustrationPanels).mockReturnValue(panels);
});

describe('FrustrationDashboard', () => {
  it('starts in view mode with the panels of the service and environment, in the time range', async () => {
    renderDashboard();

    expect(buildFrustrationPanels).toHaveBeenCalledWith(
      { serviceName: 'checkout-web', environment: 'production' },
      {
        rage: expect.stringMatching(/^#/),
        dead: expect.stringMatching(/^#/),
        error: expect.any(String),
      }
    );
    const { getInitialInput } = await lastProps().getCreationOptions!();
    expect(getInitialInput?.()).toEqual({
      viewMode: 'view',
      panels,
      time_range: { from: 'now-24h', to: 'now' },
    });
  });

  it('puts the dashboard in view mode once available, as a new dashboard starts in edit mode', () => {
    renderDashboard();

    const api = publishApi();

    expect(api.setViewMode).toHaveBeenCalledWith('view');
  });

  it('builds the panels of every environment when none is selected', () => {
    renderDashboard({ environment: undefined });

    expect(buildFrustrationPanels).toHaveBeenCalledWith(
      { serviceName: 'checkout-web', environment: '' },
      expect.anything()
    );
  });

  it('sets the time range of the dashboard when it is available and when it changes', () => {
    const { update } = renderDashboard();
    const api = publishApi();

    expect(api.setTimeRange).toHaveBeenLastCalledWith({ from: 'now-24h', to: 'now' });

    update({ timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' } });

    expect(api.setTimeRange).toHaveBeenLastCalledWith({ from: 'now-7d', to: 'now' });
  });

  it('mounts a new dashboard when the environment or the service changes', () => {
    const { update } = renderDashboard();
    expect(mockRendererMounted).toHaveBeenCalledTimes(1);

    update({ environment: 'staging' });
    expect(mockRendererMounted).toHaveBeenCalledTimes(2);
    expect(buildFrustrationPanels).toHaveBeenLastCalledWith(
      { serviceName: 'checkout-web', environment: 'staging' },
      expect.anything()
    );

    update({ environment: 'staging', serviceName: 'media-portal-web' });
    expect(mockRendererMounted).toHaveBeenCalledTimes(3);
  });

  it('keeps the dashboard when only the time range changes', () => {
    const { update } = renderDashboard();

    update({ timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' } });

    expect(mockRendererMounted).toHaveBeenCalledTimes(1);
  });

  it('refreshes the dashboard when the refresh count goes up, not when it becomes available', () => {
    const { update } = renderDashboard();
    const api = publishApi();
    expect(api.forceRefresh).not.toHaveBeenCalled();

    update({ refreshCount: 1 });

    expect(api.forceRefresh).toHaveBeenCalledTimes(1);

    update({ refreshCount: 1, timeRange: { rangeFrom: 'now-7d', rangeTo: 'now' } });

    expect(api.forceRefresh).toHaveBeenCalledTimes(1);
  });

  it('ignores the cleanup of a dashboard that was replaced', () => {
    const { update } = renderDashboard();
    const staleCleanup = lastProps().onApiCleanup;

    update({ environment: 'staging' });
    const api = publishApi();
    act(() => staleCleanup?.());
    update({ environment: 'staging', refreshCount: 1 });

    expect(api.forceRefresh).toHaveBeenCalledTimes(1);
  });

  it('shows a callout and a toast instead of the dashboard when the panels cannot be built', async () => {
    jest.mocked(buildFrustrationPanels).mockImplementation(() => {
      throw new Error('bad panel');
    });

    renderDashboard();

    expect(screen.getByTestId('digitalExperienceFrustrationDashboardError')).toHaveTextContent(
      'bad panel'
    );
    expect(mockRendererProps).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(addDanger).toHaveBeenCalledWith({
        title: 'Could not load the frustration dashboard',
        text: 'bad panel',
      })
    );
  });
});
