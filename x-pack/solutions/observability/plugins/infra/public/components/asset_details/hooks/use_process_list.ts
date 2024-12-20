/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainter from 'constate';
import { useMetricsDataViewContext } from '../../../containers/metrics_source';

export interface SortBy {
  name: string;
  isAscending: boolean;
}

function useProcessListParams(props: { hostTerm: Record<string, string>; to: number }) {
  const { hostTerm, to } = props;
  const { metricsView } = useMetricsDataViewContext();
  return { hostTerm, indexPattern: metricsView?.indices, to };
}
const ProcessListContext = createContainter(useProcessListParams);
export const [ProcessListContextProvider, useProcessListContext] = ProcessListContext;
