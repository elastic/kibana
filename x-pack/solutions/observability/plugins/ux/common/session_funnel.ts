/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const FUNNEL_STEP_VALUE_MAX_LENGTH = 200;
export const FUNNEL_STEP_LABEL_MAX_LENGTH = 80;
export const FUNNEL_MAX_STEPS = 8;
export const FUNNEL_MIN_STEPS = 2;
export const FUNNEL_SESSION_SAMPLE_SIZE = 8;

/** Short labels must stay unique — prefix slices collide on ids like acme-funnel-0042. */
export const formatSampleSessionId = (sessionId: string): string => {
  if (sessionId.length <= 20) {
    return sessionId;
  }
  return `${sessionId.slice(0, 6)}…${sessionId.slice(-4)}`;
};

export type FunnelStepType = 'page' | 'activity';

export interface FunnelStepDef {
  type: FunnelStepType;
  value: string;
  label?: string;
}

export interface FunnelStepStats {
  label: string;
  type: FunnelStepType;
  value: string;
  count: number;
  /** 0–1 vs sessions that completed step 1. */
  conversionFromStart: number;
  /** 0–1 vs the previous step (1 for the first step). */
  conversionFromPrevious: number;
  dropOffCount: number;
  sampleDroppedSessionIds: string[];
}

export interface SessionFunnelResponse {
  /** Sessions in the terms aggregation window. */
  sessionsConsidered: number;
  steps: FunnelStepStats[];
}

export const DEFAULT_FUNNEL_STEPS: FunnelStepDef[] = [
  { type: 'page', value: 'catalog', label: 'Catalog' },
  { type: 'activity', value: 'Add to cart', label: 'Add to cart' },
  { type: 'page', value: 'cart', label: 'Cart' },
  { type: 'activity', value: 'Checkout', label: 'Checkout' },
];

export const funnelStepLabel = (step: FunnelStepDef): string => {
  const label = step.label?.trim();
  if (label) {
    return label;
  }
  return step.value.trim();
};

export interface FunnelSessionTimes {
  sessionId: string;
  firstTs: Array<number | null>;
}

/** Ordered conversion: each step's first hit must be at or after the previous step. */
export const computeFunnel = (
  sessions: FunnelSessionTimes[],
  steps: FunnelStepDef[]
): SessionFunnelResponse => {
  const reached: boolean[][] = sessions.map((session) => {
    const flags: boolean[] = [];
    for (let i = 0; i < steps.length; i++) {
      const ts = session.firstTs[i] ?? null;
      const prevOk = i === 0 || flags[i - 1] === true;
      const prevTs = i === 0 ? null : session.firstTs[i - 1] ?? null;
      flags.push(Boolean(prevOk && ts != null && (i === 0 || (prevTs != null && ts >= prevTs))));
    }
    return flags;
  });

  const startCount = reached.filter((flags) => flags[0]).length;

  const stats: FunnelStepStats[] = steps.map((step, i) => {
    const count = reached.filter((flags) => flags[i]).length;
    const prevCount = i === 0 ? count : reached.filter((flags) => flags[i - 1]).length;
    const dropOffCount = i === 0 ? 0 : Math.max(0, prevCount - count);
    const sampleDroppedSessionIds =
      i === 0
        ? []
        : sessions
            .filter((_, sIdx) => reached[sIdx]?.[i - 1] && !reached[sIdx]?.[i])
            .map((session) => session.sessionId)
            .slice(0, FUNNEL_SESSION_SAMPLE_SIZE);

    return {
      label: funnelStepLabel(step),
      type: step.type,
      value: step.value,
      count,
      conversionFromStart: startCount === 0 ? 0 : count / startCount,
      conversionFromPrevious: prevCount === 0 ? 0 : count / prevCount,
      dropOffCount,
      sampleDroppedSessionIds,
    };
  });

  return { sessionsConsidered: sessions.length, steps: stats };
};
