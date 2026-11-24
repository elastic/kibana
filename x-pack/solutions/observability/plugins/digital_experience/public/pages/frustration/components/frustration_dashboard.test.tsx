/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import type { DashboardApi, DashboardRendererProps } from '@kbn/dashboard-plugin/public';
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
jest.mock('../utils/frustration_panels');

const panels = [{ id: 'rage' }] as unknown as ReturnType<typeof buildFrustrationPanels>;

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
        sessionSource="summaries"
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
  jest.mocked(buildFrustrationPanels).mockReturnValue(panels);
});

describe('FrustrationDashboard', () => {
  it('starts with the panels of the service and environment, in the time range', async () => {
    renderDashboard();

    expect(buildFrustrationPanels).toHaveBeenCalledWith(
      { serviceName: 'checkout-web', environment: 'production', sessionSource: 'summaries' },
      {
        rage: expect.stringMatching(/^#/),
        dead: expect.stringMatching(/^#/),
        error: expect.any(String),
      }
    );
    const { getInitialInput, useControlsIntegration } = await lastProps().getCreationOptions!();
    expect(useControlsIntegration).toBe(false);
    expect(getInitialInput?.()).toEqual({
      panels,
      time_range: { from: 'now-24h', to: 'now' },
      title: 'checkout-web (production) frustration signals',
      description: expect.stringContaining('The per-session panels read the session summaries'),
    });
  });

  it('describes the saved dashboard without the summaries caveat when the panels read the events', async () => {
    renderDashboard({ sessionSource: 'events' });

    const { getInitialInput } = await lastProps().getCreationOptions!();
    expect(getInitialInput?.()).toMatchObject({
      description: 'Rage, dead and error clicks reported by EDOT Browser.',
    });
  });

  it('titles the dashboard after the service alone for every environment', async () => {
    renderDashboard({ environment: undefined });

    const { getInitialInput } = await lastProps().getCreationOptions!();
    expect(getInitialInput?.()).toMatchObject({ title: 'checkout-web frustration signals' });
  });

  it('hands the dashboard API to the page once available, and takes it back on cleanup', () => {
    const onApiChange = jest.fn();
    renderDashboard({ onApiChange });

    const api = publishApi();
    expect(onApiChange).toHaveBeenLastCalledWith(api);

    act(() => lastProps().onApiCleanup?.());
    expect(onApiChange).toHaveBeenLastCalledWith(undefined);
  });

  it('puts the dashboard in view mode once available, as a new dashboard starts in edit mode', () => {
    renderDashboard();

    const api = publishApi();

    expect(api.setViewMode).toHaveBeenCalledWith('view');
  });

  it('builds the panels of every environment when none is selected', () => {
    renderDashboard({ environment: undefined });

    expect(buildFrustrationPanels).toHaveBeenCalledWith(
      { serviceName: 'checkout-web', environment: '', sessionSource: 'summaries' },
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

  it('mounts a new dashboard when the environment, the service or the session source changes', () => {
    const { update } = renderDashboard();
    expect(mockRendererMounted).toHaveBeenCalledTimes(1);

    update({ environment: 'staging' });
    expect(mockRendererMounted).toHaveBeenCalledTimes(2);
    expect(buildFrustrationPanels).toHaveBeenLastCalledWith(
      { serviceName: 'checkout-web', environment: 'staging', sessionSource: 'summaries' },
      expect.anything()
    );

    update({ environment: 'staging', serviceName: 'media-portal-web' });
    expect(mockRendererMounted).toHaveBeenCalledTimes(3);

    update({ environment: 'staging', serviceName: 'media-portal-web', sessionSource: 'events' });
    expect(mockRendererMounted).toHaveBeenCalledTimes(4);
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

  it('shows a callout instead of the dashboard when the panels cannot be built', () => {
    jest.mocked(buildFrustrationPanels).mockImplementation(() => {
      throw new Error('bad panel');
    });

    renderDashboard();

    expect(screen.getByTestId('digitalExperienceFrustrationDashboardError')).toHaveTextContent(
      'bad panel'
    );
    expect(screen.getByTestId('digitalExperienceFrustrationDashboardError')).toHaveTextContent(
      'Could not load the frustration dashboard'
    );
    expect(mockRendererProps).not.toHaveBeenCalled();
  });
});
