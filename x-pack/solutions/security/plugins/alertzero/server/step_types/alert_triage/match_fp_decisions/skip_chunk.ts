/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { findAlertIdsWithTag, findStillOpenAlertIds, type tagAlerts } from '../ports';

type KibanaApi = Pick<StepHandlerContext['contextManager'], 'callKibanaApi'>;

interface SkipChunkParams {
  api: KibanaApi;
  write: ReturnType<typeof tagAlerts>;
  chunk: string[];
  /** The tags that keep an alert out of analysis: the inconclusive verdict and the decision's skip tag. */
  skipTags: string[];
  /** The decision's own skip tag, which marks what this call wrote. */
  skipTag: string;
  warn: (what: string, error: unknown) => void;
}

/**
 * Keeps the alerts of one chunk out of analysis. The tags route takes ids only, so the open-status
 * guard of the close cannot be part of the write: the chunk is narrowed to the alerts that are
 * `open` just before the write, and an alert an analyst moved on within the window loses the tags
 * again just after it. Returns the alerts that are kept out of analysis.
 *
 * When a write fails, the chunk may be tagged in part. Only alerts that carry the decision's skip
 * tag lose the tags, so a verdict another writer gave in the meantime stays. They go back to
 * analysis, and the next sweep tries them again. Then the error is thrown.
 */
export const tagSkippedChunk = async ({
  api,
  write,
  chunk,
  skipTags,
  skipTag,
  warn,
}: SkipChunkParams): Promise<string[]> => {
  const open = await findStillOpenAlertIds(api, chunk);
  if (open.length === 0) return [];
  try {
    await write({ alertIds: open, add: skipTags, remove: [] });
    const stillOpen = new Set(await findStillOpenAlertIds(api, open));
    const movedOn = open.filter((alertId) => !stillOpen.has(alertId));
    if (movedOn.length > 0) await write({ alertIds: movedOn, add: [], remove: skipTags });
    return open.filter((alertId) => stillOpen.has(alertId));
  } catch (error) {
    try {
      const tagged = await findAlertIdsWithTag(api, open, skipTag);
      if (tagged.length > 0) await write({ alertIds: tagged, add: [], remove: skipTags });
    } catch (untagError) {
      warn('Could not take the skip tags off a chunk that failed', untagError);
    }
    throw error;
  }
};
