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
  PND_PROPOSALS_ACTIVITY_URL,
  SYSTEM_SECURITY_WATCH_DEEP_ID,
} from '@kbn/pnd-common';
import type {
  GetProposalsActivityResponse,
  PndProposalGroup,
  PndProposalRow,
  RecommendedAction,
} from '@kbn/pnd-common';

import { renderWithPndProviders } from '../../../../components/test_utils/render_with_pnd_providers';
import { createHttpFetchError } from '../../../../test_helpers/create_http_fetch_error';
import { ProposalKpiTiles } from '.';

/** The four tiles, in the order `@kbn/pnd-common` declares them (D11). */
const SECTION_ACTIONS: RecommendedAction[] = CONVERSATION_QUEUE_CATEGORIES.map(({ id }) => id);

const createProposal = ({
  recommendedAction,
  suffix = recommendedAction,
}: {
  recommendedAction: RecommendedAction;
  suffix?: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${suffix}`,
  createdAt: '2026-08-05T12:00:00.000Z',
  gateId: `gate-${suffix}`,
  inputSchema: {},
  message: `Gate message for ${suffix}`,
  reasoning: `Reasoning for ${suffix}`,
  recommendedAction,
  reversible: true,
  sourceId: `${SYSTEM_SECURITY_WATCH_DEEP_ID}:run-${suffix}:step-${suffix}`,
  stepExecutionId: `step-${suffix}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message for ${suffix}`,
  workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID,
  workflowRunId: `run-${suffix}`,
});

const group = (recommendedAction: RecommendedAction): PndProposalGroup => ({
  proposals: [createProposal({ recommendedAction })],
  recommendedAction,
});

/** Deliberately NOT in section order, so a passing order assertion cannot be an accident. */
const allFourGroups: PndProposalGroup[] = [
  group('tune'),
  group('investigate'),
  group('contain'),
  group('escalate'),
];

const onlyInvestigate: PndProposalGroup[] = [group('investigate')];

const activity: GetProposalsActivityResponse = {
  buckets: [
    { counts: { contain: 1, escalate: 0, investigate: 2, tune: 0 }, time: 1_754_524_800_000 },
    { counts: { contain: 0, escalate: 3, investigate: 0, tune: 1 }, time: 1_754_528_400_000 },
  ],
};

const defaultProps = {
  groups: allFourGroups,
  isFilterActive: false,
  onSelectSection: jest.fn(),
};

/** The tiles, in the order they appear in the DOM. */
const tileOrder = (): string[] =>
  screen
    .getAllByTestId(/^pndBriefKpiTile-/)
    .map((tile) => tile.getAttribute('data-recommended-action') ?? '');

describe('ProposalKpiTiles', () => {
  const get = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    get.mockResolvedValue(activity);
  });

  const render = (props: Partial<typeof defaultProps> = {}) =>
    renderWithPndProviders(<ProposalKpiTiles {...defaultProps} {...props} />, {
      services: { http: { get } },
    });

  it('renders one tile per recommended action', () => {
    render();

    expect(tileOrder()).toHaveLength(SECTION_ACTIONS.length);
  });

  it('orders the tiles contain, escalate, investigate, tune, whatever order the response used', () => {
    render();

    expect(tileOrder()).toEqual(['contain', 'escalate', 'investigate', 'tune']);
  });

  it('renders all four tiles when only one action has rows', () => {
    render({ groups: onlyInvestigate });

    expect(tileOrder()).toEqual(['contain', 'escalate', 'investigate', 'tune']);
  });

  it('counts the pending rows of a populated action', () => {
    render({
      groups: [
        {
          proposals: [
            createProposal({ recommendedAction: 'contain', suffix: '1' }),
            createProposal({ recommendedAction: 'contain', suffix: '2' }),
          ],
          recommendedAction: 'contain',
        },
      ],
    });

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('2');
  });

  it('counts an action with no rows as zero rather than blanking the tile', () => {
    render({ groups: onlyInvestigate });

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('0');
  });

  it('counts every row of an action the response split across two groups', () => {
    render({
      groups: [
        {
          proposals: [createProposal({ recommendedAction: 'tune', suffix: '1' })],
          recommendedAction: 'tune',
        },
        {
          proposals: [createProposal({ recommendedAction: 'tune', suffix: '2' })],
          recommendedAction: 'tune',
        },
      ],
    });

    expect(screen.getByTestId('pndBriefKpiTileCount-tune')).toHaveTextContent('2');
  });

  it('names the phase a tile stands for', () => {
    render();

    expect(screen.getByTestId('pndBriefKpiTile-investigate')).toHaveTextContent('Investigate');
  });

  it.each<RecommendedAction>(SECTION_ACTIONS)(
    'asks for the %s section when its tile is clicked',
    (action) => {
      const onSelectSection = jest.fn();
      render({ onSelectSection });

      fireEvent.click(screen.getByTestId(`pndBriefKpiTile-${action}`));

      expect(onSelectSection).toHaveBeenCalledWith(action);
    }
  );

  /**
   * A zero tile stays live on purpose: "nothing to contain" is a fact an analyst should be able to
   * confirm by looking at the section, and a tile that goes dead at zero reads as broken.
   */
  it('keeps a zero-count tile clickable', () => {
    const onSelectSection = jest.fn();
    render({ groups: onlyInvestigate, onSelectSection });

    fireEvent.click(screen.getByTestId('pndBriefKpiTile-contain'));

    expect(onSelectSection).toHaveBeenCalledWith('contain');
  });

  it('does not disable a zero-count tile', () => {
    render({ groups: onlyInvestigate });

    expect(screen.getByTestId('pndBriefKpiTile-contain')).not.toBeDisabled();
  });

  /**
   * Zero-state rule (`EventSections.tsx` line 51): zeroes render when a filter is
   * active; the tiles hide when the queue is genuinely empty.
   */
  it('renders nothing when no section is on screen to point at', () => {
    render({ groups: [] });

    expect(screen.queryAllByTestId(/^pndBriefKpiTile-/)).toHaveLength(0);
  });

  it('renders nothing when every group the response sent is itself empty', () => {
    render({ groups: [{ proposals: [], recommendedAction: 'tune' }] });

    expect(screen.queryAllByTestId(/^pndBriefKpiTile-/)).toHaveLength(0);
  });

  it('renders four zero tiles when a filter is active and nothing matches', () => {
    render({ groups: [], isFilterActive: true });

    expect(tileOrder()).toEqual(['contain', 'escalate', 'investigate', 'tune']);
  });

  it('counts every tile as zero when a filter is active and nothing matches', () => {
    render({ groups: [], isFilterActive: true });

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('0');
    expect(screen.getByTestId('pndBriefKpiTileCount-escalate')).toHaveTextContent('0');
    expect(screen.getByTestId('pndBriefKpiTileCount-investigate')).toHaveTextContent('0');
    expect(screen.getByTestId('pndBriefKpiTileCount-tune')).toHaveTextContent('0');
  });

  it('does not read the series under four zero tiles', () => {
    render({ groups: [], isFilterActive: true });

    expect(get).not.toHaveBeenCalled();
  });

  it('reads the 24h series once for all four tiles', async () => {
    render();

    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    expect(get).toHaveBeenCalledWith(PND_PROPOSALS_ACTIVITY_URL, expect.anything());
  });

  it('does not read the series when there is no tile to draw it under', () => {
    render({ groups: [] });

    expect(get).not.toHaveBeenCalled();
  });

  /**
   * The two numbers on a card come from two places. Filtering the queue by watch is what moves the
   * headline count; the series is the space's global opening rate and does not answer to it.
   */
  it('moves the headline count when the watch filter narrows the queue', async () => {
    const { rerender } = render();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    rerender(<ProposalKpiTiles {...defaultProps} groups={onlyInvestigate} />);

    expect(screen.getByTestId('pndBriefKpiTileCount-contain')).toHaveTextContent('0');
  });

  it('leaves the series alone when the watch filter narrows the queue', async () => {
    const { rerender } = render();
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));

    rerender(<ProposalKpiTiles {...defaultProps} groups={onlyInvestigate} />);

    expect(get).toHaveBeenCalledTimes(1);
  });

  it('draws the tiles without throwing when the series has not landed', () => {
    get.mockReturnValue(new Promise(() => {}));

    render();

    expect(tileOrder()).toEqual(['contain', 'escalate', 'investigate', 'tune']);
  });

  /**
   * A failed activity read is not a quiet 24 hours. The cards keep their counts and lose their
   * charts rather than drawing a flat line at zero.
   */
  it('keeps the counts when the series read is refused', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    render();

    await waitFor(() => expect(get).toHaveBeenCalled());

    expect(screen.getByTestId('pndBriefKpiTileCount-investigate')).toHaveTextContent('1');
  });

  it('draws no window labels when the series read is refused', async () => {
    get.mockRejectedValue(createHttpFetchError({ status: 403 }));

    render();

    await waitFor(() => expect(get).toHaveBeenCalled());

    expect(screen.queryAllByTestId(/^pndBriefKpiSparklineFooter-/)).toHaveLength(0);
  });

  it('draws the window labels once the series lands', async () => {
    render();

    await waitFor(() =>
      expect(screen.queryAllByTestId(/^pndBriefKpiSparklineFooter-/)).toHaveLength(
        SECTION_ACTIONS.length
      )
    );
  });
});
