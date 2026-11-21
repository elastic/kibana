/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import { createHash } from 'crypto';
import { fetchFeedStepCommonDefinition } from '../../../../common/workflows/step_types/fetch_feed/fetch_feed_common';
import type { FetchedFeed } from '../../../../common/workflows/step_types/fetch_feed/fetch_feed_common';
import { LicenseRequiredError, isEnterprise } from '../../../lib/license';
import { downloadFeed } from '../../../lib/feeds/fetch';
import { getCachedFeed, retainCachedFeeds, setCachedFeed } from '../../../lib/feeds/feed_cache';
import { groupByRelease, readInventory, truncate } from '../../../lib/scan';
import type { StepDeps } from '../deps';

const ABORTED = 'The feed download was aborted';

/** Fingerprint of a feed body: the sha256 of its bytes, hex. */
export const bodySha256 = (body: Uint8Array): string =>
  createHash('sha256').update(body).digest('hex');

/**
 * Downloads each needed vendor feed (conditionally, by ETag) and keeps the bytes on the server.
 * The output is per-release metadata only: advisory data would blow the step output size limit.
 */
export const buildFetchFeedStepDefinition = ({
  logger,
  getScanDeps,
  getLicense,
  includeUnfixed,
}: StepDeps) =>
  createServerStepDefinition({
    ...fetchFeedStepCommonDefinition,
    handler: async ({ abortSignal: signal }) => {
      if (!isEnterprise(await getLicense())) return { error: new LicenseRequiredError() };
      const { es, packRepository } = await getScanDeps();
      const inventory = await readInventory({ es, packRepository, logger }, signal);
      if (inventory.packMissing) {
        return { output: { feeds: [], hosts: 0, pack_missing: true } };
      }

      const feeds: FetchedFeed[] = [];
      const output = () => ({ feeds, hosts: inventory.hosts.length, pack_missing: false });
      for (const [release, hosts] of groupByRelease(inventory.hosts)) {
        if (signal.aborted) return { output: output(), error: new Error(ABORTED) };
        const known = getCachedFeed(release, includeUnfixed);
        try {
          const result = await downloadFeed(hosts[0].inventory.os, {
            signal,
            etag: known?.etag,
            includeUnfixed,
            logger: { warn: (message) => logger.warn(message) },
          });
          if (result.status === 'unavailable') {
            logger.warn(
              `No advisory feed for ${release} (${result.url}); ${hosts.length} hosts will not be scanned.`
            );
            feeds.push({ release, status: 'unavailable', hosts: hosts.length, url: result.url });
          } else if (result.status === 'not_modified') {
            if (!known) throw new Error('The vendor answered 304 to a request without an ETag');
            feeds.push({
              release,
              status: 'not_modified',
              hosts: hosts.length,
              etag: result.etag,
              last_modified: result.lastModified,
              bytes: known.body.byteLength,
              download_ms: result.durationMs,
              downloaded_bytes: result.downloadedBytes,
            });
          } else {
            const { body, etag, lastModified, durationMs, downloadedBytes } = result;
            // RHEL's S3 answers 200 with identical bytes on every request: compare the body
            // hash against the cached copy and treat a match like a 304, without clobbering
            // the cached knowledge ids or the (possibly new) etag.
            // An entry older than bodySha256 is hashed on demand for the comparison only;
            // the entry itself is replaced (or its etag rotated) below as usual.
            const knownSha =
              known !== undefined ? known.bodySha256 ?? bodySha256(known.body) : undefined;
            const unchanged = known !== undefined && bodySha256(body) === knownSha;
            if (!unchanged) {
              setCachedFeed(release, {
                body,
                etag,
                lastModified,
                includeUnfixed,
                bodySha256: bodySha256(body),
              });
            } else if (etag && etag !== known.etag) {
              known.etag = etag;
              known.lastModified = lastModified ?? known.lastModified;
            }
            feeds.push({
              release,
              status: 'downloaded',
              hosts: hosts.length,
              etag,
              last_modified: lastModified,
              bytes: body.byteLength,
              download_ms: durationMs,
              downloaded_bytes: downloadedBytes,
              ...(unchanged ? { unchanged: true } : {}),
            });
          }
        } catch (error) {
          if (signal.aborted) return { output: output(), error: new Error(ABORTED) };
          const message = truncate(error instanceof Error ? error.message : String(error));
          logger.warn(
            `Could not download the advisory feed for ${release}: ${message}. Check that Kibana can reach the vendor advisory host.`
          );
          feeds.push({ release, status: 'failed', hosts: hosts.length, error: message });
        }
      }

      retainCachedFeeds(
        new Set(
          feeds
            .filter(({ status }) => status === 'downloaded' || status === 'not_modified')
            .map(({ release }) => release)
        )
      );
      return { output: output() };
    },
  });
