/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { DataView } from '@kbn/data-views-plugin/common';
import type { Query, TimeRange } from '@kbn/es-query';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { PROFILING_EVENTS_INDEX_BY_SCHEMA, ProfilingSchema } from '@kbn/profiling-utils';
import { compact } from 'lodash';
import React, { useEffect, useState } from 'react';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';

interface Props {
  kuery: string;
  rangeFrom?: string;
  rangeTo?: string;
  onQuerySubmit: (
    payload: {
      dateRange: TimeRange;
      query?: Query;
    },
    isUpdate?: boolean
  ) => void;
  onRefresh?: Required<React.ComponentProps<typeof SearchBar>>['onRefresh'];
  onRefreshClick: () => void;
  showSubmitButton?: boolean;
  dataTestSubj?: string;
  showDatePicker?: boolean;
  showQueryMenu?: boolean;
  /** Schema whose events the query suggests fields from, Universal Profiling when omitted. */
  schema?: ProfilingSchema;
}

export function ProfilingSearchBar({
  kuery,
  rangeFrom,
  rangeTo,
  onQuerySubmit,
  onRefresh,
  onRefreshClick,
  showSubmitButton = true,
  dataTestSubj = 'profilingUnifiedSearchBar',
  showDatePicker = true,
  showQueryMenu = true,
  schema = ProfilingSchema.ECS,
}: Props) {
  const {
    start: { dataViews },
  } = useProfilingDependencies();

  const [dataView, setDataView] = useState<DataView>();
  const eventsIndex = PROFILING_EVENTS_INDEX_BY_SCHEMA[schema];

  useEffect(() => {
    // Ignore data views created for a previous schema that resolve after the current one
    let isCurrent = true;

    // A stable id lets the data views service reuse the data view, and its fields, once created
    dataViews
      .create({
        id: eventsIndex,
        title: eventsIndex,
      })
      .then((nextDataView) => {
        if (isCurrent) {
          setDataView(nextDataView);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [dataViews, eventsIndex]);

  const searchBarQuery: Required<React.ComponentProps<typeof SearchBar>>['query'] = {
    language: 'kuery',
    query: kuery,
  };

  return (
    <SearchBar<Query>
      onQuerySubmit={({ dateRange, query }) => {
        if (dateRange.from === rangeFrom && dateRange.to === rangeTo && query?.query === kuery) {
          onRefreshClick();
          return;
        }

        onQuerySubmit({ dateRange, query });
      }}
      showQueryInput
      showDatePicker={showDatePicker}
      showFilterBar={false}
      showSaveQuery={false}
      submitButtonStyle={!showSubmitButton ? 'iconOnly' : 'auto'}
      query={searchBarQuery}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      indexPatterns={compact([dataView])}
      onRefresh={onRefresh}
      displayStyle="inPage"
      dataTestSubj={dataTestSubj}
      showQueryMenu={showQueryMenu}
    />
  );
}
