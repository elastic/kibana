/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  BriefNarrationMode,
  BriefTimeRange,
  BriefTimeRangeKey,
  ExecutiveBriefJob,
} from '../../../../../common/entity_analytics/executive_brief/types';
import { EXECUTIVE_BRIEF_FIXTURE_STORAGE_KEY } from '../constants';
import type { BriefGenerationSelection } from './use_brief_connectors';
import { useExecutiveBriefJob } from './use_executive_brief_job';
import { useGenerateExecutiveBrief } from './use_generate_executive_brief';

const RANGE_MS: Record<BriefTimeRangeKey, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const toBriefTimeRange = (range: BriefTimeRangeKey, now = new Date()): BriefTimeRange => ({
  from: new Date(now.getTime() - RANGE_MS[range]).toISOString(),
  to: now.toISOString(),
  range,
});

/**
 * Dev affordance: when localStorage['executiveBrief.fixture'] holds a JSON ExecutiveBriefJob (for
 * example FIXTURE_JOB_SUCCEEDED, which production code may not import), render it without calling
 * the API. See README note in the lane report for how to set it from the console.
 */
const readFixtureJob = (): ExecutiveBriefJob | undefined => {
  try {
    const raw = window.localStorage.getItem(EXECUTIVE_BRIEF_FIXTURE_STORAGE_KEY);
    if (!raw) return undefined;
    const parsed: ExecutiveBriefJob = JSON.parse(raw);
    return parsed.status === 'succeeded' && parsed.snapshot && parsed.brief ? parsed : undefined;
  } catch {
    return undefined;
  }
};

export interface UseExecutiveBriefResult {
  job: ExecutiveBriefJob | undefined;
  /** True while the POST or the polling is in flight. */
  isGenerating: boolean;
  /** Transport-level failure (POST failed or polling timed out); job failures live on job.error. */
  requestError: Error | undefined;
  mode: BriefNarrationMode;
  regenerate: (mode?: BriefNarrationMode) => void;
}

const TEMPLATE_SELECTION: BriefGenerationSelection = { isReady: true, generator: 'template' };

/**
 * Starts a generation once the generator selection is ready and exposes the polled job. Fixture
 * mode skips the API entirely.
 */
export const useExecutiveBrief = (
  range: BriefTimeRangeKey,
  selection: BriefGenerationSelection = TEMPLATE_SELECTION
): UseExecutiveBriefResult => {
  const fixtureJob = useMemo(readFixtureJob, []);
  const useFixture = fixtureJob !== undefined;
  const [mode, setMode] = useState<BriefNarrationMode>('names');
  const { mutate, data, error: mutationError, isLoading: isPosting } = useGenerateExecutiveBrief();
  const hasStarted = useRef(false);
  const regenerate = useCallback(
    (nextMode?: BriefNarrationMode) => {
      if (useFixture) return;
      const resolvedMode = nextMode ?? mode;
      setMode(resolvedMode);
      mutate({
        timeRange: toBriefTimeRange(range),
        mode: resolvedMode,
        generator: selection.generator,
        connectorId: selection.connectorId,
      });
    },
    [mode, mutate, range, selection.connectorId, selection.generator, useFixture]
  );

  useEffect(() => {
    if (hasStarted.current || useFixture || !selection.isReady) return;
    hasStarted.current = true;
    mutate({
      timeRange: toBriefTimeRange(range),
      mode,
      generator: selection.generator,
      connectorId: selection.connectorId,
    });
  }, [mutate, range, mode, useFixture, selection]);

  const {
    data: job,
    error: jobError,
    hasTimedOut,
  } = useExecutiveBriefJob(useFixture ? undefined : data?.id);

  if (useFixture) {
    return {
      job: fixtureJob,
      isGenerating: false,
      requestError: undefined,
      mode,
      regenerate,
    };
  }

  const timeoutError = hasTimedOut
    ? new Error('Timed out waiting for the brief to finish')
    : undefined;
  const isTerminal =
    job?.status === 'succeeded' || job?.status === 'failed' || job?.status === 'canceled';
  return {
    job,
    isGenerating: isPosting || (!isTerminal && !timeoutError && !jobError && !mutationError),
    requestError: mutationError ?? jobError ?? timeoutError ?? undefined,
    mode,
    regenerate,
  };
};
