/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  CONVERSATION_QUEUE_CATEGORIES,
  PND_CONVERSATIONS_URL,
  PND_DISCOVERY_CONTEXT_URL,
  PND_GATE_IDS,
  PND_PROPOSALS_HISTORY_URL,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
  buildProposalRespondUrl,
  buildTuningApplyUrl,
  deriveConversationIds,
} from '@kbn/pnd-common';
import type {
  GetDiscoveryContextResponse,
  ListConversationsResponse,
  ListProposalsResponse,
  PndProposalRow,
  RecommendedAction,
} from '@kbn/pnd-common';
import { QUEUE_GROUP_MODE_STORAGE_KEY } from '../../components/queue';
import { PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER } from '../../../common/constants';
import { renderWithPndProviders } from '../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../test_helpers/create_http_fetch_error';
import { createHttpResponse } from '../../test_helpers/create_http_response';
import {
  createPndTestServices,
  type PndTestServices,
} from '../../test_helpers/render_with_providers';
import { ConversationsPage } from '.';

/**
 * Retries are switched off so a failed read reaches its state on the first render:
 * a hook's own `retry` beats the shared test client's `retry: false`.
 */
jest.mock('../../hooks/retry_on_transient_error', () => ({
  MAX_RETRY_ATTEMPTS: 3,
  retryOnTransientError: () => false,
}));

const RULE_ID = '8f0a1b2c-3d4e-5f60-7182-93a4b5c6d7e8';
const RULE_NAME = 'Endpoint Security [Insights]';

/**
 * The approval card's fallback controls. Every PND fixture carries `inputSchema: {}`, which
 * `canRenderWithSchemaForm` refuses, so this is the branch the page renders — the decision is a
 * *field* there rather than a pair of buttons on the row (annotation 8b).
 */
const FIXED_CONTROL = 'pndFixedDecisionFormControl';

/** The reasoning summary the Detection Watch composes for its tuning gate. */
const TUNE_REASONING = `Approval writes to a production detection rule. Rule: "${RULE_NAME}" (id ${RULE_ID}). Proposed change, restricted to enabled / investigation_fields / note: {"enabled":false}. Backtest over the same window — alerts as-is: 95; as-proposed: 3.`;

/**
 * The registry's own action-to-gate mapping, so a fixture's `gateId` and its `recommendedAction`
 * describe the same gate. A fixture with an invented `gate-<action>` id is a registry miss.
 */
const GATE_ID_BY_ACTION: Readonly<Record<RecommendedAction, string>> = {
  contain: PND_GATE_IDS.incidentContained,
  escalate: PND_GATE_IDS.promoteIncident,
  investigate: PND_GATE_IDS.openInvestigation,
  tune: PND_GATE_IDS.applyTuning,
};

const createProposal = ({
  recommendedAction,
  workflowId = SYSTEM_SECURITY_WATCH_DEEP_ID,
}: {
  recommendedAction: RecommendedAction;
  workflowId?: string;
}): PndProposalRow => ({
  alwaysGate: recommendedAction === 'contain' || recommendedAction === 'tune',
  // the watch is part of the id because two rows in the same bucket come from two runs of two
  // watches, over two *different* discoveries: sharing one id would make the enrichment of one
  // row answer for both
  correlationId: `alert-${recommendedAction}-${workflowId}`,
  createdAt: '2026-08-03T12:00:00.000Z',
  gateId: GATE_ID_BY_ACTION[recommendedAction],
  inputSchema: {},
  message: `Gate message for ${recommendedAction}`,
  reasoning: recommendedAction === 'tune' ? TUNE_REASONING : `Reasoning for ${recommendedAction}`,
  recommendedAction,
  reversible: recommendedAction === 'investigate',
  sourceId: `${workflowId}:run-${recommendedAction}:step-${recommendedAction}`,
  stepExecutionId: `step-${recommendedAction}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message for ${recommendedAction}`,
  workflowId,
  workflowRunId: `run-${recommendedAction}`,
});

const investigateProposal = createProposal({ recommendedAction: 'investigate' });
const tuneProposal = createProposal({
  recommendedAction: 'tune',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
});

const allFourBuckets: ListProposalsResponse = {
  groups: [
    { proposals: [createProposal({ recommendedAction: 'contain' })], recommendedAction: 'contain' },
    {
      proposals: [createProposal({ recommendedAction: 'escalate' })],
      recommendedAction: 'escalate',
    },
    { proposals: [investigateProposal], recommendedAction: 'investigate' },
    { proposals: [tuneProposal], recommendedAction: 'tune' },
  ],
  total: 4,
};

const oneProposal: ListProposalsResponse = {
  groups: [{ proposals: [investigateProposal], recommendedAction: 'investigate' }],
  total: 1,
};

/**
 * The one gate that opens a container the analyst can be sent to: `promote_incident` (2026-08-17,
 * decision 6). `escalate` maps to it through `GATE_ID_BY_ACTION` above.
 */
const escalateProposal = createProposal({ recommendedAction: 'escalate' });

const oneEscalation: ListProposalsResponse = {
  groups: [{ proposals: [escalateProposal], recommendedAction: 'escalate' }],
  total: 1,
};

const investigateFromDetection = createProposal({
  recommendedAction: 'investigate',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
});

/** One row from each of two watches, in one bucket: the shape the watch chips exist for. */
const twoWatches: ListProposalsResponse = {
  groups: [
    {
      proposals: [investigateProposal, investigateFromDetection],
      recommendedAction: 'investigate',
    },
  ],
  total: 2,
};

const oneTuneProposal: ListProposalsResponse = {
  groups: [{ proposals: [tuneProposal], recommendedAction: 'tune' }],
  total: 1,
};

/**
 * The enrichment behind the two rows of {@link twoWatches}: one shared host, and an account only the
 * Deep Watch's discovery reached — which is what makes an entity chip a real filter rather than a
 * no-op, and gives each row a different risk score.
 */
const twoWatchesContext: GetDiscoveryContextResponse = {
  contexts: [
    {
      correlationId: investigateProposal.correlationId,
      entities: [
        { count: 4, field: 'host.name', value: 'host-1' },
        { count: 2, field: 'user.name', value: 'svc-backup' },
      ],
      riskScore: 73,
    },
    {
      correlationId: investigateFromDetection.correlationId,
      entities: [{ count: 3, field: 'host.name', value: 'host-1' }],
      riskScore: 0,
    },
  ],
};

const NO_CONVERSATIONS: ListConversationsResponse = { conversations: [], total: 0 };

/**
 * Answers whichever route is asked for. The queue, the enrichment and the conversations are three reads
 * on three keys, so a single resolved value would hand the enrichment a `ListProposalsResponse` and
 * vice versa — and `useProposals` is the only PND read that takes `asResponse`, so they do not even
 * share a shape.
 */
const mockGet = ({
  body,
  conversations = NO_CONVERSATIONS,
  discoveryContext = { contexts: [] },
  headers,
  services,
}: {
  body?: ListProposalsResponse;
  conversations?: ListConversationsResponse;
  discoveryContext?: GetDiscoveryContextResponse;
  headers?: Record<string, string>;
  services: PndTestServices;
}) => {
  services.http.get.mockImplementation(async (path: string) => {
    if (path === PND_DISCOVERY_CONTEXT_URL) {
      return discoveryContext;
    }

    if (path === PND_CONVERSATIONS_URL) {
      return conversations;
    }

    return createHttpResponse({ body, headers });
  });
};

const renderQueue = ({
  body,
  conversations,
  discoveryContext,
  error,
  headers,
  services = createPndTestServices(),
}: {
  body?: ListProposalsResponse;
  conversations?: ListConversationsResponse;
  discoveryContext?: GetDiscoveryContextResponse;
  error?: unknown;
  headers?: Record<string, string>;
  services?: PndTestServices;
} = {}) => {
  if (error != null) {
    services.http.get.mockRejectedValue(error);
  } else {
    mockGet({ body, conversations, discoveryContext, headers, services });
  }

  // spread, because the shared wrapper takes `Record<string, unknown>` and an
  // interface has no implicit index signature
  return {
    ...renderWithPndProviders(<ConversationsPage />, { route: '/', services: { ...services } }),
    services,
  };
};

/** jsdom implements no layout, so `scrollIntoView` does not exist on its elements at all. */
const scrollIntoView = jest.fn();
window.HTMLElement.prototype.scrollIntoView = scrollIntoView;

/**
 * Answers the first row on screen the way an analyst does: open its approval modal, choose a
 * decision, give a reason, submit.
 *
 * The decision is a *field* now rather than a pair of buttons on the row, because the gate's own
 * `inputSchema` declares what answering it means (annotation 8b). Every PND fixture carries `{}`,
 * which `canRenderWithSchemaForm` refuses, so it is the card's fixed-control fallback that renders.
 */
const answerGate = async ({
  decision,
  rationale = 'Confirmed on host-1.',
}: {
  decision: 'approve' | 'dismiss';
  rationale?: string;
}) => {
  fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);
  chooseDecision(decision);
  typeRationale(rationale);
  fireEvent.click(screen.getByTestId('hitlCardApprove'));
};

const chooseDecision = (decision: 'approve' | 'dismiss') => {
  fireEvent.change(screen.getByTestId(`${FIXED_CONTROL}-decision`), {
    target: { value: decision },
  });
};

const typeRationale = (rationale: string) => {
  fireEvent.change(screen.getByTestId(`${FIXED_CONTROL}-rationale`), {
    target: { value: rationale },
  });
};

/** The chip for one entity, by what it announces: every chip shares one `data-test-subj`. */
const entityChip = (field: string, value: string): HTMLElement =>
  screen.getByRole('button', {
    name: new RegExp(`^Filter the queue by ${field} ${value},`),
  });

/** Approves the one tune row: through the modal, then through the rule-id dialog behind it. */
const approveTuning = async ({
  rationale = 'Ten false positives a day on the patch window.',
  ruleId,
}: { rationale?: string; ruleId?: string } = {}) => {
  await answerGate({ decision: 'approve', rationale });

  if (ruleId != null) {
    fireEvent.change(screen.getByTestId('pndRuleIdConfirmDialogRuleId'), {
      target: { value: ruleId },
    });
  }

  fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));
};

/**
 * Answers the Detection Watch's only row while the queue is filtered to that watch, and lets the
 * refetch that follows return a queue without it.
 *
 * Neither filter can empty the list on its own — the watch chips and the blast radius chips are both
 * derived from the rows on screen, so picking either always leaves at least one row — but a filter
 * outlives the rows it was set against. With a filter still active the type sections and KPI tiles
 * stay, at zero.
 */
const answerTheLastRowFromTheFilteredWatch = async () => {
  const services = createPndTestServices();
  let isFirstQueueRead = true;
  services.http.get.mockImplementation(async (path: string) => {
    if (path === PND_DISCOVERY_CONTEXT_URL) {
      return { contexts: [] };
    }

    if (path === PND_CONVERSATIONS_URL) {
      return NO_CONVERSATIONS;
    }

    const body = isFirstQueueRead ? twoWatches : oneProposal;
    isFirstQueueRead = false;

    return createHttpResponse({ body });
  });
  services.http.post.mockResolvedValue({
    resumed: true,
    sourceId: investigateFromDetection.sourceId,
  });

  const rendered = renderWithPndProviders(<ConversationsPage />, {
    route: '/',
    services: { ...services },
  });

  fireEvent.click(
    await screen.findByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
  );
  await answerGate({ decision: 'approve' });
  await waitFor(() =>
    expect(screen.getByTestId('pndQueueTypeSectionCount-investigate')).toHaveTextContent('0')
  );

  return rendered;
};

describe('ConversationsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('renders one row per pending gate, from the live queue', async () => {
    renderQueue({ body: allFourBuckets });

    expect(await screen.findAllByTestId('pndQueueRow')).toHaveLength(4);
  });

  it.each<RecommendedAction>(['contain', 'escalate', 'investigate', 'tune'])(
    'groups the %s row under its type section',
    async (recommendedAction) => {
      renderQueue({ body: allFourBuckets });

      expect(
        await screen.findByTestId(`pndQueueTypeSection-${recommendedAction}`)
      ).toBeInTheDocument();
    }
  );

  it('draws the four category sections in contain → escalate → investigate → tune order', async () => {
    renderQueue({ body: allFourBuckets });
    await screen.findAllByTestId('pndQueueRow');

    expect(
      screen
        .getAllByTestId(/^pndQueueTypeSection-[a-z]/)
        .map(
          (section) =>
            section.getAttribute('data-test-subj')?.replace('pndQueueTypeSection-', '') ?? ''
        )
    ).toEqual(CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => id));
  });

  /**
   * The phase pills are gone (D11): the four phases are the KPI tiles above the queue, so a pill that
   * hid three of the four could make "nothing to contain" and "you are looking at the tune pill" paint
   * identically. This pins the removal rather than trusting the diff.
   */
  it('offers no phase filter, because a phase is a KPI tile now', async () => {
    renderQueue({ body: allFourBuckets });

    await screen.findAllByTestId('pndQueueRow');

    expect(screen.queryAllByTestId(/^pndBriefBucketPill-/)).toHaveLength(0);
  });

  it('offers the grouping control, defaulting to group-by-type', async () => {
    renderQueue({ body: allFourBuckets });

    expect(await screen.findByTestId('pndQueueGroupControl')).toHaveTextContent('Type');
  });

  it('keeps the selected grouping mode after a reload', async () => {
    renderQueue({ body: allFourBuckets });
    fireEvent.click(await screen.findByTestId('pndQueueGroupControl'));
    fireEvent.click(screen.getByTestId('pndQueueGroupModeOption-thread'));

    expect(window.sessionStorage.getItem(QUEUE_GROUP_MODE_STORAGE_KEY)).toEqual('thread');
  });

  it('filters by the watch that asked', async () => {
    renderQueue({ body: allFourBuckets });

    fireEvent.click(
      await screen.findByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );

    expect(screen.getAllByTestId('pndQueueRow')).toHaveLength(1);
    expect(screen.getByTestId('pndQueueTypeSectionCount-contain')).toHaveTextContent('0');
  });

  it('clears the watch filter when the selected chip is clicked again', async () => {
    renderQueue({ body: allFourBuckets });

    fireEvent.click(
      await screen.findByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );
    fireEvent.click(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );

    expect(screen.getAllByTestId('pndQueueRow')).toHaveLength(4);
  });
});

/**
 * Annotation 1b-d. The greeting replaces a fixed "Good afternoon." plus a paragraph explaining the
 * queue's semantics; what is left is the one number that decides whether the analyst keeps reading.
 */
describe('ConversationsPage — the header', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('leads with the hero, which is what marks the page as the AI surface', async () => {
    renderQueue({ body: oneProposal });

    expect(await screen.findByRole('img', { name: 'AlertZero' })).toBeInTheDocument();
  });

  it('greets the analyst', async () => {
    renderQueue({ body: oneProposal });

    expect(await screen.findByTestId('pndPageHeader')).toHaveTextContent(/Good \w+!/);
  });

  /**
   * The badge renders nothing unless `xpack.pnd.demo.forceIncident` is on, so this asserts the slot is
   * wired rather than the badge is drawn: a run that skipped the assessment must never present its
   * verdict as a real one, and the queue is the first place it would.
   */
  it('carries no demo badge on an ordinary read', async () => {
    renderQueue({ body: oneProposal });

    await screen.findAllByTestId('pndQueueRow');

    expect(screen.queryByTestId('pndDemoModeBadge')).not.toBeInTheDocument();
  });

  /**
   * The rows are awaited first, deliberately: the header is drawn over the *loading* queue too, and
   * a count is the one thing it cannot know yet, so asserting on the first render it can find would
   * only ever read "No actions need you".
   */
  it('says how many actions need a person', async () => {
    renderQueue({ body: allFourBuckets });
    await screen.findAllByTestId('pndQueueRow');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('4 actions need you');
  });

  it('says it in the singular for one action', async () => {
    renderQueue({ body: oneProposal });
    await screen.findAllByTestId('pndQueueRow');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 action needs you');
  });

  /**
   * The count is the **whole** queue, not the filtered view: a watch chip is the analyst narrowing
   * what they are reading, and a heading that dropped to "1 action needs you" because of a filter
   * would be telling them the queue had emptied.
   */
  it('keeps counting the whole queue while a watch filter narrows the rows', async () => {
    renderQueue({ body: allFourBuckets });

    fireEvent.click(
      await screen.findByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('4 actions need you');
  });

  it('is the page heading, because it is the top of the document', async () => {
    renderQueue({ body: oneProposal });

    expect(await screen.findByRole('heading', { level: 1 })).toHaveProperty('tagName', 'H1');
  });

  /** The subtitle explaining what the queue is went with the redesign: approvers read it once. */
  it('carries no explanatory subtitle', async () => {
    renderQueue({ body: oneProposal });

    await screen.findByRole('heading', { level: 1 });

    expect(screen.getByTestId('pndPageHeader')).not.toHaveTextContent(/one row per/i);
  });

  /** The record is a section below the queue now, so the header has nothing to open it with. */
  it('offers no button for the record, which is no longer an overlay', async () => {
    renderQueue({ body: oneProposal });

    await screen.findByRole('heading', { level: 1 });

    expect(screen.queryByTestId('pndBriefOpenHistory')).not.toBeInTheDocument();
  });
});

describe('ConversationsPage — the KPI tiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it.each<RecommendedAction>(['contain', 'escalate', 'investigate', 'tune'])(
    'summarizes the %s phase in a KPI tile above the queue',
    async (recommendedAction) => {
      renderQueue({ body: allFourBuckets });

      expect(await screen.findByTestId(`pndBriefKpiTile-${recommendedAction}`)).toBeInTheDocument();
    }
  );

  /**
   * The tiles count the same four categories the queue now groups by (D7). A tile's count is checked
   * against the rows on screen rather than against a second derivation.
   */
  it('counts a phase on its tile exactly as the queue renders it', async () => {
    renderQueue({ body: oneProposal });

    expect(await screen.findByTestId('pndBriefKpiTileCount-investigate')).toHaveTextContent('1');
    expect(screen.getAllByTestId('pndQueueRow')).toHaveLength(1);
  });

  it('counts a phase with nothing pending as zero on its tile', async () => {
    renderQueue({ body: oneProposal });

    expect(await screen.findByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('0');
  });

  it('expands the type section whose tile was pressed', async () => {
    renderQueue({ body: allFourBuckets });
    const toggle = 'pndQueueTypeSectionToggle-contain';

    // collapsed by hand first: a section is open by default, so pressing the tile on an open section
    // would assert nothing
    fireEvent.click(await screen.findByTestId(toggle));
    fireEvent.click(screen.getByTestId('pndBriefKpiTile-contain'));

    expect(screen.getByTestId(toggle)).toHaveAttribute('aria-expanded', 'true');
  });

  it('scrolls to the type section whose tile was pressed', async () => {
    renderQueue({ body: allFourBuckets });
    fireEvent.click(await screen.findByTestId('pndBriefKpiTile-tune'));

    expect(scrollIntoView.mock.instances[0]).toBe(screen.getByTestId('pndQueueReveal-tune'));
  });

  /** A tile whose count is zero has nothing to reveal, and says so with its count rather than by dying. */
  it('scrolls nowhere when the phase whose tile was pressed has nothing pending', async () => {
    renderQueue({ body: oneProposal });

    fireEvent.click(await screen.findByTestId('pndBriefKpiTile-contain'));

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('reveals the phase again when its tile is pressed a second time', async () => {
    renderQueue({ body: allFourBuckets });
    const toggle = 'pndQueueTypeSectionToggle-contain';

    fireEvent.click(await screen.findByTestId('pndBriefKpiTile-contain'));
    fireEvent.click(screen.getByTestId(toggle));

    fireEvent.click(screen.getByTestId('pndBriefKpiTile-contain'));

    expect(screen.getByTestId(toggle)).toHaveAttribute('aria-expanded', 'true');
  });

  it('draws four zero tiles when a filter has left no rows to point at', async () => {
    await answerTheLastRowFromTheFilteredWatch();

    expect(screen.getAllByTestId(/^pndBriefKpiTile-/)).toHaveLength(4);
    expect(screen.getByTestId('pndBriefKpiTileCount-investigate')).toHaveTextContent('0');
  });

  it('says nothing matches the current filter without claiming the queue is empty', async () => {
    await answerTheLastRowFromTheFilteredWatch();

    expect(screen.queryByTestId('pndEmptyState')).not.toBeInTheDocument();
  });

  it('leaves the watch chips up, so the filter that emptied the list can be cleared', async () => {
    await answerTheLastRowFromTheFilteredWatch();

    fireEvent.click(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );

    expect(screen.getByTestId('pndQueueRow')).toBeInTheDocument();
  });
});

/**
 * Annotation 3, and decision D10: **one** `discovery-context` read feeds the chips, every row's risk
 * badge and the approval modal's blast radius, so the entities on screen and the score beside a row
 * can never disagree about which discoveries they describe.
 */
describe('ConversationsPage — the blast radius', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('names what the attacks behind the queue reached', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });

    expect(await screen.findByTestId('pndBlastRadius')).toBeInTheDocument();
  });

  it('renders nothing at all when nothing could be enriched, rather than an empty row', async () => {
    renderQueue({ body: oneProposal });

    await screen.findByTestId('pndQueueRow');

    expect(screen.queryByTestId('pndBlastRadius')).not.toBeInTheDocument();
  });

  it('reads the enrichment once for the chips and the badges together', async () => {
    const { services } = renderQueue({
      body: twoWatches,
      discoveryContext: twoWatchesContext,
    });
    await screen.findByTestId('pndBlastRadius');

    expect(
      services.http.get.mock.calls.filter(([path]) => path === PND_DISCOVERY_CONTEXT_URL)
    ).toHaveLength(1);
  });

  it("badges a row with the score derived for that row's own discovery", async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });

    expect(await screen.findAllByTestId('pndQueueRiskScoreBadge')).toHaveLength(2);
  });

  /** A real score of zero exists, and hiding it would be the same lie as rendering an absent one. */
  it('badges a row whose derived score is zero', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });
    const badges = await screen.findAllByTestId('pndQueueRiskScoreBadge');

    expect(badges.map((badge) => badge.textContent)).toEqual(expect.arrayContaining(['0', '73']));
  });

  it('leaves a row unbadged when no context came back for its discovery', async () => {
    renderQueue({ body: oneProposal });

    await screen.findByTestId('pndQueueRow');

    expect(screen.queryByTestId('pndQueueRiskScoreBadge')).not.toBeInTheDocument();
  });

  it('narrows the queue to the proposals a chip vouches for', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });
    await screen.findByTestId('pndBlastRadius');

    fireEvent.click(entityChip('user.name', 'svc-backup'));

    expect(screen.getAllByTestId('pndQueueRow')).toHaveLength(1);
  });

  it('stops filtering when the pressed chip is pressed again', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });
    await screen.findByTestId('pndBlastRadius');

    fireEvent.click(entityChip('user.name', 'svc-backup'));
    fireEvent.click(entityChip('user.name', 'svc-backup'));

    expect(screen.getAllByTestId('pndQueueRow')).toHaveLength(2);
  });

  it('marks the chip the queue is filtered by, so the filter can be found again', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });
    await screen.findByTestId('pndBlastRadius');

    fireEvent.click(entityChip('user.name', 'svc-backup'));

    expect(entityChip('user.name', 'svc-backup')).toHaveAttribute('aria-pressed', 'true');
  });

  /**
   * The chips are derived from the *watch*-filtered rows, deliberately not from the entity-filtered
   * ones: deriving them from their own output would collapse the row to whatever the surviving rows
   * happen to share, and the analyst would be filtering by a set they can no longer see.
   */
  it('keeps every chip on screen while one of them is filtering', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });
    await screen.findByTestId('pndBlastRadius');

    fireEvent.click(entityChip('user.name', 'svc-backup'));

    expect(entityChip('host.name', 'host-1')).toBeInTheDocument();
  });

  it('lowers a KPI tile with the rows a chip filtered out', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });
    await screen.findByTestId('pndBlastRadius');

    fireEvent.click(entityChip('user.name', 'svc-backup'));

    expect(screen.getByTestId('pndBriefKpiTileCount-investigate')).toHaveTextContent('1');
  });
});

describe('ConversationsPage — the query states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('reads "Workflows unavailable" on a 503, never "no proposals"', async () => {
    renderQueue({ error: createHttpFetchError({ status: 503 }) });

    expect(await screen.findByTestId('pndWorkflowsUnavailableState')).toBeInTheDocument();
  });

  it('renders an error state on a 500, explicitly not the empty state', async () => {
    renderQueue({ error: createHttpFetchError({ status: 500 }) });

    expect(await screen.findByTestId('pndErrorState')).toBeInTheDocument();
  });

  it('names the advanced setting when the queue is empty because AD 2.0 is off in this space', async () => {
    renderQueue({
      body: { groups: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'false' },
    });

    expect(await screen.findByTestId('pndAttackDiscoveryDisabledState')).toBeInTheDocument();
  });

  it('renders the ordinary empty state for a genuinely empty queue', async () => {
    renderQueue({
      body: { groups: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' },
    });

    expect(await screen.findByTestId('pndEmptyState')).toBeInTheDocument();
  });

  it('names the empty queue without explaining how watches park a run', async () => {
    renderQueue({
      body: { groups: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' },
    });

    expect(await screen.findByText('Nothing is waiting for your approval')).toBeInTheDocument();
  });

  it('does not describe how watches park a run on an empty queue', async () => {
    renderQueue({
      body: { groups: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' },
    });
    await screen.findByTestId('pndEmptyState');

    expect(screen.queryByText(/No watch has parked a run at an approval/)).not.toBeInTheDocument();
  });

  /**
   * Nothing is waiting, so the heading says so rather than counting to zero.
   *
   * The empty state is awaited first: the hero is drawn over the *loading* queue too, where the
   * honest headline is that the read is still in flight, so asserting on the first heading the query
   * can find would read "Looking into your data..." rather than the settled answer.
   */
  it('still greets the analyst over an empty queue', async () => {
    renderQueue({
      body: { groups: [], total: 0 },
      headers: { [PND_ATTACK_DISCOVERY_WORKFLOWS_ENABLED_HEADER]: 'true' },
    });
    await screen.findByTestId('pndEmptyState');

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No actions need you');
  });
});

/**
 * Annotation 8b. The row no longer carries Approve and Dismiss buttons: activating it opens the
 * approval card, where there is room to read the reasoning and the blast radius before answering, and
 * where the decision is a form field because the gate's own `inputSchema` declares it.
 */
describe('ConversationsPage — answering a gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('opens the approval card for the row that was activated', async () => {
    renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);

    expect(screen.getByTestId('hitlActionModal')).toBeInTheDocument();
  });

  /**
   * *"The card decides, the row only proposes"* (2026-08-11). The card's named primary action is a
   * labelled door to the same modal the card itself opens — never a shortcut past it — so this asserts
   * the whole path the analyst actually takes: press the verb, answer, and the gate resumes.
   */
  it('opens the approval card from the card’s own primary action', async () => {
    renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRowPrimaryAction'))[0]);

    expect(screen.getByTestId('hitlActionModal')).toBeInTheDocument();
  });

  it('reaches _respond with the decision taken from the primary action’s card', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: investigateProposal.sourceId });

    fireEvent.click((await screen.findAllByTestId('pndQueueRowPrimaryAction'))[0]);
    chooseDecision('approve');
    typeRationale('Confirmed on host-1.');
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildProposalRespondUrl(investigateProposal.sourceId),
        expect.objectContaining({
          body: JSON.stringify({
            input: { decision: 'approve', rationale: 'Confirmed on host-1.' },
          }),
        })
      )
    );
  });

  it('shows the reasoning the row leaves off, which is what the approver needs to decide', async () => {
    renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);

    expect(screen.getByTestId('hitlActionCardReasoning')).toHaveTextContent(
      'Reasoning for investigate'
    );
  });

  it('gives the card the blast radius the page already read, rather than fetching it again', async () => {
    renderQueue({ body: twoWatches, discoveryContext: twoWatchesContext });

    fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);

    expect(screen.getAllByTestId('hitlActionCardEntity')[0]).toHaveTextContent('host-1');
  });

  it('sends nothing until a decision has been chosen', async () => {
    const { services } = renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);
    typeRationale('Confirmed on host-1.');
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('requires a rationale before an approval is sent', async () => {
    const { services } = renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);
    chooseDecision('approve');
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('requires a rationale before a dismissal is sent', async () => {
    const { services } = renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRow'))[0]);
    chooseDecision('dismiss');
    fireEvent.click(screen.getByTestId('hitlCardApprove'));

    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('approves through the builder-built respond url with an explicit decision', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: investigateProposal.sourceId });

    await answerGate({ decision: 'approve' });

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildProposalRespondUrl(investigateProposal.sourceId),
        expect.objectContaining({
          body: JSON.stringify({
            input: { decision: 'approve', rationale: 'Confirmed on host-1.' },
          }),
        })
      )
    );
  });

  it('dismisses with an explicit lowercase decision, which the route requires', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: investigateProposal.sourceId });

    await answerGate({ decision: 'dismiss' });

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildProposalRespondUrl(investigateProposal.sourceId),
        expect.objectContaining({
          body: JSON.stringify({
            input: { decision: 'dismiss', rationale: 'Confirmed on host-1.' },
          }),
        })
      )
    );
  });

  it('closes the approval card once the decision lands', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: investigateProposal.sourceId });

    await answerGate({ decision: 'approve' });

    await waitFor(() => expect(screen.queryByTestId('hitlActionModal')).not.toBeInTheDocument());
  });

  it('toasts that the investigation will continue when that gate is approved', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: investigateProposal.sourceId });

    await answerGate({ decision: 'approve' });

    await waitFor(() =>
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith({
        title: 'Approved: The investigation will continue',
      })
    );
  });

  /**
   * The 2026-08-17 Experience/UX sync, decision 6: *"opening one shows a toast with a link to the
   * incident"*. Only the `promote_incident` gate opens one, so only its approval carries the link.
   */
  it('toasts a link to the incident when the escalation gate is approved', async () => {
    const { services } = renderQueue({ body: oneEscalation });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: escalateProposal.sourceId });

    await answerGate({ decision: 'approve' });

    await waitFor(() =>
      expect(services.notifications.toasts.addSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          actionProps: {
            primary: expect.objectContaining({
              children: 'View the incident',
              'data-test-subj': 'pndIncidentOpenedToastLink',
            }),
          },
          title: 'Approved: Incident created',
        })
      )
    );
  });

  it('sends the toast link to the incident conversation, at the id the watch opens it under', async () => {
    const { history, services } = renderQueue({ body: oneEscalation });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: escalateProposal.sourceId });

    await answerGate({ decision: 'approve' });
    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());

    services.notifications.toasts.addSuccess.mock.calls[0][0].actionProps.primary.onClick();

    expect(history.location).toMatchObject({
      pathname: '/chats',
      search: `?conversationId=${
        deriveConversationIds(escalateProposal.correlationId).incidentConversationId
      }`,
    });
  });

  /** `stop_if_dismissed_incident` opens no incident, so there is nothing to link to. */
  it('toasts no link when the escalation gate is dismissed', async () => {
    const { services } = renderQueue({ body: oneEscalation });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: escalateProposal.sourceId });

    await answerGate({ decision: 'dismiss' });

    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());
    expect(services.notifications.toasts.addSuccess.mock.calls[0][0]).not.toHaveProperty(
      'actionProps'
    );
  });

  /** Every other gate marks its proposal done without opening an incident (2026-08-17, decision 5). */
  it('toasts no link when a gate that opens no incident is approved', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: investigateProposal.sourceId });

    await answerGate({ decision: 'approve' });

    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());
    expect(services.notifications.toasts.addSuccess.mock.calls[0][0]).not.toHaveProperty(
      'actionProps'
    );
  });

  it('warns rather than errors when the gate was already answered', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 409 }));

    await answerGate({ decision: 'approve' });

    await waitFor(() => expect(services.notifications.toasts.addWarning).toHaveBeenCalled());
  });

  it('does not crash on a 404, which has no body to read a message off', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 404 }));

    await answerGate({ decision: 'approve' });

    await waitFor(() => expect(services.notifications.toasts.addWarning).toHaveBeenCalled());
  });

  it('keeps the approval card open on a 403, so the typed rationale is not lost', async () => {
    const { services } = renderQueue({ body: oneProposal });
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 403 }));

    await answerGate({ decision: 'approve' });

    await waitFor(() => expect(screen.getByTestId('hitlActionCardError')).toBeInTheDocument());
  });

  it('opens the lifecycle for the attack discovery behind a row, as an overlay over the queue', async () => {
    const { history } = renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRowActionsMenuButton'))[0]);
    fireEvent.click(await screen.findByTestId('pndQueueRowViewLifecycle'));

    expect(history.location.search).toBe(`?lifecycle=${investigateProposal.correlationId}`);
  });

  it('leaves the queue on screen behind the lifecycle overlay', async () => {
    const { history } = renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRowActionsMenuButton'))[0]);
    fireEvent.click(await screen.findByTestId('pndQueueRowViewLifecycle'));

    expect(history.location.pathname).toBe('/');
  });

  /** The row's own controls stop propagation, so reaching for the menu never opens an approval. */
  it('opens no approval card when the overflow menu is reached for', async () => {
    renderQueue({ body: oneProposal });

    fireEvent.click((await screen.findAllByTestId('pndQueueRowActionsMenuButton'))[0]);

    expect(screen.queryByTestId('hitlActionModal')).not.toBeInTheDocument();
  });
});

describe('ConversationsPage — approving a tuning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('opens the rule-id dialog rather than sending the answer', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });

    await answerGate({ decision: 'approve' });

    expect(screen.getByTestId('pndRuleIdConfirmDialog')).toBeInTheDocument();
    expect(services.http.post).not.toHaveBeenCalled();
  });

  it('prefills the rule id the model authored', async () => {
    renderQueue({ body: oneTuneProposal });

    await answerGate({ decision: 'approve' });

    expect(screen.getByTestId('pndRuleIdConfirmDialogRuleId')).toHaveValue(RULE_ID);
  });

  /** One decision, one reason: the modal already took it, so the dialog does not ask again. */
  it('carries the rationale from the approval card into the dialog', async () => {
    renderQueue({ body: oneTuneProposal });

    await answerGate({ decision: 'approve', rationale: 'Ten false positives a day.' });

    expect(screen.getByTestId('pndRuleIdConfirmDialogRationale')).toHaveValue(
      'Ten false positives a day.'
    );
  });

  it('closes the approval card when the rule-id dialog takes over', async () => {
    renderQueue({ body: oneTuneProposal });

    await answerGate({ decision: 'approve' });

    expect(screen.queryByTestId('hitlActionModal')).not.toBeInTheDocument();
  });

  it('sends a dismissed tuning straight away, because it writes to no rule', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await answerGate({ decision: 'dismiss' });

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildProposalRespondUrl(tuneProposal.sourceId),
        expect.anything()
      )
    );
    expect(screen.queryByTestId('pndRuleIdConfirmDialog')).not.toBeInTheDocument();
  });

  it('resumes the gate first', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await approveTuning();

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildProposalRespondUrl(tuneProposal.sourceId),
        expect.objectContaining({
          body: JSON.stringify({
            input: {
              decision: 'approve',
              rationale: 'Ten false positives a day on the patch window.',
            },
          }),
        })
      )
    );
  });

  it('then applies the change to the detection rule, keyed by the discovery', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await approveTuning();

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildTuningApplyUrl(tuneProposal.correlationId),
        expect.objectContaining({
          body: JSON.stringify({
            change: { enabled: false },
            id: RULE_ID,
            rationale: 'Ten false positives a day on the patch window.',
          }),
        })
      )
    );
  });

  it('applies to the rule id the analyst corrected, not the one the model wrote', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await approveTuning({ ruleId: 'corrected-rule-id' });

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildTuningApplyUrl(tuneProposal.correlationId),
        expect.objectContaining({
          body: JSON.stringify({
            change: { enabled: false },
            id: 'corrected-rule-id',
            rationale: 'Ten false positives a day on the patch window.',
          }),
        })
      )
    );
  });

  /**
   * `_respond` and `_apply` are one decision, so they record one reason — the last one the analyst
   * gave, which is the dialog's, because that is the screen they were looking at when they approved.
   */
  it('records the rationale the analyst last edited, on both calls', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await answerGate({ decision: 'approve', rationale: 'First thoughts.' });
    fireEvent.change(screen.getByTestId('pndRuleIdConfirmDialogRationale'), {
      target: { value: 'Actually, the rule is too broad.' },
    });
    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    await waitFor(() =>
      expect(services.http.post).toHaveBeenCalledWith(
        buildProposalRespondUrl(tuneProposal.sourceId),
        expect.objectContaining({
          body: JSON.stringify({
            input: { decision: 'approve', rationale: 'Actually, the rule is too broad.' },
          }),
        })
      )
    );
  });

  it('says the rule changed, not merely that the approval was recorded', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await approveTuning();

    await waitFor(() => expect(services.notifications.toasts.addSuccess).toHaveBeenCalled());
  });

  it('closes the dialog once the rule has changed', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockResolvedValue({ resumed: true, sourceId: tuneProposal.sourceId });

    await approveTuning();

    await waitFor(() =>
      expect(screen.queryByTestId('pndRuleIdConfirmDialog')).not.toBeInTheDocument()
    );
  });

  it('never applies a rule change when the gate could not be resumed', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 403 }));

    await approveTuning();

    await waitFor(() => expect(screen.getByTestId('pndRuleIdConfirmDialogError')).toBeVisible());
    expect(services.http.post).toHaveBeenCalledTimes(1);
  });

  it('fails visibly when the approver cannot write detection rules (S2c)', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post
      .mockResolvedValueOnce({ resumed: true, sourceId: tuneProposal.sourceId })
      .mockRejectedValueOnce(createHttpFetchError({ status: 403 }));

    await approveTuning();

    await waitFor(() => expect(services.notifications.toasts.addDanger).toHaveBeenCalled());
  });

  it('never reports a failed rules write as a success', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post
      .mockResolvedValueOnce({ resumed: true, sourceId: tuneProposal.sourceId })
      .mockRejectedValueOnce(createHttpFetchError({ status: 403 }));

    await approveTuning();

    await waitFor(() => expect(services.notifications.toasts.addDanger).toHaveBeenCalled());
    expect(services.notifications.toasts.addSuccess).not.toHaveBeenCalled();
  });

  it('keeps the dialog open on a 404, so the model-authored rule id can be corrected', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post
      .mockResolvedValueOnce({ resumed: true, sourceId: tuneProposal.sourceId })
      .mockRejectedValueOnce(createHttpFetchError({ status: 404 }));

    await approveTuning();

    await waitFor(() => expect(screen.getByTestId('pndRuleIdConfirmDialogError')).toBeVisible());
  });

  it('does not resume the gate a second time when only the rule write failed', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post
      .mockResolvedValueOnce({ resumed: true, sourceId: tuneProposal.sourceId })
      .mockRejectedValueOnce(createHttpFetchError({ status: 404 }))
      .mockResolvedValueOnce({ applied: true, proposalId: 'alert-tune', ruleId: 'corrected' });

    await approveTuning();
    await waitFor(() => expect(screen.getByTestId('pndRuleIdConfirmDialogError')).toBeVisible());

    fireEvent.change(screen.getByTestId('pndRuleIdConfirmDialogRuleId'), {
      target: { value: 'corrected' },
    });
    fireEvent.click(screen.getByTestId('pndRuleIdConfirmDialogConfirm'));

    await waitFor(() => expect(services.http.post).toHaveBeenCalledTimes(3));
    expect(
      services.http.post.mock.calls.filter(([url]) =>
        url.includes(encodeURIComponent(tuneProposal.sourceId))
      )
    ).toHaveLength(1);
  });

  it('reports a rejected change distinctly, because it means the model proposed an unsafe one', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post
      .mockResolvedValueOnce({ resumed: true, sourceId: tuneProposal.sourceId })
      .mockRejectedValueOnce(createHttpFetchError({ status: 400 }));

    await approveTuning();

    await waitFor(() =>
      expect(screen.getByTestId('pndRuleIdConfirmDialogError')).toHaveTextContent(
        'outside the fields a tuning may patch'
      )
    );
  });

  it('warns without applying anything when the gate had already been answered', async () => {
    const { services } = renderQueue({ body: oneTuneProposal });
    services.http.post.mockRejectedValue(createHttpFetchError({ status: 409 }));

    await approveTuning();

    await waitFor(() => expect(services.notifications.toasts.addWarning).toHaveBeenCalled());
    expect(services.http.post).toHaveBeenCalledTimes(1);
  });
});

describe('ConversationsPage — the resolved section', () => {
  const answeredProposal: PndProposalRow = {
    ...investigateProposal,
    decision: 'approve',
    rationale: 'Confirmed malicious activity.',
    respondedAt: '2026-08-04T12:17:01.792Z',
    respondedBy: 'elastic',
    sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-answered:step-answered`,
  };

  const answeredHistory: ListProposalsResponse = {
    groups: [{ proposals: [answeredProposal], recommendedAction: 'investigate' }],
    total: 1,
  };

  /**
   * Routed per url rather than with one resolved value: the point of the record is that the two
   * surfaces read two routes, so a test that answered both with the same body could not tell them
   * apart.
   */
  const renderQueueAndRecord = () => {
    const services = createPndTestServices();
    services.http.get.mockImplementation(async (path: string) => {
      if (path === PND_DISCOVERY_CONTEXT_URL) {
        return { contexts: [] };
      }

      if (path === PND_CONVERSATIONS_URL) {
        return NO_CONVERSATIONS;
      }

      return createHttpResponse({
        // two watches on the queue, one of them the record's: the chips only exist for the watches
        // the queue holds, and narrowing to the other one is what proves the record follows them
        body: path === PND_PROPOSALS_HISTORY_URL ? answeredHistory : twoWatches,
      });
    });

    return {
      ...renderWithPndProviders(<ConversationsPage />, { route: '/', services: { ...services } }),
      services,
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('draws the record as a section of the page, below the queue', async () => {
    renderQueueAndRecord();

    expect(await screen.findByTestId('pndBriefResolvedSection')).toBeInTheDocument();
  });

  it('reads the record from the history route rather than from the queue', async () => {
    renderQueueAndRecord();

    await screen.findByTestId('pndBriefResolvedSection');

    expect(screen.getByTestId('pndResolvedRowTitle')).toHaveTextContent(answeredProposal.title);
  });

  it('names the decision that was recorded', async () => {
    renderQueueAndRecord();

    expect(await screen.findByTestId('pndResolvedRowOutcome')).toHaveTextContent('Approved');
  });

  it('leaves the gates still waiting on the queue above it', async () => {
    renderQueueAndRecord();

    await screen.findByTestId('pndBriefResolvedSection');

    expect(screen.getAllByTestId('pndQueueRow')).toHaveLength(2);
  });

  it('draws the record as no kind of overlay at all', async () => {
    renderQueueAndRecord();

    await screen.findByTestId('pndBriefResolvedSection');

    expect(screen.queryByTestId('pndHistoryFlyout')).not.toBeInTheDocument();
  });

  it('offers no history tab either, because the record is a section now', async () => {
    renderQueueAndRecord();

    await screen.findByTestId('pndBriefResolvedSection');

    expect(screen.queryByTestId('pndBriefTab-history')).not.toBeInTheDocument();
  });

  /** An answered gate cannot be answered again, so its row is not a way back into the modal. */
  it('offers no way to answer an already answered gate', async () => {
    renderQueueAndRecord();

    fireEvent.click(await screen.findByTestId('pndResolvedRow'));

    expect(screen.queryByTestId('hitlActionModal')).not.toBeInTheDocument();
  });

  it('opens the lifecycle for the discovery an answered row was correlated to', async () => {
    const { history } = renderQueueAndRecord();

    fireEvent.click(await screen.findByTestId('pndResolvedRow'));

    expect(history.location.search).toContain(answeredProposal.correlationId);
  });

  /** The chips narrow the queue; the record below has to answer for the same rows. */
  it('narrows the record with the watch the queue was filtered to', async () => {
    renderQueueAndRecord();

    fireEvent.click(
      await screen.findByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_DEEP_ID}`)
    );

    expect(screen.getByTestId('pndResolvedRow')).toBeInTheDocument();
  });

  it('empties the record when the queue is filtered to a watch it holds nothing for', async () => {
    renderQueueAndRecord();

    await screen.findByTestId('pndBriefResolvedSection');
    fireEvent.click(
      screen.getByTestId(`pndBriefWatchFilter-${SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID}`)
    );

    expect(screen.queryByTestId('pndBriefResolvedSection')).not.toBeInTheDocument();
  });
});
