/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceSetup, CoreStart } from '@kbn/core/public';
import type { InvestigationSeed } from '@kbn/investigation-seed';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { SignalAnalyzerResult } from '@kbn/signal-investigation-contract';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  SIGNAL_INVESTIGATION_ANALYZERS_PATH,
  signalInvestigationLeadsPath,
} from '../../common/api';
import {
  OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
  SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
} from '../../common/findings_attachment';
import { AI_CHAT_EXPERIENCE_TYPE } from './agent_handoff';
import {
  SIGNAL_INVESTIGATION_LEAD_CLICKED_EVENT,
  SIGNAL_INVESTIGATION_LEAD_FEEDBACK_EVENT,
  SIGNAL_INVESTIGATION_OPENED_EVENT,
  registerFlyoutTelemetryEvents,
} from './flyout_telemetry';
import {
  InvestigationFlyoutBody,
  InvestigationFlyoutContainer,
  openInvestigationFlyout,
} from './investigation_flyout';
import {
  SIGNAL_INVESTIGATION_SHOWN_EVENT,
  registerShownTelemetryEvent,
} from '../telemetry/shown_telemetry';

const makeSeed = (overrides: Partial<InvestigationSeed> = {}): InvestigationSeed => ({
  origin: { app: 'alerts', alertId: 'alert-99', ruleTypeId: 'apm.transaction_duration' },
  timeRange: { from: '2026-11-02T11:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
  filters: [],
  entities: { 'service.name': 'checkout' },
  ...overrides,
});

const makeLicensing = (tier: 'basic' | 'platinum' | 'enterprise'): LicensingPluginStart =>
  ({
    license$: new BehaviorSubject({
      hasAtLeast: (minimum: string) => {
        if (tier === 'enterprise') {
          return true;
        }
        if (tier === 'platinum') {
          return minimum === 'platinum';
        }
        return false;
      },
    }),
  } as unknown as LicensingPluginStart);

const makeCore = ({
  get,
  post,
  feedbackEnabled = true,
  agentBuilderShow = false,
  chatExperience = 'agent',
}: {
  get: jest.Mock;
  post: jest.Mock;
  feedbackEnabled?: boolean;
  agentBuilderShow?: boolean;
  chatExperience?: string;
}) => {
  const reportEvent = jest.fn();
  const openFlyoutTemplate = jest.fn();
  const chatExperience$ = new BehaviorSubject(chatExperience);

  const core = {
    http: {
      get,
      post,
      basePath: { get: () => '' },
    },
    application: {
      capabilities: {
        ml: { canUseAiops: true },
        agentBuilder: { show: agentBuilderShow },
      },
    },
    uiSettings: {
      get: (key: string) => (key === AI_CHAT_EXPERIENCE_TYPE ? chatExperience : 'YYYY-MM-DD HH:mm'),
      get$: (key: string) =>
        key === AI_CHAT_EXPERIENCE_TYPE ? chatExperience$.asObservable() : new BehaviorSubject(''),
    },
    notifications: {
      feedback: {
        isEnabled: () => feedbackEnabled,
      },
    },
    analytics: {
      reportEvent,
    },
    overlays: {
      openFlyoutTemplate,
    },
  } as unknown as CoreStart;

  return { core, reportEvent, openFlyoutTemplate };
};

const renderFlyout = (props: React.ComponentProps<typeof InvestigationFlyoutBody>) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InvestigationFlyoutBody {...props} />
    </QueryClientProvider>
  );
};

const renderFlyoutContainer = (
  props: React.ComponentProps<typeof InvestigationFlyoutContainer>
) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <InvestigationFlyoutContainer {...props} />
    </QueryClientProvider>
  );
};

describe('InvestigationFlyoutBody', () => {
  it('waits for service_hosts before running metric_change_points and forwards resolved hosts', async () => {
    let resolveServiceHosts: ((value: SignalAnalyzerResult) => void) | undefined;
    const serviceHostsPromise = new Promise<SignalAnalyzerResult>((resolve) => {
      resolveServiceHosts = resolve;
    });

    const get = jest.fn(async (path: string) => {
      if (path === SIGNAL_INVESTIGATION_ANALYZERS_PATH) {
        return {
          analyzers: [
            { id: 'service_hosts', displayName: 'Service hosts' },
            { id: 'service_change_points', displayName: 'Service change points' },
            { id: 'metric_change_points', displayName: 'Host metric change points' },
          ],
        };
      }
      return {};
    });

    const post = jest.fn(async (path: string) => {
      if (path === signalInvestigationLeadsPath('service_hosts')) {
        return serviceHostsPromise;
      }
      if (path === signalInvestigationLeadsPath('service_change_points')) {
        return { leads: [], entities: {}, status: 'no_change' } satisfies SignalAnalyzerResult;
      }
      if (path === signalInvestigationLeadsPath('metric_change_points')) {
        return { leads: [], entities: {}, status: 'no_change' } satisfies SignalAnalyzerResult;
      }
      return { leads: [], entities: {}, status: 'no_change' };
    });

    const { core } = makeCore({ get, post });
    renderFlyout({
      core,
      seed: makeSeed(),
      onClose: jest.fn(),
    });

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        signalInvestigationLeadsPath('service_hosts'),
        expect.anything()
      );
    });
    expect(post).not.toHaveBeenCalledWith(
      signalInvestigationLeadsPath('metric_change_points'),
      expect.anything()
    );

    await act(async () => {
      resolveServiceHosts?.({
        leads: [],
        entities: { 'host.name': ['host-a', 'host-b'] },
        status: 'found',
      });
    });

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        signalInvestigationLeadsPath('metric_change_points'),
        expect.objectContaining({
          body: expect.stringContaining('"hosts":["host-a","host-b"]'),
        })
      );
    });
  });

  it('inserts a late higher-ranked lead in sorted order, updates progress, and emits feedback without lead text', async () => {
    let resolveServiceLeads: ((value: SignalAnalyzerResult) => void) | undefined;
    const serviceLeadsPromise = new Promise<SignalAnalyzerResult>((resolve) => {
      resolveServiceLeads = resolve;
    });

    const get = jest.fn(async () => ({
      analyzers: [
        { id: 'service_change_points', displayName: 'Service change points' },
        { id: 'dependency_change_points', displayName: 'Dependency change points' },
      ],
    }));

    const post = jest.fn(async (path: string) => {
      if (path === signalInvestigationLeadsPath('dependency_change_points')) {
        return {
          leads: [
            {
              id: 'dep-lead',
              analyzerId: 'dependency_change_points',
              summary: 'Latency spike on redis',
              occurredAt: '2026-11-02T11:15:00.000Z',
              relevance: 'One-hop dependency redis',
              ranking: { signal: 'strong', timing: 'during', relationship: 'dependency' },
            },
          ],
          entities: {},
          status: 'found',
        } satisfies SignalAnalyzerResult;
      }
      return serviceLeadsPromise;
    });

    const { core, reportEvent } = makeCore({ get, post, feedbackEnabled: true });
    const user = userEvent.setup();

    renderFlyout({
      core,
      seed: makeSeed(),
      onClose: jest.fn(),
    });

    expect(await screen.findByText('Latency spike on redis')).toBeInTheDocument();
    expect(screen.getByTestId('signalInvestigationProgress')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 analyses complete')).toBeInTheDocument();

    await act(async () => {
      resolveServiceLeads?.({
        leads: [
          {
            id: 'svc-lead',
            analyzerId: 'service_change_points',
            summary: 'p95 latency spike on checkout',
            occurredAt: '2026-11-02T11:10:00.000Z',
            relevance: 'Same service',
            ranking: { signal: 'strong', timing: 'before', relationship: 'service' },
          },
        ],
        entities: {},
        status: 'found',
      });
    });

    await waitFor(() => {
      expect(screen.queryByTestId('signalInvestigationProgress')).not.toBeInTheDocument();
    });

    const cards = screen.getAllByTestId('signalInvestigationLead');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent('p95 latency spike on checkout');
    expect(cards[1]).toHaveTextContent('Latency spike on redis');

    const usefulButton = screen.getByTestId('signalInvestigationFeedbackUseful-svc-lead');
    expect(usefulButton).toHaveAttribute('aria-pressed', 'false');

    await user.click(usefulButton);
    expect(usefulButton).toHaveAttribute('aria-pressed', 'true');
    expect(reportEvent).toHaveBeenCalledWith(SIGNAL_INVESTIGATION_LEAD_FEEDBACK_EVENT, {
      analyzerId: 'service_change_points',
      rank: 1,
      verdict: 'useful',
    });

    await user.click(usefulButton);
    expect(usefulButton).toHaveAttribute('aria-pressed', 'false');
    expect(reportEvent).toHaveBeenCalledTimes(1);
  });

  it('hides feedback controls when notifications.feedback.isEnabled() is false', async () => {
    const get = jest.fn(async () => ({
      analyzers: [{ id: 'service_change_points', displayName: 'Service change points' }],
    }));
    const post = jest.fn(async () => ({
      leads: [
        {
          id: 'svc-lead',
          analyzerId: 'service_change_points',
          summary: 'p95 latency spike on checkout',
          relevance: 'Same service',
          ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
        },
      ],
      entities: {},
      status: 'found',
    }));

    const { core } = makeCore({ get, post, feedbackEnabled: false });
    renderFlyout({
      core,
      seed: makeSeed(),
      onClose: jest.fn(),
    });

    expect(await screen.findByText('p95 latency spike on checkout')).toBeInTheDocument();
    expect(
      screen.queryByTestId('signalInvestigationFeedbackUseful-svc-lead')
    ).not.toBeInTheDocument();
  });

  it('renders Continue with AI agent only when all four Agent Builder gates pass and attaches findings plus alert', async () => {
    const get = jest.fn(async () => ({
      analyzers: [{ id: 'service_change_points', displayName: 'Service change points' }],
    }));
    const post = jest.fn(async () => ({
      leads: [
        {
          id: 'svc-lead',
          analyzerId: 'service_change_points',
          summary: 'p95 latency spike on checkout',
          relevance: 'Same service',
          ranking: { signal: 'strong', timing: 'during', relationship: 'service' },
        },
      ],
      entities: {},
      status: 'found',
    }));

    const openChat = jest.fn();
    const addAttachmentType = jest.fn();
    const agentBuilder = {
      openChat,
      attachments: { addAttachmentType },
      getAgentBuilderAccess: jest.fn(async () => ({
        hasRequiredLicense: true,
        hasLlmConnector: true,
      })),
    } as unknown as AgentBuilderPluginStart;

    const { core: platinumCore } = makeCore({ get, post, agentBuilderShow: true });
    const { unmount } = renderFlyout({
      core: platinumCore,
      licensing: makeLicensing('platinum'),
      agentBuilder,
      seed: makeSeed(),
      onClose: jest.fn(),
    });

    expect(await screen.findByText('p95 latency spike on checkout')).toBeInTheDocument();
    expect(screen.queryByTestId('signalInvestigationContinueWithAgent')).not.toBeInTheDocument();
    unmount();

    const { core: enterpriseCore } = makeCore({
      get,
      post,
      agentBuilderShow: true,
      chatExperience: 'agent',
    });
    const user = userEvent.setup();
    renderFlyout({
      core: enterpriseCore,
      licensing: makeLicensing('enterprise'),
      agentBuilder,
      seed: makeSeed(),
      onClose: jest.fn(),
    });

    const continueButton = await screen.findByTestId('signalInvestigationContinueWithAgent');
    await user.click(continueButton);

    expect(addAttachmentType).toHaveBeenCalledWith(
      SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
      expect.objectContaining({
        getLabel: expect.any(Function),
        getIcon: expect.any(Function),
      })
    );
    expect(openChat).toHaveBeenCalledWith({
      newConversation: true,
      attachments: [
        {
          id: 'alert-99',
          type: OBSERVABILITY_ALERT_ATTACHMENT_TYPE_ID,
          data: { alertId: 'alert-99' },
        },
        expect.objectContaining({
          type: SIGNAL_INVESTIGATION_FINDINGS_ATTACHMENT_TYPE_ID,
          data: expect.objectContaining({
            seed: expect.objectContaining({
              origin: {
                app: 'alerts',
                alertId: 'alert-99',
                ruleTypeId: 'apm.transaction_duration',
              },
            }),
          }),
        }),
      ],
    });
  });

  it('registers all four EBT event types and reports signal_investigation_opened when opening the flyout', () => {
    const registerEventType = jest.fn();
    const analyticsSetup = { registerEventType } as unknown as AnalyticsServiceSetup;

    registerShownTelemetryEvent(analyticsSetup);
    registerFlyoutTelemetryEvents(analyticsSetup);

    expect(registerEventType.mock.calls.map(([arg]) => arg.eventType)).toEqual([
      SIGNAL_INVESTIGATION_SHOWN_EVENT,
      SIGNAL_INVESTIGATION_OPENED_EVENT,
      SIGNAL_INVESTIGATION_LEAD_CLICKED_EVENT,
      SIGNAL_INVESTIGATION_LEAD_FEEDBACK_EVENT,
    ]);

    const { core, reportEvent, openFlyoutTemplate } = makeCore({
      get: jest.fn(),
      post: jest.fn(),
    });
    openInvestigationFlyout({
      core,
      seed: makeSeed({ origin: { app: 'discover', surface: 'appMenu' } }),
      session: 'start',
    });

    expect(openFlyoutTemplate).toHaveBeenCalledWith(
      expect.objectContaining({ session: 'start', 'data-test-subj': 'signalInvestigationFlyout' }),
      expect.any(Function)
    );
    expect(reportEvent).toHaveBeenCalledWith(SIGNAL_INVESTIGATION_OPENED_EVENT, {
      app: 'discover',
      surface: 'appMenu',
    });
  });

  it('renders comparison windows on log rate leads and coverage lines (including no_change and indeterminable), but not in the header', async () => {
    const comparison = {
      baseline: {
        from: '2026-10-31T12:00:00.000Z',
        to: '2026-11-01T12:00:00.000Z',
      },
      deviation: {
        from: '2026-11-01T12:00:00.000Z',
        to: '2026-11-02T12:00:00.000Z',
      },
    };
    const get = jest.fn(async () => ({
      analyzers: [{ id: 'log_rate_analysis', displayName: 'Log rate analysis' }],
    }));
    const post = jest.fn(
      async (): Promise<SignalAnalyzerResult> => ({
        leads: [
          {
            id: 'lra-lead',
            analyzerId: 'log_rate_analysis',
            summary: 'log.level: "error" (10 in baseline to 50 in deviation, p = 0.001)',
            occurredAt: '2026-11-01T12:00:00.000Z',
            relevance: 'Logs in the selected window',
            ranking: { signal: 'strong', timing: 'during', relationship: 'unknown' },
          },
        ],
        entities: {},
        status: 'found',
        comparison,
      })
    );

    const { core } = makeCore({ get, post });
    const { unmount } = renderFlyout({
      core,
      seed: makeSeed({
        origin: { app: 'discover', surface: 'histogram' },
        timeRange: { from: '2026-11-01T12:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
        entities: {},
      }),
      onClose: jest.fn(),
    });

    const leadCard = await screen.findByTestId('signalInvestigationLead');
    expect(leadCard).toHaveTextContent(/Logs in the selected window · .* compared with .*/);
    const coverageItem = screen.getByTestId('signalInvestigationCoverageItem-log_rate_analysis');
    expect(coverageItem).toHaveTextContent(/compared with 2026-10-31/);
    expect(screen.getAllByText(/compared with 2026-10-31/)).toHaveLength(2);
    unmount();

    post.mockResolvedValueOnce({
      leads: [],
      entities: {},
      status: 'indeterminable',
      message: 'Not enough data in the baseline or deviation window',
      comparison,
    });
    renderFlyout({
      core,
      seed: makeSeed({
        origin: { app: 'discover', surface: 'histogram' },
        timeRange: { from: '2026-11-01T12:00:00.000Z', to: '2026-11-02T12:00:00.000Z' },
        entities: {},
      }),
      onClose: jest.fn(),
    });

    const indeterminableCoverage = await screen.findByTestId(
      'signalInvestigationCoverageItem-log_rate_analysis'
    );
    await waitFor(() => {
      expect(indeterminableCoverage).toHaveTextContent(
        /Not enough data in the baseline or deviation window \(.* compared with 2026-10-31/
      );
    });
    expect(screen.getAllByText(/compared with 2026-10-31/)).toHaveLength(1);
  });

  it('hides the window pivot when the seed already has a service or resolved host', async () => {
    const get = jest.fn(async () => ({
      analyzers: [{ id: 'log_rate_analysis', displayName: 'Log rate analysis' }],
    }));
    const post = jest.fn(async () => ({
      leads: [],
      entities: {},
      status: 'no_change',
      pivot: { field: 'service.name', value: 'payments-service' },
    }));

    const { core } = makeCore({ get, post });
    const { unmount } = renderFlyoutContainer({
      core,
      seed: makeSeed({
        origin: { app: 'discover', surface: 'histogram' },
        entities: { 'service.name': 'checkout' },
      }),
      onClose: jest.fn(),
    });

    await screen.findByText('No strong related changes found');
    expect(screen.queryByTestId('signalInvestigationWindowPivot')).not.toBeInTheDocument();
    unmount();

    renderFlyoutContainer({
      core,
      seed: makeSeed({
        origin: { app: 'discover', surface: 'histogram' },
        entities: {},
        hosts: ['host-1'],
      }),
      onClose: jest.fn(),
    });

    await screen.findByText('No strong related changes found');
    expect(screen.queryByTestId('signalInvestigationWindowPivot')).not.toBeInTheDocument();
  });

  it('renders a window pivot above the empty prompt with a shortened label, writes the full entity on click, keeps the selected chart metric, and supports multi-hop lead pivoting with a Back link', async () => {
    const longService = `payments-${'x'.repeat(130)}`;
    const get = jest.fn(async () => ({
      analyzers: [
        { id: 'log_rate_analysis', displayName: 'Log rate analysis' },
        { id: 'dependency_change_points', displayName: 'Dependency change points' },
      ],
    }));

    const post = jest.fn(async (path: string, options?: { body?: string }) => {
      const parsedSeed = options?.body
        ? (JSON.parse(options.body) as InvestigationSeed)
        : undefined;
      if (path === signalInvestigationLeadsPath('log_rate_analysis')) {
        if (!parsedSeed?.entities['service.name']) {
          return {
            leads: [],
            entities: {},
            status: 'no_change',
            pivot: { field: 'service.name', value: longService },
          } satisfies SignalAnalyzerResult;
        }
        return { leads: [], entities: {}, status: 'no_change' } satisfies SignalAnalyzerResult;
      }
      if (path === signalInvestigationLeadsPath('dependency_change_points')) {
        return {
          leads: [
            {
              id: 'dep-redis',
              analyzerId: 'dependency_change_points',
              summary: 'Latency spike on redis',
              relevance: 'One-hop dependency redis',
              ranking: { signal: 'strong', timing: 'during', relationship: 'dependency' },
              locatorParams: { dependencyName: 'redis' },
            },
          ],
          entities: {},
          status: 'found',
        } satisfies SignalAnalyzerResult;
      }
      return { leads: [], entities: {}, status: 'no_change' };
    });

    const { core } = makeCore({ get, post, feedbackEnabled: true });
    const user = userEvent.setup();

    renderFlyoutContainer({
      core,
      seed: makeSeed({
        origin: { app: 'dashboard', panelId: 'p-1', panelTitle: 'Logs panel' },
        metric: { operationType: 'count' },
        indexPattern: 'logs-*',
        entities: {},
      }),
      metricOptions: [
        { id: 'm1', label: 'Count (all)', operationType: 'count' },
        { id: 'm2', label: 'Count (errors)', operationType: 'count', field: 'error.message' },
      ],
      onClose: jest.fn(),
    });

    const windowPivotBtn = await screen.findByTestId('signalInvestigationWindowPivot');
    expect(windowPivotBtn).toHaveTextContent(`Investigate ${longService.slice(0, 120)}…`);
    expect(screen.getByText('No strong related changes found')).toBeInTheDocument();

    const metricPicker = screen.getByTestId('signalInvestigationMetricPicker');
    await user.selectOptions(metricPicker, 'm2');
    expect(metricPicker).toHaveValue('m2');

    await user.click(await screen.findByTestId('signalInvestigationWindowPivot'));

    expect(await screen.findByText('Latency spike on redis')).toBeInTheDocument();
    expect(screen.getByTestId('signalInvestigationMetricPicker')).toHaveValue('m2');
    expect(post).toHaveBeenCalledWith(
      signalInvestigationLeadsPath('dependency_change_points'),
      expect.objectContaining({
        body: expect.stringContaining(`"service.name":"${longService}"`),
      })
    );
    expect(screen.getByTestId('signalInvestigationBackLink')).toHaveTextContent(
      'Back to Logs panel'
    );

    const usefulButton = screen.getByTestId('signalInvestigationFeedbackUseful-dep-redis');
    await user.click(usefulButton);
    expect(usefulButton).toHaveAttribute('aria-pressed', 'true');

    const leadPivotLink = screen.getByTestId('signalInvestigationLeadPivot-dep-redis');
    expect(leadPivotLink).toHaveTextContent('Investigate redis');
    await user.click(leadPivotLink);

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        signalInvestigationLeadsPath('dependency_change_points'),
        expect.objectContaining({
          body: expect.stringContaining('"service.name":"redis"'),
        })
      );
    });
    expect(screen.getByTestId('signalInvestigationBackLink')).toHaveTextContent(
      `Back to ${longService.slice(0, 120)}…`
    );

    await user.click(screen.getByTestId('signalInvestigationBackLink'));
    expect(await screen.findByTestId('signalInvestigationBackLink')).toHaveTextContent(
      'Back to Logs panel'
    );
    expect(screen.getByTestId('signalInvestigationFeedbackUseful-dep-redis')).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });
});
