/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  deriveConversationIds,
  PHASE_CATALOG,
  PHASE_IDS,
  PND_CONVERSATIONS_URL,
  PND_GATE_IDS,
  PND_PROPOSALS_URL,
  RECOMMENDED_ACTIONS,
} from '@kbn/pnd-common';
import type {
  ListProposalsResponse,
  PndPhaseStepProjection,
  PndProposalRow,
} from '@kbn/pnd-common';

import { PND_EXECUTION_CORRELATED_HEADER } from '../../../common/constants';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import { PND_PHASE_STEP_STATUSES } from '../phase_step_status_badge';
import type { PndPhaseStepStatusName } from '../phase_step_status_badge';
import { UNKNOWN_LABEL } from '../phase_step_status_badge/translations';
import { DUPLICATED_GATE_PAIRS } from './helpers/build_lifecycle_rows';
import { LifecycleView } from './lifecycle_view';
import { AGENT_BUILDER_APP_ID } from './hooks/use_open_agent_builder_conversation';

/**
 * Retries are switched off here so a 503 reaches its state on the first render rather than after
 * three exponential-backoff attempts. The predicate itself is unit-tested in
 * `hooks/retry_on_transient_error`; this suite is about which state the view shows.
 */
jest.mock('../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const ATTACK_DISCOVERY_ALERT_ID = 'ad-1';
const EXECUTIONS_URL = `/internal/pnd/executions/${ATTACK_DISCOVERY_ALERT_ID}`;

const workflowIdFor = (phaseStepId: string): string =>
  phaseStepId.startsWith('step-4') || phaseStepId === 'gate-apply-tuning'
    ? 'system-security-watch-post-incident'
    : 'system-security-watch-deep';

/** The ids of the catalog rows a PND step execution realizes, which is every row but the two upstream ones. */
const LIVE_CATALOG_IDS: readonly string[] = PHASE_CATALOG.filter(
  ({ liveness }) => liveness === 'live'
).map(({ id }) => id);

/**
 * Every catalog row as a fully executed loop returns it: each live row on its own step execution, and
 * the two `upstream` rows resolved from the catalog alone — no step execution and no deep link,
 * because Attack Discovery performs that work before PND is invoked.
 */
const fullProjection = (): PndPhaseStepProjection[] =>
  PHASE_CATALOG.map(({ id, liveness }) =>
    liveness === 'live'
      ? {
          deepLinkPath: `/${workflowIdFor(
            id
          )}?tab=executions&executionId=run-1&stepExecutionId=${id}-step`,
          finishedAt: '2026-08-03T10:00:01.000Z',
          phaseStepId: id,
          startedAt: '2026-08-03T10:00:00.000Z',
          status: 'completed',
          stepExecutionId: `${id}-step`,
          workflowId: workflowIdFor(id),
          workflowRunId: 'run-1',
        }
      : { phaseStepId: id, status: 'upstream' }
  );

/**
 * The statuses a live row can carry, cycled across the live rows so all of them appear in one
 * render — which is what makes "no row falls back to the unknown badge" a real assertion rather
 * than a statement about one happy path.
 */
const LIVE_STATUSES = [
  'completed',
  'failed',
  'not_started',
  'running',
  'skipped',
  'waiting_for_input',
] as const;

/**
 * A mid-loop projection: every live status appears at least once, and the two upstream rows stay
 * `upstream`.
 */
const mixedProjection = (): PndPhaseStepProjection[] => {
  const liveIds = PHASE_CATALOG.filter(({ liveness }) => liveness === 'live').map(({ id }) => id);

  return fullProjection().map((step) => {
    const liveIndex = liveIds.indexOf(step.phaseStepId);

    return liveIndex === -1
      ? step
      : { ...step, status: LIVE_STATUSES[liveIndex % LIVE_STATUSES.length] };
  });
};

/** The skeleton an older discovery gets back: no row names a run. */
const uncorrelatedProjection = (): PndPhaseStepProjection[] =>
  PHASE_CATALOG.map(({ id, liveness }) => ({
    phaseStepId: id,
    status: liveness === 'live' ? 'not_started' : 'upstream',
  }));

const tuningProposal = (overrides: Partial<PndProposalRow> = {}): PndProposalRow => ({
  alwaysGate: true,
  correlationId: ATTACK_DISCOVERY_ALERT_ID,
  createdAt: '2026-08-03T10:00:00.000Z',
  gateId: PND_GATE_IDS.applyTuning,
  inputSchema: {},
  message: 'Apply this detection-rule tuning?',
  reasoning: 'The backup service account triggers this rule nightly.',
  recommendedAction: RECOMMENDED_ACTIONS[3],
  reversible: false,
  sourceId: 'source-1',
  stepExecutionId: 'gate-step',
  stepId: 'await_apply_tuning',
  title: 'Apply tuning',
  workflowId: 'system-security-watch-post-incident',
  workflowRunId: 'run-1',
  ...overrides,
});

const noProposals: ListProposalsResponse = { groups: [], total: 0 };

const { investigationConversationId } = deriveConversationIds(ATTACK_DISCOVERY_ALERT_ID);

const investigationConversation = {
  correlationId: ATTACK_DISCOVERY_ALERT_ID,
  createdAt: '2026-08-03T10:00:00.000Z',
  id: investigationConversationId,
  kind: 'investigation' as const,
  title: 'Suspicious activity',
  updatedAt: '2026-08-03T10:05:00.000Z',
};

interface RouteResponses {
  conversations?: unknown;
  executions?: unknown;
  /** Response headers for the executions read, e.g. the correlation signal. */
  executionsHeaders?: Record<string, string>;
  proposals?: unknown;
}

describe('LifecycleView', () => {
  const get = jest.fn();
  const mockGetUrlForApp = jest.fn();
  const mockNavigateToApp = jest.fn();

  const services = {
    application: { getUrlForApp: mockGetUrlForApp, navigateToApp: mockNavigateToApp },
    http: { get },
  };

  const stubRoutes = ({
    conversations,
    executions,
    executionsHeaders,
    proposals,
  }: RouteResponses = {}) => {
    get.mockImplementation(async (path: string) => {
      if (path === PND_CONVERSATIONS_URL) {
        return conversations ?? { conversations: [], total: 0 };
      }
      if (path === PND_PROPOSALS_URL) {
        // the proposals read is `asResponse: true` too, because the Attack Discovery 2.0 signal is
        // a header; the tuning evidence shares that one read rather than issuing a second
        return createHttpResponse({ body: proposals ?? noProposals });
      }
      if (path === EXECUTIONS_URL) {
        if (executions instanceof Error) {
          throw executions;
        }

        // the executions read is `asResponse: true`, because the correlation signal is a header
        return createHttpResponse({
          body: executions ?? {
            correlationId: ATTACK_DISCOVERY_ALERT_ID,
            steps: fullProjection(),
          },
          headers: executionsHeaders,
        });
      }

      throw new Error(`unexpected request: ${path}`);
    });
  };

  const renderView = () =>
    renderWithPndProviders(<LifecycleView correlationId={ATTACK_DISCOVERY_ALERT_ID} />, {
      services,
    });

  const renderViewWithoutDiscovery = () => renderWithPndProviders(<LifecycleView />, { services });

  const waitForRows = async () => {
    await waitFor(() =>
      expect(screen.queryAllByTestId('pndLifecycleStepRow').length).toBeGreaterThan(0)
    );
  };

  /** RTL's `selector` option does not compose with the test-id attribute here, so filter by hand. */
  const rowFor = (phaseStepId: string): HTMLElement => {
    const row = screen
      .getAllByTestId('pndLifecycleStepRow')
      .find((candidate) => candidate.getAttribute('data-phase-step-id') === phaseStepId);

    if (row == null) {
      throw new Error(`no row rendered for ${phaseStepId}`);
    }

    return row;
  };

  const groupFor = (phase: string): HTMLElement => {
    const group = screen
      .getAllByTestId('pndPhaseGroup')
      .find((candidate) => candidate.getAttribute('data-phase') === phase);

    if (group == null) {
      throw new Error(`no group rendered for ${phase}`);
    }

    return group;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUrlForApp.mockImplementation(
      (appId: string, { path }: { path: string }) => `/s/agent-4/app/${appId}${path}`
    );
    stubRoutes();
  });

  it('renders one row per catalog entry, minus the three that render as subordinate lines', async () => {
    renderView();
    await waitForRows();

    expect(screen.getAllByTestId('pndLifecycleStepRow')).toHaveLength(
      PHASE_CATALOG.length - screen.getAllByTestId('pndLifecycleSubordinateLine').length
    );
  });

  it('renders all 14 catalog entries, as rows plus subordinate lines', async () => {
    renderView();
    await waitForRows();

    const rendered = [
      ...screen.getAllByTestId('pndLifecycleStepRow'),
      ...screen.getAllByTestId('pndLifecycleSubordinateLine'),
    ].map((element) => element.getAttribute('data-phase-step-id'));

    expect(rendered.sort()).toEqual(PHASE_CATALOG.map(({ id }) => id).sort());
  });

  it('gives every live entry a link to its own step execution', async () => {
    renderView();
    await waitForRows();

    const hrefs = screen
      .getAllByTestId('pndLifecycleStepLink')
      .map((link) => link.getAttribute('href'));

    expect(new Set(hrefs).size).toBe(LIVE_CATALOG_IDS.length);
  });

  it('says so in words on each upstream row rather than offering a link that goes nowhere', async () => {
    renderView();
    await waitForRows();

    expect(screen.getAllByTestId('pndLifecycleStepLinkUnavailable')).toHaveLength(
      PHASE_CATALOG.length - LIVE_CATALOG_IDS.length
    );
  });

  it('never renders completed on an upstream row, even when the projection claims it', async () => {
    stubRoutes({
      executions: {
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        // a widened server could project one; the view still refuses to credit PND with the work
        steps: fullProjection().map((step) => ({ ...step, status: 'completed' as const })),
      },
    });

    renderView();
    await waitForRows();

    const nonLiveIds = PHASE_CATALOG.filter(({ liveness }) => liveness !== 'live').map(
      ({ id }) => id
    );
    const nonLiveStatuses = screen
      .getAllByTestId('pndLifecycleStepRow')
      .filter((row) => nonLiveIds.includes(row.getAttribute('data-phase-step-id') ?? ''))
      .map((row) => row.getAttribute('data-status'));

    expect(nonLiveStatuses).not.toContain('completed');
  });

  describe('every status the projection can send arrives intact', () => {
    beforeEach(() => {
      stubRoutes({
        executions: {
          correlationId: ATTACK_DISCOVERY_ALERT_ID,
          steps: mixedProjection(),
        },
        executionsHeaders: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
      });
    });

    it('renders no row with a status the badge does not know', async () => {
      renderView();
      await waitForRows();

      const rendered = screen
        .getAllByTestId('pndPhaseStepStatusBadge')
        .map((badge) => badge.getAttribute('data-status'));

      expect(
        rendered.filter(
          (status) => !PND_PHASE_STEP_STATUSES.includes(status as PndPhaseStepStatusName)
        )
      ).toEqual([]);
    });

    it('renders no unknown badge, which is what a fallback would look like on screen', async () => {
      renderView();
      await waitForRows();

      expect(screen.queryAllByText(UNKNOWN_LABEL)).toEqual([]);
    });

    it('renders every non-live row as upstream', async () => {
      renderView();
      await waitForRows();

      const nonLiveIds = PHASE_CATALOG.filter(({ liveness }) => liveness !== 'live').map(
        ({ id }) => id
      );
      const nonLiveStatuses = screen
        .getAllByTestId('pndLifecycleStepRow')
        .filter((row) => nonLiveIds.includes(row.getAttribute('data-phase-step-id') ?? ''))
        .map((row) => row.getAttribute('data-status'));

      expect(new Set(nonLiveStatuses)).toEqual(new Set(['upstream']));
    });

    it('gives every rendered row a status badge, so none of the 11 reads blank', async () => {
      renderView();
      await waitForRows();

      expect(screen.getAllByTestId('pndPhaseStepStatusBadge')).toHaveLength(
        screen.getAllByTestId('pndLifecycleStepRow').length
      );
    });
  });

  it('renders the four phase groups, in phase order', async () => {
    renderView();
    await waitForRows();

    expect(
      screen.getAllByTestId('pndPhaseGroup').map((group) => group.getAttribute('data-phase'))
    ).toEqual([...PHASE_IDS]);
  });

  describe('grouping and ordering follow PHASE_CATALOG', () => {
    const subordinateIds = DUPLICATED_GATE_PAIRS.map(({ subordinateId }) => subordinateId);

    /** Ids rendered inside one phase group, in DOM order. */
    const renderedIn = (phase: string, testSubj: string): string[] =>
      Array.from(groupFor(phase).querySelectorAll(`[data-test-subj="${testSubj}"]`)).map(
        (element) => element.getAttribute('data-phase-step-id') ?? ''
      );

    it.each([...PHASE_IDS])('renders %s rows in catalog order', async (phase) => {
      renderView();
      await waitForRows();

      expect(renderedIn(phase, 'pndLifecycleStepRow')).toEqual(
        PHASE_CATALOG.filter(
          (entry) => entry.phase === phase && !subordinateIds.includes(entry.id)
        ).map(({ id }) => id)
      );
    });

    it.each([...PHASE_IDS])(
      'renders every %s catalog entry inside that phase group',
      async (phase) => {
        renderView();
        await waitForRows();

        expect(
          [
            ...renderedIn(phase, 'pndLifecycleStepRow'),
            ...renderedIn(phase, 'pndLifecycleSubordinateLine'),
          ].sort()
        ).toEqual(
          PHASE_CATALOG.filter((entry) => entry.phase === phase)
            .map(({ id }) => id)
            .sort()
        );
      }
    );
  });

  it('counts every catalog entry of a phase, including the ones rendered as subordinate lines', async () => {
    renderView();
    await waitForRows();

    const investigation = groupFor('investigation');

    expect(investigation.querySelector('[data-test-subj="pndPhaseGroupCount"]')).toHaveTextContent(
      `${PHASE_CATALOG.filter(({ phase }) => phase === 'investigation').length} steps`
    );
  });

  it('renders the could-not-correlate state when no row names a run', async () => {
    stubRoutes({
      executions: {
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        steps: uncorrelatedProjection(),
      },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument()
    );
  });

  it('renders no skeleton of rows when correlation found nothing', async () => {
    stubRoutes({
      executions: {
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        steps: uncorrelatedProjection(),
      },
    });

    renderView();
    await waitFor(() =>
      expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument()
    );

    expect(screen.queryAllByTestId('pndLifecycleStepRow')).toHaveLength(0);
  });

  it('renders the could-not-correlate state for a response with no rows at all', async () => {
    stubRoutes({
      executions: { correlationId: ATTACK_DISCOVERY_ALERT_ID, steps: [] },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument()
    );
  });

  it('renders the could-not-correlate state when the server stamped the signal header false', async () => {
    stubRoutes({
      executions: {
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        steps: uncorrelatedProjection(),
      },
      executionsHeaders: { [PND_EXECUTION_CORRELATED_HEADER]: 'false' },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByTestId('pndCorrelationUnavailableState')).toBeInTheDocument()
    );
  });

  it('renders the rows for a run that correlated but has not reached them yet, never the could-not-correlate state', async () => {
    // the whole reason the signal is a header: this body is byte-identical to an uncorrelated one
    stubRoutes({
      executions: {
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        steps: uncorrelatedProjection(),
      },
      executionsHeaders: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
    });

    renderView();
    await waitForRows();

    expect(screen.queryByTestId('pndCorrelationUnavailableState')).not.toBeInTheDocument();
  });

  it('shows a just-started run as not started rather than as unknown', async () => {
    stubRoutes({
      executions: {
        correlationId: ATTACK_DISCOVERY_ALERT_ID,
        steps: uncorrelatedProjection(),
      },
      executionsHeaders: { [PND_EXECUTION_CORRELATED_HEADER]: 'true' },
    });

    renderView();
    await waitForRows();

    expect(rowFor('step-1-1')).toHaveAttribute('data-status', 'not_started');
  });

  it('renders the workflows-unavailable state for a 503, never an empty lifecycle', async () => {
    stubRoutes({ executions: createHttpFetchError({ status: 503 }) });

    renderView();

    await waitFor(() =>
      expect(screen.getByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument()
    );
  });

  it('renders the error state for a 404, which means the discovery is not readable', async () => {
    stubRoutes({ executions: createHttpFetchError({ status: 404 }) });

    renderView();

    await waitFor(() => expect(screen.getByTestId('pndErrorState')).toBeInTheDocument());
  });

  it('asks for guidance instead of reading anything without a discovery id', () => {
    renderViewWithoutDiscovery();

    expect(screen.getByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('reads nothing at all without a discovery id', () => {
    renderViewWithoutDiscovery();

    expect(get).not.toHaveBeenCalled();
  });

  it('offers to open the investigation conversation once it exists', async () => {
    stubRoutes({ conversations: { conversations: [investigationConversation], total: 1 } });

    renderView();
    await waitForRows();

    await waitFor(() =>
      expect(screen.getAllByTestId('pndLifecycleOpenConversation')).toHaveLength(1)
    );
  });

  it('opens the conversation in Agent Builder, in a new tab', async () => {
    stubRoutes({ conversations: { conversations: [investigationConversation], total: 1 } });

    renderView();
    await waitFor(() =>
      expect(screen.getAllByTestId('pndLifecycleOpenConversation')).toHaveLength(1)
    );
    fireEvent.click(screen.getAllByTestId('pndLifecycleOpenConversation')[0]);

    expect(mockNavigateToApp).toHaveBeenCalledWith(AGENT_BUILDER_APP_ID, {
      openInNewTab: true,
      path: `/conversations/${investigationConversationId}`,
    });
  });

  it('offers no conversation action while the derived thread does not exist', async () => {
    renderView();
    await waitForRows();

    expect(screen.queryByTestId('pndLifecycleOpenConversation')).not.toBeInTheDocument();
  });

  it('renders the drafted tuning on the approve-tuning row when a gate is pending', async () => {
    stubRoutes({
      proposals: {
        groups: [{ proposals: [tuningProposal()], recommendedAction: RECOMMENDED_ACTIONS[3] }],
        total: 1,
      },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByTestId('pndLifecycleTuningEvidence')).toBeInTheDocument()
    );
  });

  it('says the backtest is unavailable rather than leaving a blank when preview is absent', async () => {
    stubRoutes({
      proposals: {
        groups: [{ proposals: [tuningProposal()], recommendedAction: RECOMMENDED_ACTIONS[3] }],
        total: 1,
      },
    });

    renderView();

    await waitFor(() =>
      expect(screen.getByTestId('pndBacktestComparisonUnavailable')).toBeInTheDocument()
    );
  });

  it('renders the backtest when the proposal carries one', async () => {
    stubRoutes({
      proposals: {
        groups: [
          {
            proposals: [
              tuningProposal({ preview: { after: { alertCount: 1 }, before: { alertCount: 9 } } }),
            ],
            recommendedAction: RECOMMENDED_ACTIONS[3],
          },
        ],
        total: 1,
      },
    });

    renderView();

    await waitFor(() => expect(screen.getByTestId('pndBacktestComparison')).toBeInTheDocument());
  });

  it('renders the reasoning the model wrote for the tuning', async () => {
    stubRoutes({
      proposals: {
        groups: [{ proposals: [tuningProposal()], recommendedAction: RECOMMENDED_ACTIONS[3] }],
        total: 1,
      },
    });

    renderView();

    await waitFor(() =>
      expect(
        screen.getByText('The backup service account triggers this rule nightly.')
      ).toBeInTheDocument()
    );
  });

  it('renders no tuning evidence when no tuning gate is pending', async () => {
    renderView();
    await waitForRows();

    expect(screen.queryByTestId('pndLifecycleTuningEvidence')).not.toBeInTheDocument();
  });

  it('renders the lifecycle even when the proposals read fails, because evidence is supplementary', async () => {
    get.mockImplementation(async (path: string) => {
      if (path === PND_PROPOSALS_URL) {
        throw createHttpFetchError({ status: 403 });
      }
      if (path === PND_CONVERSATIONS_URL) {
        return { conversations: [], total: 0 };
      }
      return createHttpResponse({
        body: { correlationId: ATTACK_DISCOVERY_ALERT_ID, steps: fullProjection() },
      });
    });

    renderView();

    await waitForRows();
    expect(screen.getAllByTestId('pndLifecycleStepRow').length).toBeGreaterThan(0);
  });
});
