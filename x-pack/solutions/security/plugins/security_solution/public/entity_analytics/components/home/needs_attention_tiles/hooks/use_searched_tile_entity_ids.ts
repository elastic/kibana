/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues } from 'lodash';
import { useQuery } from '@kbn/react-query';
import { i18n } from '@kbn/i18n';
import { useErrorToast } from '../../../../../common/hooks/use_error_toast';
import { useKibana } from '../../../../../common/lib/kibana';
import { getEntityIds } from '../../entities_grid/common';
import { buildSearchedTargetsQuery } from '../../entities_grid/queries/entities_in_view';
import { createEsqlRunner, fetchPerIdChunk } from '../../entities_grid/queries/esql';
import type { EsqlRunner } from '../../entities_grid/queries/types';
import type { SignalCardId } from '../data';
import { TILE_QUERY_CACHE_OPTIONS } from './tile_query_cache';

export type TileEntityIds = Readonly<Record<SignalCardId, readonly string[]>>;

/**
 * Each tile's entities that match the search. KQL can't run after the tiles' STATS or joins, so the
 * ids they found are checked on their entity docs (the main entity's, for a resolved one).
 */
export const fetchSearchedTileEntityIds = async (
  runQuery: EsqlRunner,
  { namespace, searchExpression }: { namespace: string; searchExpression: string },
  tileEntityIds: TileEntityIds
): Promise<TileEntityIds> => {
  const ids = [...new Set(Object.values(tileEntityIds).flat())];
  const matchedIds = new Set(
    getEntityIds(
      await fetchPerIdChunk(runQuery, ids, (idsChunk) =>
        buildSearchedTargetsQuery({ namespace, rowsMode: 'resolved', searchExpression }, idsChunk)
      )
    )
  );
  return mapValues(tileEntityIds, (tileIds) => tileIds.filter((id) => matchedIds.has(id)));
};

const SEARCH_QUERY_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.home.tiles.searchQueryError',
  { defaultMessage: 'There was an error applying the search to the tiles' }
);

/** The tiles' entities that match the search; `undefined` without a search. */
export const useSearchedTileEntityIds = ({
  spaceId,
  searchExpression,
  isReady,
  tileEntityIds,
}: {
  spaceId: string;
  searchExpression: string | undefined;
  isReady: boolean;
  tileEntityIds: TileEntityIds;
}): { searchedTileEntityIds?: TileEntityIds; isPending: boolean } => {
  const { data } = useKibana().services;
  const searchArgs = searchExpression ? { namespace: spaceId, searchExpression } : null;
  const {
    data: searchedTileEntityIds,
    isFetching,
    error,
  } = useQuery(
    ['searchedTileEntityIds', searchArgs, tileEntityIds],
    ({ signal }) => {
      if (!searchArgs) throw new Error('There is no search to apply to the tiles');
      return fetchSearchedTileEntityIds(
        createEsqlRunner(data.search, signal),
        searchArgs,
        tileEntityIds
      );
    },
    {
      enabled: isReady && searchArgs != null,
      ...TILE_QUERY_CACHE_OPTIONS,
      refetchOnWindowFocus: false,
    }
  );
  useErrorToast(SEARCH_QUERY_ERROR_TITLE, error);

  return {
    searchedTileEntityIds,
    isPending: searchArgs != null && (!isReady || isFetching),
  };
};
