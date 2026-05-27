/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EuiThemeProvider } from '@elastic/eui';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import { TrialUsageBadge } from './trial_usage_badge';

const getByTestSubj = (container: HTMLElement, testSubj: string) =>
  container.querySelector(`[data-test-subj="${testSubj}"]`);

const createCloudMock = (
  overrides: Partial<{
    trialDaysLeft: number;
    billingUrl: string;
    isServerlessEnabled: boolean;
  }> = {}
): CloudStart =>
  ({
    trialDaysLeft: jest.fn().mockReturnValue(overrides.trialDaysLeft ?? 0),
    getPrivilegedUrls: jest.fn().mockResolvedValue({
      billingUrl: overrides.billingUrl,
    }),
    isServerlessEnabled: overrides.isServerlessEnabled ?? false,
  } as unknown as CloudStart);

const renderBadge = async (cloud: CloudStart) => {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <EuiThemeProvider>
        <TrialUsageBadge cloud={cloud} />
      </EuiThemeProvider>
    );
  });
  return result!;
};

describe('TrialUsageBadge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders TRIAL badge', async () => {
    const cloud = createCloudMock();
    const { container } = await renderBadge(cloud);
    expect(getByTestSubj(container, 'trialUsageBadge')).toHaveTextContent('TRIAL');
  });

  describe('when no trial data and no billing url', () => {
    it('renders badge without popover', async () => {
      const cloud = createCloudMock();
      const { container } = await renderBadge(cloud);
      expect(getByTestSubj(container, 'trialUsagePopover')).not.toBeInTheDocument();
    });

    it('does not open popover on click', async () => {
      const cloud = createCloudMock();
      const { container } = await renderBadge(cloud);
      await userEvent.click(getByTestSubj(container, 'trialUsageBadge')!);
      expect(getByTestSubj(container, 'trialUsagePopover')).not.toBeInTheDocument();
    });
  });

  describe('when trialDaysLeft > 0 and billingUrl is available', () => {
    it('shows full popover with trial period and manage subscription button', async () => {
      const cloud = createCloudMock({ trialDaysLeft: 10, billingUrl: 'https://billing.test' });
      const { container, getByText } = await renderBadge(cloud);

      await userEvent.click(getByTestSubj(container, 'trialUsageBadge')!);

      await waitFor(() => {
        expect(getByText('Trial period')).toBeInTheDocument();
        expect(getByText('10 days left')).toBeInTheDocument();
        expect(getByText('5 / 15 days')).toBeInTheDocument();
        expect(
          getByTestSubj(document.body, 'trialUsageBadgeManageSubscriptionButton')
        ).toBeInTheDocument();
      });
    });
  });

  describe('when trialDaysLeft > 0 but no billingUrl', () => {
    it('shows trial period without manage subscription button', async () => {
      const cloud = createCloudMock({ trialDaysLeft: 10 });
      const { container, getByText } = await renderBadge(cloud);

      await userEvent.click(getByTestSubj(container, 'trialUsageBadge')!);

      await waitFor(() => {
        expect(getByText('Trial period')).toBeInTheDocument();
        expect(getByText('10 days left')).toBeInTheDocument();
      });
      expect(
        getByTestSubj(document.body, 'trialUsageBadgeManageSubscriptionButton')
      ).not.toBeInTheDocument();
    });
  });

  describe('when trialDaysLeft is 0 but billingUrl is available', () => {
    it('shows only title and manage subscription button', async () => {
      const cloud = createCloudMock({ billingUrl: 'https://billing.test' });
      const { container } = await renderBadge(cloud);

      await userEvent.click(getByTestSubj(container, 'trialUsageBadge')!);

      await waitFor(() => {
        expect(
          getByTestSubj(document.body, 'trialUsageBadgeManageSubscriptionButton')
        ).toBeInTheDocument();
      });
      expect(
        document.body.querySelector('[data-test-subj="trialUsagePopover"]')
      ).toBeInTheDocument();
      expect(document.body.textContent).not.toContain('Trial period');
      expect(document.body.textContent).not.toContain('days left');
    });
  });

  describe('popover title', () => {
    it('shows "Elastic Cloud Serverless" when serverless', async () => {
      const cloud = createCloudMock({
        trialDaysLeft: 5,
        isServerlessEnabled: true,
      });
      const { container, getByText } = await renderBadge(cloud);

      await userEvent.click(getByTestSubj(container, 'trialUsageBadge')!);

      expect(getByText('Elastic Cloud Serverless')).toBeInTheDocument();
    });

    it('shows "Elastic Cloud Hosted" when not serverless', async () => {
      const cloud = createCloudMock({
        trialDaysLeft: 5,
        isServerlessEnabled: false,
      });
      const { container, getByText } = await renderBadge(cloud);

      await userEvent.click(getByTestSubj(container, 'trialUsageBadge')!);

      expect(getByText('Elastic Cloud Hosted')).toBeInTheDocument();
    });
  });
});
