/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { SYNTHETICS_INDEX_PATTERN } from '../../../../../../common/constants';
import { useReduxEsSearch } from '../../../hooks/use_redux_es_search';

export interface Filmstrip {
  id: string;
  timestamp: string;
  synthetics: {
    blob: string;
    payload: {
      index: number;
    };
    step: {
      index: number;
    };
  };
}

export const useFilmstrips = ({
  checkGroup,
  stepIndex,
}: {
  checkGroup: string;
  stepIndex?: number;
}) => {
  const { data, loading } = useReduxEsSearch(
    {
      index: SYNTHETICS_INDEX_PATTERN,
      body: {
        size: 10000,
        query: {
          bool: {
            filter: [
              {
                term: {
                  'monitor.check_group': checkGroup,
                },
              },
              {
                term: {
                  'synthetics.type': 'step/filmstrips',
                },
              },
              ...(stepIndex ? [{ term: { 'synthetics.step.index': stepIndex } }] : []),
            ],
          },
        },
        sort: [{ '@timestamp': 'desc' }],
      },
    },
    [checkGroup, stepIndex],
    { name: 'getFilmstrips/' + checkGroup + '/' + stepIndex }
  );

  return useMemo(() => {
    let filmstrips =
      data?.hits.hits?.map((doc) => {
        const source = doc._source as any;
        return { ...source, timestamp: source['@timestamp'], id: doc._id } as Filmstrip;
      }) ?? [];

    filmstrips = filmstrips
      .sort((a, b) => a.synthetics?.payload?.index! - b.synthetics?.payload?.index!)
      .sort((a, b) => a.synthetics?.step?.index! - b.synthetics?.step?.index!);

    return {
      filmstrips,
      loading,
    };
  }, [data, loading]);
};
