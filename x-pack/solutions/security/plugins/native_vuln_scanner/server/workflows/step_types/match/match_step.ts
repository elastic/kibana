/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID } from '@kbn/workflows/managed';
import { matchStepCommonDefinition } from '../../../../common/workflows/step_types/match/match_common';
import type {
  MatchInput,
  MatchOutput,
} from '../../../../common/workflows/step_types/match/match_common';
import { getCachedFeed, markKnowledgeStored } from '../../../lib/feeds/feed_cache';
import { loadFeed, parseFeedBody } from '../../../lib/feeds/fetch';
import type { FeedOs, LoadFeedResult } from '../../../lib/feeds/fetch';
import { LicenseRequiredError, isEnterprise } from '../../../lib/license';
import { ScanFailedError, releaseKey, runScan } from '../../../lib/scan';
import type { ScanRunScope, ScanSummary } from '../../../lib/scan';
import type { StepDeps } from '../deps';

const toOutput = (summary: ScanSummary): MatchOutput => ({
  hosts: summary.hosts,
  findings: summary.findings,
  fixed: summary.fixed,
  aborted: summary.aborted,
  pack_missing: summary.packMissing,
  ...(summary.scope === 'refresh' ? { scope: summary.scope } : {}),
  releases: summary.releases,
  skipped_releases: summary.skippedReleases,
  failures: {},
  feed_provenance: Object.fromEntries(
    Object.entries(summary.feedInfo).map(([release, info]) => [
      release,
      {
        ...(info.sourceUrl ? { source_url: info.sourceUrl } : {}),
        ...(info.snapshotTime ? { snapshot_time: info.snapshotTime } : {}),
        ...(info.ageSeconds !== undefined ? { age_seconds: info.ageSeconds } : {}),
      },
    ])
  ),
  distinct_cves: summary.distinctCves,
  kev: summary.kev,
  knowledge: {
    written: summary.knowledge.written,
    unchanged: summary.knowledge.unchanged,
    failed: summary.knowledge.failed,
    skipped_releases: summary.knowledge.skippedReleases,
  },
});

/**
 * Runs the scan against the feeds the fetch step left on this node. A node that has none (the
 * engine may run steps on different nodes) downloads the feed itself; a release the fetch step
 * already reported as failed or unavailable is not retried.
 */
export const buildFeedLoader =
  (feeds: NonNullable<MatchInput['feeds']>, includeUnfixed: boolean) =>
  async (os: FeedOs, { signal }: { signal: AbortSignal }): Promise<LoadFeedResult> => {
    const release = releaseKey(os);
    const reported = feeds.find((feed) => feed.release === release);
    if (reported?.status === 'failed') {
      throw new Error(reported.error ?? 'The feed download failed');
    }
    if (reported?.status === 'unavailable' && reported.url) {
      return { status: 'unavailable', url: reported.url };
    }
    const cached = getCachedFeed(release, includeUnfixed);
    if (!cached) return loadFeed(os, { signal, includeUnfixed });
    const feed = await parseFeedBody(os, cached.body, { signal, includeUnfixed });
    return {
      status: 'ok',
      feed,
      etag: cached.etag,
      lastModified: cached.lastModified,
      // setCachedFeed backfills this, so a warm node can always fingerprint its bytes.
      bodySha256: cached.bodySha256,
      // The entry only carries ids recorded for exactly these bytes (a clean write, or
      // preserved by the fetch step on not_modified/unchanged-200), so it is safe for both.
      knowledgeStoredIds: cached.knowledgeStoredIds,
    };
  };

export const buildMatchStepDefinition = ({
  logger,
  getScanDeps,
  getLicense,
  includeUnfixed,
  now,
}: StepDeps) =>
  createServerStepDefinition({
    ...matchStepCommonDefinition,
    handler: async ({ input, abortSignal: signal, contextManager }) => {
      if (!isEnterprise(await getLicense())) return { error: new LicenseRequiredError() };
      const { feeds = [] } = input as MatchInput;
      const { es, packRepository } = await getScanDeps();
      const runId = contextManager.getContext().execution.id;
      // The hourly refresh workflow runs this same step; only it matches changed releases.
      const scope: ScanRunScope =
        contextManager.getContext().workflow.id === NATIVE_VULN_SCANNER_REFRESH_WORKFLOW_ID
          ? 'refresh'
          : 'full';
      try {
        const summary = await runScan(
          {
            es,
            packRepository,
            logger,
            loadFeed: buildFeedLoader(feeds, includeUnfixed),
            includeUnfixed,
            scope,
            onKnowledgeStored: (os, storedIds) =>
              markKnowledgeStored(releaseKey(os), includeUnfixed, storedIds),
            now,
          },
          { signal, runId }
        );
        const output = toOutput(summary);
        if (summary.aborted) {
          return {
            output,
            error: new Error('The scan was aborted before every OS release was processed'),
          };
        }
        return { output };
      } catch (error) {
        if (!(error instanceof ScanFailedError)) throw error;
        // Keep what the other releases did so the summary step can still report it.
        const output = error.summary ? toOutput(error.summary) : undefined;
        return {
          output: output && { ...output, failures: error.failures },
          error: new Error(error.message),
        };
      }
    },
  });
