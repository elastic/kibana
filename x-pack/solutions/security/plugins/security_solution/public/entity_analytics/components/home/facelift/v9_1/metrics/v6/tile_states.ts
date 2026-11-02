/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Maps the simulated prototype states (`../../prototype_states`) onto what one
 * metric tile shows in its three slots: the count, the change badge and the
 * sparkline. Today variants follow security-team#20452 as the product behaves
 * now; Proposed variants follow the suggested design.
 */

import type { SignalCardId } from '../../data';
import type { PrototypeStates } from '../../prototype_states';
import type { FaceliftTimeRangeId } from '../../time_range';

export type TileIssueIcon = 'info' | 'warning' | 'error';

export type CountView =
  | { kind: 'value' }
  | { kind: 'dash' }
  | { kind: 'timedOut' }
  | { kind: 'spinner' }
  | { kind: 'skeleton' }
  | { kind: 'message'; text: string; lock?: boolean }
  /** "N/A" in the count font; the reason sits in the delta row. */
  | { kind: 'unavailable' };

export type DeltaView =
  /** Badge when the change is not 0 (the default tile). */
  | { kind: 'auto' }
  /** Badge even when the change is 0 (neutral "0 ="). */
  | { kind: 'badge' }
  | { kind: 'hidden' }
  | { kind: 'spinner' }
  | { kind: 'skeleton' }
  | { kind: 'note'; text: string; tooltip?: string; icon?: TileIssueIcon };

/** `auto` draws the line on clickable tiles only; `show` draws it regardless. */
export type SparklineView = 'auto' | 'show' | 'hidden';

export interface TileView {
  count: CountView;
  delta: DeltaView;
  sparkline: SparklineView;
  /** Overrides the live count (e.g. forced 0, or 1,423 for the over-1,000 state). */
  value?: number;
  /** Overrides the authored "vs. previous" change the badge and sparkline use. */
  delta0?: number;
  /** Whether the tile filters the table; defaults to `value > 0` with a plain count. */
  interactive?: boolean;
  /** Tooltip on a non-clickable tile. */
  tooltip?: string;
  /** Indeterminate progress bar along the tile's top edge. */
  progress?: boolean;
}

const DEFAULT_VIEW: TileView = {
  count: { kind: 'value' },
  delta: { kind: 'auto' },
  sparkline: 'auto',
};

const ALERT_TILES: SignalCardId[] = ['untriagedHighRisk', 'hiddenRisk'];
const RISK_TILES: SignalCardId[] = ['newToCritical', 'riskMovers'];

/** The tile the over-1,000 state lands on; picking the state selects it. */
export const OVER_LIMIT_CARD_ID: SignalCardId = 'untriagedHighRisk';

/** Tiles each state lands on — chosen to match the screenshots in the issue. */
const TILES: Record<string, SignalCardId[]> = {
  zeroCount: RISK_TILES,
  notEnoughHistory: [...ALERT_TILES, 'newAnomalies'],
  noMlJobs: ['newAnomalies'],
  noRiskData: RISK_TILES,
  noAlertsIndex: ALERT_TILES,
  fewSparklinePoints: ['newAndAlerting', 'newAnomalies'],
  countLoading: [...ALERT_TILES, 'newAndAlerting'],
  countFails: [...ALERT_TILES, 'newAndAlerting'],
  countTimeout: [...ALERT_TILES, 'newAndAlerting'],
  deltaFails: [...RISK_TILES, 'newAndAlerting'],
  historyCheckFails: ALERT_TILES,
  sparklineFails: ALERT_TILES,
  over1000: [OVER_LIMIT_CARD_ID],
};

export const OVER_LIMIT_COUNT = 1423;
export const TABLE_ENTITY_LIMIT = 1000;

const HISTORY_NEEDED: Record<FaceliftTimeRangeId, string> = {
  '24h': '48 hours',
  '7d': '14 days',
  '30d': '60 days',
};

const PRIVILEGE_MESSAGES: Partial<Record<SignalCardId, string>> = {
  untriagedHighRisk: 'Requires read access to alerts',
  hiddenRisk: 'Requires read access to alerts',
  newAndAlerting: 'Requires read access to alerts',
  newAnomalies: 'Requires read access to ML anomalies',
  newToCritical: 'Requires read access to risk scores',
  riskMovers: 'Requires read access to risk scores',
};

const on = (tiles: SignalCardId[], id: SignalCardId) => tiles.includes(id);

/** "N/A" count with the reason (icon, short text, tooltip) in the delta row. */
const notAvailable = (
  view: TileView,
  icon: Exclude<TileIssueIcon, 'info'>,
  text: string,
  tooltip: string
): TileView => ({
  ...view,
  interactive: false,
  sparkline: 'hidden',
  count: { kind: 'unavailable' },
  delta: { kind: 'note', text, icon, tooltip },
});

const applyEmpty = (
  view: TileView,
  id: SignalCardId,
  value: number,
  states: PrototypeStates,
  range: FaceliftTimeRangeId
): TileView => {
  const proposed = states.variants.empty === 'proposed';

  switch (states.empty) {
    case 'zeroCount':
      if (!on(TILES.zeroCount, id)) return view;
      return proposed
        ? // Fell to 0: keep the drop on the badge and the line that shows it.
          {
            ...view,
            value: 0,
            delta0: -Math.max(value, 1),
            delta: { kind: 'badge' },
            sparkline: 'show',
          }
        : { ...view, value: 0, delta: { kind: 'hidden' }, sparkline: 'hidden' };
    case 'zeroDelta':
      return { ...view, delta0: 0, delta: proposed ? { kind: 'badge' } : { kind: 'hidden' } };
    case 'notEnoughHistory':
      if (!on(TILES.notEnoughHistory, id)) return view;
      return {
        ...view,
        sparkline: 'hidden',
        delta: proposed
          ? {
              kind: 'note',
              text: 'Not enough history',
              icon: 'warning',
              tooltip: `Comparing needs twice the selected range of history: this period and the one before it. The comparison will be available after ${HISTORY_NEEDED[range]} of data.`,
            }
          : { kind: 'note', text: 'Not enough history to compare' },
      };
    case 'noMlJobs':
      if (!on(TILES.noMlJobs, id)) return view;
      return proposed
        ? notAvailable(
            view,
            'warning',
            'Requires anomaly detection jobs',
            'No anomaly detection jobs are running. Set up and start anomaly detection jobs in Machine Learning to see anomalous entities.'
          )
        : {
            ...view,
            interactive: false,
            delta: { kind: 'hidden' },
            sparkline: 'hidden',
            count: { kind: 'message', text: 'Requires anomaly detection jobs' },
          };
    case 'noRiskData':
      if (!on(TILES.noRiskData, id)) return view;
      return proposed
        ? notAvailable(
            view,
            'warning',
            'Requires risk score history data',
            'No risk score data yet. Turn on risk scoring in Entity analytics settings to see entities whose risk changed.'
          )
        : {
            ...view,
            interactive: false,
            delta: { kind: 'hidden' },
            sparkline: 'hidden',
            count: { kind: 'message', text: 'Requires risk score history data' },
          };
    case 'noAlertsIndex':
      if (!on(TILES.noAlertsIndex, id)) return view;
      return proposed
        ? notAvailable(
            view,
            'warning',
            'Requires an alerts index',
            'This space has no alerts index yet. Turn on detection rules in this space to start generating alerts.'
          )
        : {
            ...view,
            interactive: false,
            count: { kind: 'dash' },
            delta: { kind: 'hidden' },
            sparkline: 'hidden',
          };
    case 'fewSparklinePoints':
      return on(TILES.fewSparklinePoints, id) ? { ...view, sparkline: 'hidden' } : view;
    default:
      return view;
  }
};

const applyLoading = (view: TileView, id: SignalCardId, states: PrototypeStates): TileView => {
  const proposed = states.variants.loading === 'proposed';

  switch (states.loading) {
    case 'countLoading':
      if (!on(TILES.countLoading, id)) return view;
      return {
        ...view,
        interactive: false,
        count: { kind: proposed ? 'skeleton' : 'spinner' },
        delta: proposed ? { kind: 'skeleton' } : { kind: 'hidden' },
        sparkline: 'hidden',
        progress: proposed,
      };
    case 'deltaLoading':
      return {
        ...view,
        delta: { kind: proposed ? 'skeleton' : 'spinner' },
        sparkline: 'hidden',
        progress: proposed,
      };
    case 'sparklineLoading':
      return { ...view, sparkline: 'hidden', progress: proposed };
    default:
      return view;
  }
};

const COMPARISON_UNAVAILABLE = 'Comparison unavailable';

const applyError = (view: TileView, id: SignalCardId, states: PrototypeStates): TileView => {
  const proposed = states.variants.error === 'proposed';

  switch (states.error) {
    case 'countFails':
    case 'countTimeout': {
      if (!on(TILES[states.error], id)) return view;
      const timedOut = states.error === 'countTimeout';
      if (proposed) {
        return timedOut
          ? notAvailable(
              view,
              'error',
              'Query timed out',
              'This metric took more than 90 seconds to load and was stopped. Try a shorter time range or narrower filters.'
            )
          : notAvailable(
              view,
              'error',
              "Couldn't load data",
              "This metric couldn't load. Refresh the page to try again."
            );
      }
      return {
        ...view,
        interactive: false,
        delta: { kind: 'hidden' },
        sparkline: 'hidden',
        count: timedOut ? { kind: 'timedOut' } : { kind: 'dash' },
      };
    }
    case 'deltaFails':
      if (!on(TILES.deltaFails, id)) return view;
      return {
        ...view,
        delta: proposed
          ? {
              kind: 'note',
              text: COMPARISON_UNAVAILABLE,
              icon: 'error',
              tooltip: "Couldn't load the previous period to compare with.",
            }
          : { kind: 'hidden' },
      };
    case 'historyCheckFails':
      if (!on(TILES.historyCheckFails, id)) return view;
      return {
        ...view,
        sparkline: 'hidden',
        delta: proposed
          ? {
              kind: 'note',
              text: COMPARISON_UNAVAILABLE,
              icon: 'error',
              tooltip: "Couldn't check how much history is available to compare with.",
            }
          : { kind: 'hidden' },
      };
    case 'sparklineFails':
      return on(TILES.sparklineFails, id) ? { ...view, sparkline: 'hidden' } : view;
    case 'noPrivileges': {
      const text = PRIVILEGE_MESSAGES[id];
      if (!text) return view;
      return {
        ...view,
        interactive: false,
        delta: { kind: 'hidden' },
        sparkline: 'hidden',
        count: { kind: 'message', text, lock: proposed },
      };
    }
    case 'over1000':
      return on(TILES.over1000, id) ? { ...view, value: OVER_LIMIT_COUNT } : view;
    default:
      return view;
  }
};

/** What one tile shows for the current simulated states (error over loading over empty). */
export const getTileView = (
  id: SignalCardId,
  value: number,
  states: PrototypeStates,
  range: FaceliftTimeRangeId
): TileView =>
  applyError(
    applyLoading(applyEmpty(DEFAULT_VIEW, id, value, states, range), id, states),
    id,
    states
  );

/** Page callout above the tiles for the No read privileges state. */
export const showsPrivilegesCallout = (states: PrototypeStates): boolean =>
  states.error === 'noPrivileges';

/** The table's "Showing N of M" line explains the 1,000 cap (Proposed over-1,000). */
export const showsInlineTableLimit = (
  states: PrototypeStates,
  selectedCardId: SignalCardId | undefined
): boolean =>
  states.error === 'over1000' &&
  states.variants.error === 'proposed' &&
  selectedCardId != null &&
  TILES.over1000.includes(selectedCardId);
