/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MOBILE_FIELDS } from '../../../../common/mobile_panel';
import type { MobileApplicationSummary } from '../../../../common/types/applications';
import { toNumber, toPlatforms } from '../../../lib/mobile/rows';
import type { EsqlRow } from '../../../services/sessions/summary_documents';

/** One row of `applicationsQuery` as an application of the list. */
export const toApplication = (
  row: EsqlRow,
  { environments, latest }: { environments: string[]; latest: string | null }
): MobileApplicationSummary => {
  const sessions = toNumber(row.sessions);
  const exceptions = toNumber(row.exceptions);
  return {
    serviceName: String(row[MOBILE_FIELDS.serviceName]),
    source: 'mobile',
    environments,
    platforms: toPlatforms(row.platforms),
    latestRelease: latest,
    sessions: { count: sessions },
    users: { count: toNumber(row.users) },
    // A crash isn't defined yet (#64) and session start doesn't reach the SDKs: not enough data.
    crashFreeSessions: { value: null, previous: null, delta: null },
    errorRate: sessions > 0 ? exceptions / sessions : null,
    lastSeen: typeof row.last_seen === 'string' ? row.last_seen : null,
  };
};
