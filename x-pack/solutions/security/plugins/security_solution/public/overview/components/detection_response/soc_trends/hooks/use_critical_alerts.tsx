/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useReducer } from 'react';
import { ALERTS_QUERY_NAMES } from '../../../../../detections/containers/detection_engine/alerts/constants';
import { useQueryAlerts } from '../../../../../detections/containers/detection_engine/alerts/use_query';
import type { GlobalTimeArgs } from '../../../../../common/containers/use_global_time';
import * as i18n from '../translations';
import { getPercChange } from '../helpers';
import { statReducer } from './stat_reducer';
import type { StatState } from './use_soc_trends';

export interface UseCriticalAlerts {
  from: GlobalTimeArgs['from'];
  fromCompare: string;
  skip?: boolean;
  signalIndexName: string | null;
  to: GlobalTimeArgs['to'];
  toCompare: string;
}
export interface CriticalOpenAlertsAgg {
  open: {
    doc_count: number;
    critical: {
      doc_count: number;
    };
  };
}
const getCriticalAlertsQuery = ({ from, to }: { from: string; to: string }) => ({
  size: 0,
  query: {
    bool: {
      filter: [{ range: { '@timestamp': { gte: from, lte: to } } }],
    },
  },
  aggs: {
    open: {
      filter: {
        term: {
          'kibana.alert.workflow_status': 'open',
        },
      },
      aggs: {
        critical: {
          filter: {
            term: {
              'kibana.alert.severity': 'critical',
            },
          },
        },
      },
    },
  },
});

export const useCriticalAlerts = ({
  from,
  fromCompare,
  skip = false,
  signalIndexName,
  to,
  toCompare,
}: UseCriticalAlerts): StatState => {
  const [state, dispatch] = useReducer(statReducer, {
    description: i18n.CRITICAL_ALERTS_DESCRIPTION,
    isLoading: true,
    percentage: {
      percent: null,
      color: 'hollow',
      note: i18n.NO_DATA('alerts'),
    },
    stat: '-',
    testRef: 'criticalAlerts',
    title: i18n.CRITICAL_ALERTS_STAT,
    updatedAt: Date.now(),
  });
  const currentTimeQuery = useMemo(
    () =>
      getCriticalAlertsQuery({
        from,
        to,
      }),
    [from, to]
  );

  const compareTimeQuery = useMemo(
    () =>
      getCriticalAlertsQuery({
        from: fromCompare,
        to: toCompare,
      }),
    [fromCompare, toCompare]
  );
  const {
    data: dataCurrent,
    loading: isLoadingCurrent,
    setQuery: setAlertsQueryCurrent,
  } = useQueryAlerts<{}, CriticalOpenAlertsAgg>({
    query: currentTimeQuery,
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.SOC_TRENDS,
  });

  const {
    data: dataCompare,
    loading: isLoadingCompare,
    setQuery: setAlertsQueryCompare,
  } = useQueryAlerts<{}, CriticalOpenAlertsAgg>({
    query: compareTimeQuery,
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.SOC_TRENDS,
  });

  useEffect(() => {
    setAlertsQueryCurrent(currentTimeQuery);
  }, [currentTimeQuery, setAlertsQueryCurrent]);
  useEffect(() => {
    setAlertsQueryCompare(compareTimeQuery);
  }, [compareTimeQuery, setAlertsQueryCompare]);
  useEffect(() => {
    dispatch({
      type: 'setIsLoading',
      isLoading: isLoadingCurrent || isLoadingCompare,
    });
  }, [isLoadingCurrent, isLoadingCompare]);

  const current = useMemo(
    () => dataCurrent?.aggregations?.open.critical.doc_count ?? null,
    [dataCurrent?.aggregations?.open.critical.doc_count]
  );
  const compare = useMemo(
    () => dataCompare?.aggregations?.open.critical.doc_count ?? null,
    [dataCompare?.aggregations?.open.critical.doc_count]
  );
  useEffect(() => {
    const percentageChange = getPercChange(current, compare);
    if (current != null) {
      dispatch({
        type: 'setStat',
        stat: `${current}`,
      });
    } else {
      dispatch({ type: 'setStat', stat: '-' });
    }
    if (
      current != null &&
      compare != null &&
      current !== 0 &&
      compare !== 0 &&
      percentageChange != null
    ) {
      const isNegative = percentageChange.charAt(0) === '-';
      const isZero = percentageChange === '0.0%';

      dispatch({
        type: 'setPercentage',
        percentage: {
          percent: isNegative || isZero ? percentageChange : `+${percentageChange}`,
          color: isZero
            ? 'hollow'
            : isNegative
            ? 'success' // a negative change is good
            : 'danger',
          note: isZero
            ? i18n.NO_CHANGE('open critical alert count')
            : i18n.STAT_DIFFERENCE({
                upOrDown: isNegative ? 'down' : 'up',
                percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
                stat: `${compare}`,
                statType: 'open critical alert count',
              }),
        },
      });
    } else {
      const badCurrent = current == null || current === 0;
      const badCompare = compare == null || compare === 0;
      const note =
        badCurrent && badCompare
          ? i18n.NO_DATA('alerts')
          : badCurrent
          ? i18n.NO_DATA_CURRENT('alerts')
          : i18n.NO_DATA_COMPARE('alerts');

      dispatch({
        type: 'setPercentage',
        percentage: {
          percent: null,
          color: 'hollow',
          note,
        },
      });
    }
    dispatch({ type: 'setUpdatedAt', updatedAt: Date.now() });
  }, [current, compare]);

  return state;
};
