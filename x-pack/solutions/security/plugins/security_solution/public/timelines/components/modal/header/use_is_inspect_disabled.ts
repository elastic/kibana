/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useSelector } from 'react-redux-v7';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useDataView } from '../../../../data_view_manager/hooks/use_data_view';
import { useBrowserFields } from '../../../../data_view_manager/hooks/use_browser_fields';
import { PageScope } from '../../../../data_view_manager/constants';
import { useKibana } from '../../../../common/lib/kibana';
import { combineQueries } from '../../../../common/lib/kuery';
import type { State } from '../../../../common/store';
import { selectDataInTimeline, selectKqlQuery, selectTimelineById } from '../../../store/selectors';

export const useIsInspectDisabled = (timelineId: string): boolean => {
  const { uiSettings } = useKibana().services;
  const { dataView } = useDataView(PageScope.timeline);
  const browserFields = useBrowserFields(dataView);
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);

  const isDataInTimeline = useSelector((state: State) => selectDataInTimeline(state, timelineId));
  const kqlQueryObj = useSelector((state: State) => selectKqlQuery(state, timelineId));
  const { dataProviders, filters, kqlMode } = useSelector((state: State) =>
    selectTimelineById(state, timelineId)
  );

  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        dataView,
        browserFields,
        filters: filters ?? [],
        kqlQuery: kqlQueryObj,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, dataView, filters, kqlMode, kqlQueryObj]
  );

  return !isDataInTimeline || combinedQueries?.filterQuery === undefined;
};
