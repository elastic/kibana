/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { Redirect, useLocation, useParams } from 'react-router-dom';

import moment from 'moment';
import { encode } from '@kbn/rison';
import { ATTACKS_PATH, DEFAULT_ALERTS_INDEX } from '../../../../common/constants';
import { URL_PARAM_KEY } from '../../../common/hooks/use_url_state';
import { inputsSelectors } from '../../../common/store';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { ATTACK_ID_URL_PARAM, ATTACK_INDEX_URL_PARAM, resolveAttackFlyoutParams } from './utils';

export const AttackDetailsRedirect = () => {
  const { attackId } = useParams<{ attackId: string }>();
  const { search } = useLocation();
  const getInputSelector = useMemo(() => inputsSelectors.inputsSelector(), []);
  const inputState = useSelector(getInputSelector);
  const newFlyoutSystemEnabled = useIsExperimentalFeatureEnabled('newFlyoutSystemEnabled');

  if (!attackId) {
    return <Redirect to={ATTACKS_PATH} />;
  }

  const searchParams = new URLSearchParams(search);
  const timestamp = searchParams.get('timestamp');
  // Safe default when index is missing: same catch-all pattern as alert details redirect
  const index = searchParams.get('index') ?? `.internal${DEFAULT_ALERTS_INDEX}-default`;

  const { linkTo: globalLinkTo, timerange: globalTimerange } = inputState.global;
  const { linkTo: timelineLinkTo, timerange: timelineTimerange } = inputState.timeline;

  const fromTime = timestamp ?? globalTimerange.from;
  const toTime = moment(timestamp ?? globalTimerange.to)
    .add('5', 'minutes')
    .toISOString();

  const timerange = encode({
    global: {
      [URL_PARAM_KEY.timerange]: {
        kind: 'absolute',
        from: fromTime,
        to: toTime,
      },
      linkTo: globalLinkTo,
    },
    timeline: {
      [URL_PARAM_KEY.timerange]: timelineTimerange,
      linkTo: timelineLinkTo,
    },
  });

  const kqlAppQuery = encode({ language: 'kuery', query: `_id: ${attackId}` });

  // Flyout V2 mode: pass `attackId` + `index` as plain query params; the Attacks
  // page imperatively opens the V2 system flyout on mount and strips both
  // keys from the URL. Legacy mode keeps serialising the panel-key state
  // into the `flyout` URL param consumed by the expandable flyout.
  const urlParams = newFlyoutSystemEnabled
    ? new URLSearchParams({
        [URL_PARAM_KEY.appQuery]: kqlAppQuery,
        [URL_PARAM_KEY.timerange]: timerange,
        [ATTACK_ID_URL_PARAM]: attackId,
        [ATTACK_INDEX_URL_PARAM]: index,
      })
    : new URLSearchParams({
        [URL_PARAM_KEY.appQuery]: kqlAppQuery,
        [URL_PARAM_KEY.timerange]: timerange,
        [URL_PARAM_KEY.flyout]: resolveAttackFlyoutParams(
          { index, attackId },
          searchParams.get(URL_PARAM_KEY.flyout)
        ),
      });

  const url = `${ATTACKS_PATH}?${urlParams.toString()}`;

  return <Redirect to={url} />;
};
