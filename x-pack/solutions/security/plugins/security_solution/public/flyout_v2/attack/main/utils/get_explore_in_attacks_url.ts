/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { encode } from '@kbn/rison';
import moment from 'moment';
import { URL_PARAM_KEY } from '../../../../common/hooks/use_url_state';
import {
  ATTACK_FLYOUT_V2_URL_PARAM,
  encodeAttackFlyoutV2UrlParam,
} from './attack_flyout_v2_url_param';

export interface GetExploreInAttacksUrlParams {
  attackId: string;
  indexName: string;
  timestamp?: string;
  attacksBaseURL: string;
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
    [ATTACK_FLYOUT_V2_URL_PARAM]: encodeAttackFlyoutV2UrlParam({ attackId, indexName }),
  });

  return `${attacksBaseURL}?${urlParams.toString()}`;
};
