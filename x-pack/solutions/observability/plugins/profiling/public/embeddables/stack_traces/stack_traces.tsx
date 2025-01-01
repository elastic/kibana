/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { StackTracesDisplayOption, TopNType } from '@kbn/profiling-utils';
import React, { useState } from 'react';
import { groupSamplesByCategory } from '../../../common/topn';
import { useProfilingDependencies } from '../../components/contexts/profiling_dependencies/use_profiling_dependencies';
import { StackTraces as StatelessStackTraces } from '../../components/stack_traces';
import { AsyncStatus, useAsync } from '../../hooks/use_async';
import { EmptyDataPrompt } from '../empty_data_prompt';
import { ErrorPrompt } from '../error_prompt';

export interface StackTracesProps {
  type: TopNType;
  kuery: string;
  rangeFrom: number;
  rangeTo: number;
  onClick: (category: string) => void;
  onChartBrushEnd: (range: { rangeFrom: string; rangeTo: string }) => void;
}

export function StackTraces({
  type,
  kuery,
  rangeFrom,
  rangeTo,
  onClick,
  onChartBrushEnd,
}: StackTracesProps) {
  const {
    services: { fetchTopN },
  } = useProfilingDependencies();
  const [displayOption, setDisplayOption] = useState(StackTracesDisplayOption.StackTraces);

  const rangeFromSec = rangeFrom / 1000;
  const rangeToSec = rangeTo / 1000;

  const state = useAsync(
    ({ http }) => {
      return fetchTopN({
        http,
        type,
        timeFrom: rangeFromSec,
        timeTo: rangeToSec,
        kuery,
      }).then(groupSamplesByCategory);
    },
    [fetchTopN, type, rangeFromSec, rangeToSec, kuery]
  );

  if (state.error) {
    return <ErrorPrompt />;
  }

  if (state.status === AsyncStatus.Settled && state.data?.charts.length === 0) {
    return <EmptyDataPrompt />;
  }

  return (
    <StatelessStackTraces
      type={type}
      state={state}
      displayOption={displayOption}
      limit={10}
      onChangeDisplayOption={setDisplayOption}
      onStackedBarChartBrushEnd={onChartBrushEnd}
      onChartClick={onClick}
    />
  );
}
