/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import type { ISearchGeneric } from '@kbn/search-types';
import {
  buildAlertsSelectionQuery,
  getPageTimerangeBounds,
} from '@kbn/securitysolution-alerts-page-url';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';

/**
 * How many alerts a selection with tags holds, over the time range of its Alerts page link, so the
 * count matches what the link shows. Undefined without tags, while it loads, or when it fails.
 */
export const useTaggedAlertsCount = ({
  alertIds,
  tags,
  createdAt,
  spaceId,
  search,
}: {
  alertIds: readonly string[];
  tags: readonly string[];
  createdAt?: string;
  spaceId?: string;
  search: ISearchGeneric;
}): number | undefined => {
  const [fetched, setFetched] = useState<{ key: string; count: number }>();
  const key = JSON.stringify([spaceId, createdAt, alertIds, tags]);

  useEffect(() => {
    if (!spaceId || tags.length === 0) {
      return;
    }

    let isMounted = true;
    const { from, to } = getPageTimerangeBounds(createdAt ?? new Date().toISOString());
    lastValueFrom(
      search({
        params: {
          index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
          size: 0,
          track_total_hits: true,
          query: {
            bool: {
              filter: [
                buildAlertsSelectionQuery({ alertIds, tags }),
                { range: { '@timestamp': { gte: from, lte: to } } },
              ],
            },
          },
        },
      })
    )
      .then((response) => {
        const { total } = response.rawResponse.hits;
        const count = typeof total === 'number' ? total : total?.value;
        if (isMounted && count !== undefined) {
          setFetched({ key, count });
        }
      })
      .catch((error) => {
        window.console.warn('Grouped attachment could not count the tagged alerts', error);
      });

    return () => {
      isMounted = false;
    };
  }, [alertIds, createdAt, key, search, spaceId, tags]);

  return fetched?.key === key ? fetched.count : undefined;
};
