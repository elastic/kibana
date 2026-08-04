/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { encode } from '@kbn/rison';
import moment from 'moment';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import { resolveAttackFlyoutParams } from '../../../../detections/pages/attacks/utils';
import {
  ATTACK_FLYOUT_V2_URL_PARAM,
  encodeAttackFlyoutV2UrlParam,
} from './attack_flyout_v2_url_param';

export interface GetExploreInAttacksUrlParams {
  attackId: string;
  indexName: string;
  timestamp?: string;
  attacksBaseURL: string;
  /**
   * When true, encode an auto-open trigger for the v2 attack flyout instead of the
   * legacy URL-driven flyout state. The destination attacks page reads this param
   * and opens the v2 flyout via the system overlays API.
   */
  useFlyoutV2?: boolean;
}

/**
 * Builds a URL for the attacks page that filters to a specific attack and auto-opens its flyout.
 * Timerange spans from the attack's @timestamp to timestamp + 5 minutes.
 */
export const buildExploreInAttacksUrl = ({
  attackId,
  indexName,
  timestamp,
  attacksBaseURL,
  useFlyoutV2 = false,
}: GetExploreInAttacksUrlParams): string => {
  const fromTime = timestamp ?? new Date().toISOString();
  const toTime = moment(fromTime).add(5, 'minutes').toISOString();

  const kqlAppQuery = encode({ language: 'kuery', query: `_id: ${attackId}` });

  const timerange = encode({
    global: {
      [URL_PARAM_KEY.timerange]: {
        kind: 'absolute',
        from: fromTime,
        to: toTime,
      },
      linkTo: [],
    },
    timeline: {
      [URL_PARAM_KEY.timerange]: {},
      linkTo: [],
    },
  });

  const urlParams = new URLSearchParams({
    [URL_PARAM_KEY.appQuery]: kqlAppQuery,
    [URL_PARAM_KEY.timerange]: timerange,
  });

  if (useFlyoutV2) {
    urlParams.set(
      ATTACK_FLYOUT_V2_URL_PARAM,
      encodeAttackFlyoutV2UrlParam({ attackId, indexName })
    );
  } else {
    urlParams.set(
      URL_PARAM_KEY.flyout,
      resolveAttackFlyoutParams({ index: indexName, attackId }, null)
    );
  }

  return `${attacksBaseURL}?${urlParams.toString()}`;
};

/**
 * Builds the explore-in-attacks URL by extracting attackId, indexName, and timestamp
 * from a DataTableRecord hit.
 */
export const getExploreInAttacksUrl = (
  hit: DataTableRecord,
  attacksBaseURL: string,
  { useFlyoutV2 = false }: { useFlyoutV2?: boolean } = {}
): string => {
  const attackId = hit.raw._id ?? (getFieldValue(hit, '_id') as string) ?? '';
  const indexName = hit.raw._index ?? (getFieldValue(hit, '_index') as string) ?? '';
  const timestamp = getFieldValue(hit, '@timestamp') as string | undefined;

  return buildExploreInAttacksUrl({
    attackId,
    indexName,
    timestamp,
    attacksBaseURL,
    useFlyoutV2,
  });
};
