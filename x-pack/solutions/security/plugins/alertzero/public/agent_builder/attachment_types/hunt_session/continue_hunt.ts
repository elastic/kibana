/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core-http-browser';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import { API_VERSIONS } from '@kbn/alertzero-common';
import { HUNT_LIBRARY_URL } from '../../../../common/constants';
import type { HuntContinueResponse } from '../../../../common/hunt_library';
import { buildHuntProfileLocatorState } from '../../../../common/hunt_library_profile_state';

/**
 * Filters were stored as JSON when small enough to keep whole. Those come back as filters; summaries
 * of filters that were too large to keep are shown in the Investigation but cannot be restored.
 */
export const restoreFilters = (
  stored: HuntContinueResponse['resume']['filters']
): SerializableRecord[] =>
  stored.flatMap((entry) => {
    if (typeof entry.json !== 'string') return [];
    try {
      const parsed: unknown = JSON.parse(entry.json);
      return parsed !== null && typeof parsed === 'object' ? [parsed as SerializableRecord] : [];
    } catch {
      return [];
    }
  });

/**
 * Reopens a hunt in Discover from an Investigation: records a fresh session, then opens Discover at the
 * saved state with the signed Hunt state linked to the Investigation. Rejects when the server refuses
 * or Discover cannot be opened, so the caller can say so.
 */
export const continueHunt = async ({
  http,
  share,
  investigationId,
}: {
  http: HttpStart;
  share?: SharePluginStart;
  investigationId: string;
}): Promise<void> => {
  const locator = share?.url.locators.get('DISCOVER_APP_LOCATOR');
  if (!locator) throw new Error('Discover is not available');

  const { resume, profile_token: token } = await http.post<HuntContinueResponse>(
    `${HUNT_LIBRARY_URL}/session/continue`,
    {
      version: API_VERSIONS.internal.v1,
      body: JSON.stringify({ investigation_id: investigationId }),
    }
  );

  await locator.navigate({
    query: { esql: resume.query },
    timeRange: resume.time_range,
    columns: resume.columns,
    filters: restoreFilters(resume.filters),
    profileState: buildHuntProfileLocatorState(token),
  } as SerializableRecord);
};
