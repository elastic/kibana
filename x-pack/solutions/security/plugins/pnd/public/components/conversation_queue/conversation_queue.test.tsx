/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import {
  CONVERSATION_QUEUE_CATEGORIES,
  PND_GATE_IDS,
  SYSTEM_SECURITY_WATCH_FLOOR_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';

import { QUEUE_GROUP_MODE_STORAGE_KEY, type QueueGroupMode } from '../queue';
import { renderWithPndProviders } from '../test_utils/render_with_pnd_providers';
import { ConversationQueue, NO_INVESTIGATION_GROUP_KEY, SECTION_PULSE_MS } from '.';

const ALERT_A = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const ALERT_B = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';

const createProposal = ({
  correlationId = ALERT_A,
  createdAt = '2026-08-18T12:00:00.000Z',
  decision,
  gateId = PND_GATE_IDS.incidentContained,
  recommendedAction = 'contain',
  sourceId,
  threadConversationId,
  workflowId = SYSTEM_SECURITY_WATCH_FLOOR_ID,
}: {
  correlationId?: string;
  createdAt?: string;
  decision?: 'approve' | 'dismiss';
  gateId?: string;
  recommendedAction?: RecommendedAction;
  sourceId: string;
  threadConversationId?: string;
  workflowId?: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId,
  createdAt,
  ...(decision == null ? {} : { decision }),
  gateId,
  inputSchema: {},
  message: `Gate message for ${sourceId}`,
  reasoning: `Reasoning for ${sourceId}`,
  recommendedAction,
  reversible: true,
  sourceId,
  stepExecutionId: `step-${sourceId}`,
  stepId: `await_${recommendedAction}`,
  threadConversationId,
  title: `Gate message for ${sourceId}`,
  workflowId,
  workflowRunId: `run-${sourceId}`,
});

const bucket = (
  recommendedAction: RecommendedAction,
  proposals: PndProposalRow[]
): PndProposalGroup => ({ proposals, recommendedAction });

const containA = createProposal({ sourceId: 'contain-a' });
const tuneA = createProposal({
  gateId: PND_GATE_IDS.applyTuning,
  recommendedAction: 'tune',
  sourceId: 'tune-a',
  workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
});
const containB = createProposal({
  correlationId: ALERT_B,
  sourceId: 'contain-b',
});
const openInvestigationA = createProposal({
  gateId: PND_GATE_IDS.openInvestigation,
  recommendedAction: 'investigate',
  sourceId: 'open-a',
});

const oneInvestigation: PndProposalGroup[] = [bucket('contain', [containA])];
const twoInvestigations: PndProposalGroup[] = [bucket('contain', [containA, containB])];
const fourCategories: PndProposalGroup[] = [
  bucket('contain', [containA]),
  bucket('escalate', [
    createProposal({
      correlationId: ALERT_B,
      gateId: PND_GATE_IDS.promoteIncident,
      recommendedAction: 'escalate',
      sourceId: 'escalate-b',
    }),
  ]),
  bucket('investigate', [openInvestigationA]),
  bucket('tune', [tuneA]),
];

const defaultProps = {
  groups: oneInvestigation,
  onRequestApproval: jest.fn(),
  onViewLifecycle: jest.fn(),
};

const setGroupMode = (mode: QueueGroupMode): void => {
  window.sessionStorage.setItem(QUEUE_GROUP_MODE_STORAGE_KEY, mode);
};

const sectionOrder = (): string[] =>
  screen
    .getAllByTestId(/^pndQueueTypeSection-[a-z]/)
    .map(
      (section) => section.getAttribute('data-test-subj')?.replace('pndQueueTypeSection-', '') ?? ''
    );

const rowTitles = (): string[] =>
  screen.getAllByTestId('pndQueueRowTitle').map((row) => row.textContent ?? '');

const scrollIntoView = jest.fn();

describe('ConversationQueue — group by type (default)', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('starts in type mode', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.getByTestId('pndQueueGroupControl')).toHaveTextContent('Type');
  });

  it('draws one type section per populated category', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} groups={fourCategories} />);

    expect(sectionOrder()).toEqual(CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => id));
  });

  it('renders pending rows inside the type section, not a thread card', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.getByTestId('pndQueueRow')).toBeInTheDocument();
    expect(screen.queryByTestId('pndQueueThreadGroupCard')).toBeNull();
  });

  it('counts only pending rows on the type-section badge', () => {
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} groups={[bucket('contain', [containA, containB])]} />
    );

    expect(screen.getByTestId('pndQueueTypeSectionCount-contain')).toHaveTextContent('2');
  });

  it('hides an empty category when no filter is active', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueTypeSection-tune')).toBeNull();
  });

  it('renders empty categories with a zero badge when a filter is active', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} isFilterActive />);

    expect(screen.getByTestId('pndQueueTypeSectionCount-tune')).toHaveTextContent('0');
  });

  it('renders all four categories, including zeroes, when a filter is active', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} isFilterActive />);

    expect(sectionOrder()).toEqual(CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => id));
  });

  it('renders the empty prompt when nothing is visible and no filter is active', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} groups={[]} />);

    expect(screen.getByTestId('pndBriefNoMatches')).toBeInTheDocument();
  });

  it('does not claim the queue is empty when a filter has left four zero sections', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} groups={[]} isFilterActive />);

    expect(screen.queryByTestId('pndBriefNoMatches')).toBeNull();
    expect(screen.getByTestId('pndQueueTypeSectionCount-contain')).toHaveTextContent('0');
  });

  it('does not demote a pending type-mode row', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueThreadGroupResolvedRow')).toBeNull();
    expect(screen.getByTestId('pndQueueRow')).toHaveStyle('opacity: 1');
  });

  it('asks for approval of the proposal whose row was activated', () => {
    const onRequestApproval = jest.fn();
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} onRequestApproval={onRequestApproval} />
    );

    fireEvent.click(screen.getByTestId('pndQueueRow'));

    expect(onRequestApproval).toHaveBeenCalledWith(containA);
  });

  it('offers a row with a thread the way into it', () => {
    const withThread = createProposal({
      sourceId: 'with-thread',
      threadConversationId: 'c9a5f0a2-1f2b-5c3d-8e4f-0a1b2c3d4e5f',
    });

    renderWithPndProviders(
      <ConversationQueue {...defaultProps} groups={[bucket('contain', [withThread])]} />
    );

    expect(screen.getByTestId('pndQueueRowOpenInChatButton')).toBeInTheDocument();
  });

  it('offers no way into a thread a row does not have yet', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.queryByTestId('pndQueueRowOpenInChatButton')).toBeNull();
  });

  it('opens the lifecycle for the discovery behind a row', () => {
    const onViewLifecycle = jest.fn();
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} onViewLifecycle={onViewLifecycle} />
    );

    fireEvent.click(screen.getByTestId('pndQueueRowActionsMenuButton'));
    fireEvent.click(screen.getByTestId('pndQueueRowViewLifecycle'));

    expect(onViewLifecycle).toHaveBeenCalledWith(ALERT_A);
  });

  it('gives a row the risk score derived for its own discovery', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        discoveryContexts={[{ correlationId: ALERT_A, entities: [], riskScore: 73 }]}
      />
    );

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveTextContent('73');
  });

  it('renders a risk score of zero rather than hiding it', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        discoveryContexts={[{ correlationId: ALERT_A, entities: [], riskScore: 0 }]}
      />
    );

    expect(screen.getByTestId('pndQueueRiskScoreBadge')).toHaveTextContent('0');
  });

  it('leaves a row without a badge when no context was derived for its discovery', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        discoveryContexts={[{ correlationId: ALERT_B, entities: [], riskScore: 91 }]}
      />
    );

    expect(screen.queryByTestId('pndQueueRiskScoreBadge')).toBeNull();
  });

  it('puts the gate that has been waiting longest first', () => {
    const older = createProposal({ createdAt: '2026-08-18T09:00:00.000Z', sourceId: 'older' });
    const newer = createProposal({ createdAt: '2026-08-18T15:00:00.000Z', sourceId: 'newer' });

    renderWithPndProviders(
      <ConversationQueue {...defaultProps} groups={[bucket('contain', [newer, older])]} />
    );

    expect(rowTitles()).toEqual(['Gate message for older', 'Gate message for newer']);
  });

  it('opens a type section so its rows are readable without a click', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.getByTestId('pndQueueTypeSectionToggle-contain')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('collapses a type section when its header is clicked', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueTypeSectionToggle-contain'));

    expect(screen.getByTestId('pndQueueTypeSectionToggle-contain')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});

describe('ConversationQueue — group by type + thread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    setGroupMode('type-thread');
  });

  it('names a contain card after the incident, not as an investigation that has not opened', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        conversations={[
          {
            correlationId: ALERT_A,
            createdAt: '2026-08-18T11:00:00.000Z',
            id: 'incident-a',
            kind: 'incident',
            title: 'Excel regsvr32 to Emotet persistence',
            updatedAt: '2026-08-18T11:30:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByTestId('pndQueueThreadGroupHeader')).toHaveTextContent(
      'Excel regsvr32 to Emotet persistence'
    );
    expect(screen.getByTestId('pndQueueThreadGroupHeader')).not.toHaveTextContent(
      'Not yet in an investigation'
    );
  });

  it('nests an embedded thread card inside each type section', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.getByTestId('pndQueueTypeSection-contain')).toBeInTheDocument();
    expect(screen.getByTestId('pndQueueThreadGroupCard')).toBeInTheDocument();
    expect(screen.queryByTestId('pndQueueRow')).toBeNull();
  });

  it('keeps one pending child per embedded card of a populated category', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.getAllByTestId('pndQueueThreadGroupChildRow')).toHaveLength(1);
  });

  it('demotes a resolved child inside the nested card, not the type section', () => {
    const resolvedContain = createProposal({
      decision: 'approve',
      sourceId: 'contain-a-resolved',
    });

    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        groups={[bucket('tune', [tuneA])]}
        resolvedProposals={[resolvedContain]}
      />
    );

    expect(screen.getByTestId('pndQueueThreadGroupResolvedRow')).toBeInTheDocument();
    expect(screen.getByTestId('pndQueueTypeSectionCount-tune')).toHaveTextContent('1');
  });
});

describe('ConversationQueue — group by thread', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    setGroupMode('thread');
  });

  it('draws one thread card per investigation and no type sections', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} groups={twoInvestigations} />);

    expect(screen.getAllByTestId('pndQueueThreadGroupCard')).toHaveLength(2);
    expect(screen.queryByTestId(/^pndQueueTypeSection-[a-z]/)).toBeNull();
  });

  it('gathers several pending proposals of one investigation into a single card', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        groups={[bucket('contain', [containA]), bucket('tune', [tuneA])]}
      />
    );

    expect(screen.getAllByTestId('pndQueueThreadGroupCard')).toHaveLength(1);
    expect(screen.getAllByTestId('pndQueueThreadGroupChildRow')).toHaveLength(2);
  });

  it('names a contain card after the incident conversation', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        conversations={[
          {
            correlationId: ALERT_A,
            createdAt: '2026-08-18T11:00:00.000Z',
            id: 'incident-a',
            kind: 'incident',
            title: 'Beaconing from host-1',
            updatedAt: '2026-08-18T11:30:00.000Z',
          },
        ]}
      />
    );

    expect(screen.getByTestId('pndQueueThreadGroupHeader')).toHaveTextContent(
      'Beaconing from host-1'
    );
  });

  it('draws a card for the proposals with no investigation yet', () => {
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} groups={[bucket('investigate', [openInvestigationA])]} />
    );

    expect(
      screen.getByTestId(`pndQueueThreadGroup-${NO_INVESTIGATION_GROUP_KEY}`)
    ).toBeInTheDocument();
    expect(screen.getByTestId('pndQueueThreadGroupHeader')).toHaveTextContent(
      'Not yet in an investigation'
    );
  });

  it('demotes a resolved child in place inside the thread card', () => {
    const resolvedContain = createProposal({
      decision: 'dismiss',
      sourceId: 'contain-a-resolved',
    });

    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        groups={[bucket('tune', [tuneA])]}
        resolvedProposals={[resolvedContain]}
      />
    );

    expect(screen.getByTestId('pndQueueThreadGroupResolvedRow')).toHaveTextContent(
      'Gate message for contain-a-resolved'
    );
  });

  it('renders the empty prompt when a filter has left no thread cards', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} groups={[]} isFilterActive />);

    expect(screen.getByTestId('pndBriefNoMatches')).toBeInTheDocument();
  });
});

describe('ConversationQueue — the grouping control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('offers the three grouping modes', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueGroupControl'));

    expect(screen.getByTestId('pndQueueGroupModeOption-type')).toBeInTheDocument();
    expect(screen.getByTestId('pndQueueGroupModeOption-type-thread')).toBeInTheDocument();
    expect(screen.getByTestId('pndQueueGroupModeOption-thread')).toBeInTheDocument();
  });

  it('switches from type rows to thread cards when Thread is selected', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueGroupControl'));
    fireEvent.click(screen.getByTestId('pndQueueGroupModeOption-thread'));

    expect(screen.getByTestId('pndQueueThreadGroupCard')).toBeInTheDocument();
    expect(screen.queryByTestId('pndQueueTypeSection-contain')).toBeNull();
  });

  it('persists the selected mode in sessionStorage so a reload keeps it', () => {
    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    fireEvent.click(screen.getByTestId('pndQueueGroupControl'));
    fireEvent.click(screen.getByTestId('pndQueueGroupModeOption-thread'));

    expect(window.sessionStorage.getItem(QUEUE_GROUP_MODE_STORAGE_KEY)).toEqual('thread');
  });

  it('rehydrates a persisted mode', () => {
    setGroupMode('thread');

    renderWithPndProviders(<ConversationQueue {...defaultProps} />);

    expect(screen.getByTestId('pndQueueGroupControl')).toHaveTextContent('Thread');
    expect(screen.getByTestId('pndQueueThreadGroupCard')).toBeInTheDocument();
  });
});

describe('ConversationQueue — revealing a phase', () => {
  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
  });

  it('scrolls to the type section for the requested phase', () => {
    renderWithPndProviders(
      <ConversationQueue
        {...defaultProps}
        groups={fourCategories}
        revealSection={{ action: 'tune', requestId: 1 }}
      />
    );

    expect(scrollIntoView.mock.instances[0]).toBe(screen.getByTestId('pndQueueReveal-tune'));
  });

  it('expands the type section whose tile was pressed', () => {
    const { rerender } = renderWithPndProviders(
      <ConversationQueue {...defaultProps} groups={fourCategories} />
    );
    fireEvent.click(screen.getByTestId('pndQueueTypeSectionToggle-contain'));

    rerender(
      <ConversationQueue
        {...defaultProps}
        groups={fourCategories}
        revealSection={{ action: 'contain', requestId: 1 }}
      />
    );

    expect(screen.getByTestId('pndQueueTypeSectionToggle-contain')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('scrolls nothing when no pending row holds the requested phase', () => {
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} revealSection={{ action: 'escalate', requestId: 1 }} />
    );

    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it('does not reveal again when the queue refetches', () => {
    const request = { action: 'contain' as const, requestId: 1 };
    const { rerender } = renderWithPndProviders(
      <ConversationQueue {...defaultProps} revealSection={request} />
    );
    fireEvent.click(screen.getByTestId('pndQueueTypeSectionToggle-contain'));

    rerender(
      <ConversationQueue
        {...defaultProps}
        groups={[bucket('contain', [containA])]}
        revealSection={request}
      />
    );

    expect(screen.getByTestId('pndQueueTypeSectionToggle-contain')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe('ConversationQueue — the reveal pulse', () => {
  const CAN_ANIMATE_MEDIA = 'screen and (prefers-reduced-motion: no-preference)';

  beforeAll(() => {
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('lights up the type section a tile revealed', () => {
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} revealSection={{ action: 'contain', requestId: 1 }} />
    );

    expect(screen.getByTestId('pndQueueReveal-contain')).toHaveStyleRule(
      'animation',
      expect.stringContaining(`${SECTION_PULSE_MS}ms`),
      { media: CAN_ANIMATE_MEDIA }
    );
  });

  it('clears the pulse after the prototype’s 700ms', () => {
    renderWithPndProviders(
      <ConversationQueue {...defaultProps} revealSection={{ action: 'contain', requestId: 1 }} />
    );

    act(() => {
      jest.advanceTimersByTime(SECTION_PULSE_MS);
    });

    expect(screen.getByTestId('pndQueueReveal-contain')).not.toHaveStyleRule(
      'animation',
      expect.stringContaining(`${SECTION_PULSE_MS}ms`),
      { media: CAN_ANIMATE_MEDIA }
    );
  });
});
