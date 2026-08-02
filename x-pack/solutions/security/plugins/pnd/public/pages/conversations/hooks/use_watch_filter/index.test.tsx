/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { PndProposalGroup, PndProposalRow, RecommendedAction } from '@kbn/pnd-common';
import {
  SYSTEM_SECURITY_WATCH_DEEP_ID,
  SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
} from '@kbn/pnd-common';

import { useWatchFilter } from '.';

const proposal = ({
  recommendedAction,
  workflowId,
}: {
  recommendedAction: RecommendedAction;
  workflowId: string;
}): PndProposalRow => ({
  alwaysGate: false,
  correlationId: `alert-${recommendedAction}-${workflowId}`,
  createdAt: '2026-08-04T12:00:00.000Z',
  gateId: `gate-${recommendedAction}`,
  inputSchema: {},
  message: `Gate message for ${recommendedAction}`,
  reasoning: `Reasoning for ${recommendedAction}`,
  recommendedAction,
  reversible: true,
  sourceId: `${workflowId}:run-${recommendedAction}:step-${recommendedAction}`,
  stepExecutionId: `step-${recommendedAction}-${workflowId}`,
  stepId: `await_${recommendedAction}`,
  title: `Gate message for ${recommendedAction}`,
  workflowId,
  workflowRunId: `run-${recommendedAction}-${workflowId}`,
});

/** Two investigate rows from different watches, and one tune row from the Detection Watch. */
const groups: PndProposalGroup[] = [
  {
    proposals: [
      proposal({ recommendedAction: 'investigate', workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID }),
      proposal({
        recommendedAction: 'investigate',
        workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID,
      }),
    ],
    recommendedAction: 'investigate',
  },
  {
    proposals: [
      proposal({ recommendedAction: 'tune', workflowId: SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID }),
    ],
    recommendedAction: 'tune',
  },
];

/** What is left after the Detection Watch's rows are all answered. */
const deepWatchOnly: PndProposalGroup[] = [
  {
    proposals: [
      proposal({ recommendedAction: 'investigate', workflowId: SYSTEM_SECURITY_WATCH_DEEP_ID }),
    ],
    recommendedAction: 'investigate',
  },
];

describe('useWatchFilter', () => {
  it('starts unfiltered, so nothing is hidden before a click', () => {
    const { result } = renderHook(() => useWatchFilter(groups));

    expect(result.current.watchFilter).toBeNull();
    expect(result.current.visible).toEqual(groups);
  });

  it('lists the watches present in the rows, sorted', () => {
    const { result } = renderHook(() => useWatchFilter(groups));

    expect(result.current.workflowIds).toEqual(
      [SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID].sort()
    );
  });

  it('narrows to the rows from one watch, across every bucket it appears in', () => {
    const { result } = renderHook(() => useWatchFilter(groups));

    act(() => result.current.onWatchClick(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID));

    expect(result.current.visible.map(({ recommendedAction }) => recommendedAction)).toEqual([
      'investigate',
      'tune',
    ]);
  });

  it('drops a bucket the watch filter emptied rather than rendering an empty group', () => {
    const { result } = renderHook(() => useWatchFilter(groups));

    act(() => result.current.onWatchClick(SYSTEM_SECURITY_WATCH_DEEP_ID));

    expect(result.current.visible.map(({ recommendedAction }) => recommendedAction)).toEqual([
      'investigate',
    ]);
  });

  it('clears the filter when the selected watch is clicked again', () => {
    const { result } = renderHook(() => useWatchFilter(groups));

    act(() => result.current.onWatchClick(SYSTEM_SECURITY_WATCH_DEEP_ID));
    act(() => result.current.onWatchClick(SYSTEM_SECURITY_WATCH_DEEP_ID));

    expect(result.current.watchFilter).toBeNull();
    expect(result.current.visible).toEqual(groups);
  });

  /**
   * The one way the page can reach `pndBriefNoMatches` now that the phase pills are gone: the
   * analyst answers the last gate from the watch they filtered to, the queue refetches, and the
   * filter they set is still on. The empty prompt has to say "no approvals match this filter" there,
   * not "the queue is empty" — there are still rows, from another watch.
   */
  it('keeps a filter whose watch has left the data, so the page can say so', () => {
    const { rerender, result } = renderHook(({ current }) => useWatchFilter(current), {
      initialProps: { current: groups },
    });

    act(() => result.current.onWatchClick(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID));
    rerender({ current: deepWatchOnly });

    expect(result.current.watchFilter).toBe(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID);
    expect(result.current.visible).toEqual([]);
  });

  it('keeps the chip for a watch that has left the data, so the filter can still be cleared', () => {
    const { rerender, result } = renderHook(({ current }) => useWatchFilter(current), {
      initialProps: { current: groups },
    });

    act(() => result.current.onWatchClick(SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID));
    rerender({ current: deepWatchOnly });

    expect(result.current.workflowIds).toEqual(
      [SYSTEM_SECURITY_WATCH_DEEP_ID, SYSTEM_SECURITY_WATCH_POST_INCIDENT_ID].sort()
    );
  });
});
