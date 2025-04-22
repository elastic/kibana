/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import type { ThreatHuntingQueryQuery } from '../../../common/api/entity_analytics/threat_hunting/common.gen';
import { useKibana } from '../../common/lib/kibana';

export const useOpenThreatHuntingQueryInDiscover = (query: ThreatHuntingQueryQuery) => {
  const { discover } = useKibana().services;
  const [link, setLink] = useState<string | null>(null);

  const queryString = useMemo(() => query.query, [query.query]);

  useEffect(() => {
    const getLink = async () => {
      if (discover && discover.locator) {
        const newLink = await discover.locator.getUrl({
          dataSource: { type: 'esql' },
          timeRange: {
            from: 'now-1w',
            to: 'now',
            mode: 'relative',
          },
          query: {
            esql: queryString,
          },
        });
        setLink(newLink);
      }
    };
    getLink();
  }, [discover, queryString]);

  return useMemo(() => link, [link]);
};
