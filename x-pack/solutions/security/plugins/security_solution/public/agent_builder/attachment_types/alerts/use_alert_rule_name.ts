/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { lastValueFrom } from 'rxjs';
import type { ISearchGeneric } from '@kbn/search-types';
import { DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { RULE_NAME_FIELD, firstString } from './to_alert_descriptor';

export const useAlertRuleName = ({
  alertId,
  knownName,
  spaceId,
  search,
}: {
  alertId: string;
  knownName?: string;
  spaceId: string;
  search: ISearchGeneric;
}): string | undefined => {
  const [fetched, setFetched] = useState<{ alertId: string; name: string }>();

  useEffect(() => {
    if (knownName) {
      return;
    }

    let isMounted = true;
    lastValueFrom(
      search({
        params: {
          index: `${DEFAULT_ALERTS_INDEX}-${spaceId}`,
          query: { ids: { values: [alertId] } },
          _source: [RULE_NAME_FIELD],
          size: 1,
        },
      })
    )
      .then((response) => {
        const source = (response.rawResponse.hits.hits[0]?._source ?? {}) as Record<
          string,
          unknown
        >;
        const name = firstString(source[RULE_NAME_FIELD]);
        if (isMounted && name) {
          setFetched({ alertId, name });
        }
      })
      .catch((error) => {
        window.console.warn('Grouped attachment could not read the alert rule name', error);
      });

    return () => {
      isMounted = false;
    };
  }, [alertId, knownName, search, spaceId]);

  return knownName ?? (fetched?.alertId === alertId ? fetched.name : undefined);
};
