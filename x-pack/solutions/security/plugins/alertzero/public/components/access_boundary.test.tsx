/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { SubscriptionAvailability } from '../../common/availability';
import { AccessBoundary } from './access_boundary';

const setup = ({
  enabled = true,
  canRead = true,
  subscription = 'available',
  billingUrl,
  billingRejected = false,
}: {
  enabled?: boolean;
  canRead?: boolean;
  subscription?: SubscriptionAvailability;
  billingUrl?: string;
  billingRejected?: boolean;
} = {}) => {
  const core = coreMock.createStart();
  const enabled$ = new BehaviorSubject(enabled);
  const availability$ = new BehaviorSubject<SubscriptionAvailability>(subscription);
  core.uiSettings.get$.mockReturnValue(enabled$);
  core.application.capabilities = {
    ...core.application.capabilities,
    alertzero: { show: canRead },
  };
  const getPrivilegedUrls = jest
    .fn()
    .mockImplementation(() =>
      billingRejected
        ? Promise.reject(new Error('No billing access'))
        : Promise.resolve({ billingUrl })
    );
  const contentMounted = jest.fn();
  const Content = () => {
    contentMounted();
    return <div>Feature content</div>;
  };
  render(
    <I18nProvider>
      <KibanaContextProvider
        services={{
          ...core,
          cloud: { getPrivilegedUrls },
          agentBuilder: {},
          agenticInvestigations: {},
          proposals: {},
        }}
      >
        <AccessBoundary availability$={availability$}>
          <Content />
        </AccessBoundary>
      </KibanaContextProvider>
    </I18nProvider>
  );
  return { contentMounted, availability$, enabled$, getPrivilegedUrls };
};

describe('AlertZero access boundary', () => {
  it.each([
    { subscription: 'loading', text: null },
    { subscription: 'license', text: 'AlertZero requires an active Enterprise license.' },
    {
      subscription: 'serverless_tier',
      text: 'AlertZero requires the Security Complete subscription.',
    },
  ] as const)('does not mount content for $subscription', ({ subscription, text }) => {
    const { contentMounted } = setup({ subscription });
    expect(contentMounted).not.toHaveBeenCalled();
    if (text) expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('shows the privilege gate for a direct URL without read access', () => {
    const { contentMounted } = setup({ canRead: false });
    expect(contentMounted).not.toHaveBeenCalled();
    expect(screen.getByText('Contact your administrator for access')).toBeInTheDocument();
  });

  it('shows subscription before privileges when both are missing', () => {
    setup({ canRead: false, subscription: 'license' });
    expect(screen.getByText('Upgrade your license')).toBeInTheDocument();
    expect(screen.queryByText('Contact your administrator for access')).not.toBeInTheDocument();
  });

  it('allows other pages without Proposals privileges', () => {
    const { contentMounted } = setup();
    expect(contentMounted).toHaveBeenCalled();
    expect(screen.getByText('Feature content')).toBeInTheDocument();
  });

  it('preserves the per-space setting as an independent gate', () => {
    const { contentMounted } = setup({ enabled: false });
    expect(contentMounted).not.toHaveBeenCalled();
    expect(screen.getByText('AlertZero is not enabled')).toBeInTheDocument();
  });

  it('removes content on a license downgrade and on space opt-out', () => {
    const { availability$, enabled$ } = setup();
    expect(screen.getByText('Feature content')).toBeInTheDocument();
    act(() => availability$.next('license'));
    expect(screen.queryByText('Feature content')).not.toBeInTheDocument();
    act(() => availability$.next('available'));
    expect(screen.getByText('Feature content')).toBeInTheDocument();
    act(() => enabled$.next(false));
    expect(screen.queryByText('Feature content')).not.toBeInTheDocument();
  });
  it('offers billing management when Cloud supplies a safe privileged URL', async () => {
    setup({ subscription: 'serverless_tier', billingUrl: 'https://cloud.elastic.co/billing' });
    expect(await screen.findByRole('link', { name: 'Manage subscription' })).toHaveAttribute(
      'href',
      'https://cloud.elastic.co/billing'
    );
  });

  it.each([
    { billingUrl: 'data:text/html,<h1>Untrusted billing page</h1>', billingRejected: false },
    { billingRejected: true },
  ])('falls back to contacting an administrator without a usable billing URL', async (billing) => {
    const { getPrivilegedUrls } = setup({ subscription: 'serverless_tier', ...billing });
    await waitFor(() => expect(getPrivilegedUrls).toHaveBeenCalled());
    expect(screen.queryByRole('link', { name: 'Manage subscription' })).not.toBeInTheDocument();
    expect(
      screen.getByText('Contact your administrator to upgrade your subscription.')
    ).toBeInTheDocument();
  });
});
