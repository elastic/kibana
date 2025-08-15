/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import DateMath from '@kbn/datemath';
import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { SLODefinitionResponse, SLOWithSummaryResponse } from '@kbn/slo-schema';
import type { RecursivePartial } from '@kbn/utility-types';
import deepmerge from 'deepmerge';
import moment from 'moment';
import { useEffect, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { toDuration } from '../../../../../utils/slo/duration';

const SLO_HISTORY_URL_STORAGE_KEY = '_a';

interface AppState {
  range: {
    from: Date;
    to: Date;
  };
}

interface SerializedAppState {
  range: {
    from: string;
    to: string;
  };
}

const DEFAULT_STATE: AppState = {
  range: {
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    to: new Date(),
  },
};

export function useUrlAppState(slo: SLOWithSummaryResponse | SLODefinitionResponse): {
  state: AppState;
  updateState: (state: AppState) => void;
} {
  const [state, setState] = useState<AppState>(() => {
    const initialState = {
      ...DEFAULT_STATE,
      range: getDefaultRangeFromSlo(slo),
    };
    return initialState;
  });

  const history = useHistory();
  const urlStateStorage = useRef(
    createKbnUrlStateStorage({
      history,
      useHash: false,
      useHashQuery: false,
    })
  );

  useEffect(() => {
    setState(
      toAppState(
        urlStateStorage.current?.get<SerializedAppState>(SLO_HISTORY_URL_STORAGE_KEY) ?? {},
        slo
      )
    );
  }, [urlStateStorage, slo]);

  const updateState = (newState: AppState) => {
    setState((prevState) => {
      const updatedState = deepmerge(prevState, newState);
      urlStateStorage.current?.set(SLO_HISTORY_URL_STORAGE_KEY, updatedState, {
        replace: true,
      });

      return updatedState;
    });
  };

  return {
    state: deepmerge(DEFAULT_STATE, state),
    updateState,
  };
}

function getDefaultRangeFromSlo(
  slo: SLOWithSummaryResponse | SLODefinitionResponse
): AppState['range'] {
  if (slo.timeWindow.type === 'calendarAligned') {
    const now = moment();
    const duration = toDuration(slo.timeWindow.duration);
    const unit = duration.unit === 'w' ? 'isoWeek' : 'month';

    return {
      from: moment.utc(now).startOf(unit).toDate(),
      to: moment.utc(now).endOf(unit).toDate(),
    };
  }

  return {
    from: new Date(DateMath.parse(`now-${slo.timeWindow.duration}`)!.valueOf()),
    to: new Date(DateMath.parse('now', { roundUp: true })!.valueOf()),
  };
}

function toAppState(
  urlState: RecursivePartial<SerializedAppState>,
  slo: SLOWithSummaryResponse | SLODefinitionResponse
): AppState {
  return {
    ...DEFAULT_STATE,
    range:
      urlState.range && urlState.range.from && urlState.range.to
        ? {
            from: new Date(urlState.range.from),
            to: new Date(urlState.range.to),
          }
        : getDefaultRangeFromSlo(slo),
  };
}
