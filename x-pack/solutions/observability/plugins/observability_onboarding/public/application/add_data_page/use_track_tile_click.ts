/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEventHandler } from 'react';
import { useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ObservabilityOnboardingAppServices } from '../..';
import type { AddDataTileClickEventFields } from '../../../common/telemetry_events';
import { OBSERVABILITY_ONBOARDING_ADD_DATA_TILE_CLICK_TELEMETRY_EVENT } from '../../../common/telemetry_events';

export type TileClickFields = Omit<AddDataTileClickEventFields, 'has_search_term'>;

export type TrackTileClick = (
  fields: TileClickFields,
  onClick?: MouseEventHandler
) => MouseEventHandler;

/** Wraps a tile's click handler so the pick is reported before the tile navigates or opens a chooser. */
export const useTrackTileClick = (): TrackTileClick => {
  const {
    services: { analytics },
  } = useKibana<ObservabilityOnboardingAppServices>();
  const history = useHistory();

  return useCallback<TrackTileClick>(
    (fields, onClick) => (event) => {
      analytics?.reportEvent(
        OBSERVABILITY_ONBOARDING_ADD_DATA_TILE_CLICK_TELEMETRY_EVENT.eventType,
        {
          ...fields,
          // Read before `onClick` runs: route tiles push a new url in their handler.
          has_search_term: Boolean(new URLSearchParams(history.location.search).get('search')),
        }
      );
      onClick?.(event);
    },
    [analytics, history]
  );
};
