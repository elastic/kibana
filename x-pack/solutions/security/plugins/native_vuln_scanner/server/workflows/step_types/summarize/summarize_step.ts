/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { summarizeStepCommonDefinition } from '../../../../common/workflows/step_types/summarize/summarize_common';
import type { SummarizeInput } from '../../../../common/workflows/step_types/summarize/summarize_common';
import { LicenseRequiredError, isEnterprise } from '../../../lib/license';
import { truncate } from '../../../lib/scan';
import { SUMMARY_INDEX, ensureSummaryIndex, writeSummary } from '../../../lib/summary';
import type { SummaryDoc, SummaryFeed, SummaryRunStatus } from '../../../lib/summary';
import type { StepDeps } from '../deps';

const toIso = (value: string | Date | undefined, fallback: Date): string => {
  const date = value === undefined ? fallback : new Date(value);
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
};

const statusOf = ({
  fetch,
  match,
  fetch_error: fetchError,
  match_error: matchError,
}: SummarizeInput): SummaryRunStatus => {
  if (match?.aborted) return 'aborted';
  if (!match && (fetchError || matchError)) {
    return /abort/i.test(fetchError ?? matchError ?? '') ? 'aborted' : 'failed';
  }
  if (fetch?.pack_missing || match?.pack_missing) return 'no_pack';
  if (match && Object.keys(match.failures).length > 0) return 'partial';
  return 'success';
};

const feedsOf = ({ fetch, match, match_error: matchError }: SummarizeInput): SummaryFeed[] => {
  const etags = new Map((fetch?.feeds ?? []).map(({ release, etag }) => [release, etag]));
  if (match) {
    return Object.entries(match.releases).map(([release, status]) => ({
      release,
      status,
      etag: etags.get(release),
      error: match.failures[release],
    }));
  }
  // The match step did not report, so only the fetch outcome is known.
  return (fetch?.feeds ?? []).map(({ release, status, etag, error }) => ({
    release,
    status: status === 'unavailable' ? 'unavailable' : 'failed',
    etag,
    error:
      error ??
      (status === 'unavailable'
        ? undefined
        : `Not matched: ${matchError ?? 'the match step did not run'}`),
  }));
};

export const buildSummarizeStepDefinition = ({
  logger,
  getScanDeps,
  getLicense,
  now = () => new Date(),
}: StepDeps) =>
  createServerStepDefinition({
    ...summarizeStepCommonDefinition,
    handler: async ({ input, contextManager }) => {
      if (!isEnterprise(await getLicense())) return { error: new LicenseRequiredError() };
      const params = input as SummarizeInput;
      const { fetch, match, fetch_error: fetchError, match_error: matchError } = params;
      const { es } = await getScanDeps();
      const { execution } = contextManager.getContext();
      const finished = now();
      const status = statusOf(params);
      const feeds = feedsOf(params);
      const failures = [
        ...feeds.filter(({ error }) => error).map(({ release, error }) => `${release}: ${error}`),
        ...(fetchError ? [`fetch: ${fetchError}`] : []),
        ...(matchError && !feeds.some(({ error }) => error) ? [`match: ${matchError}`] : []),
      ].map((message) => truncate(message));

      const doc: SummaryDoc = {
        '@timestamp': finished.toISOString(),
        run_id: execution.id,
        started_at: toIso(execution.startedAt, finished),
        finished_at: finished.toISOString(),
        status,
        hosts_scanned: match?.hosts ?? fetch?.hosts ?? 0,
        findings_open: match?.findings ?? 0,
        findings_fixed: match?.fixed ?? 0,
        feeds,
        failures,
      };
      // Start-up creates the index too, but a write before it exists would auto-create it unmapped.
      await ensureSummaryIndex(es);
      await writeSummary(es, doc);
      logger.info(`Vulnerability scan ${doc.run_id} finished: ${status}`);
      return { output: { run_id: doc.run_id, status, index: SUMMARY_INDEX } };
    },
  });
