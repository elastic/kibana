/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { resultColumn } from './fields';
import { mobilePanelQuery, withEnvironment, type MobilePanelFilters } from './filters';
import { kpiStats, type MobileTimeBucket } from './kpis';

const BUCKET_INTERVALS: Record<MobileTimeBucket, () => ReturnType<typeof esql.exp>> = {
  hour: () => esql.exp`1 hour`,
  day: () => esql.exp`1 day`,
};

/**
 * Discover fills `?_tstart` and `?_tend` with its time range. Its own time filter includes the
 * end, so this keeps the panel's `[start, end)`.
 */
const inDiscoverTimeRange = () => esql.exp`@timestamp >= ?_tstart AND @timestamp < ?_tend`;

/**
 * The ES|QL that Discover opens for a panel: the KPIs over time with every filter, the
 * environment included, and the values written into the text, as a Discover link takes no params.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  { bucket, environment }: { bucket: MobileTimeBucket; environment?: string }
): string =>
  withEnvironment(mobilePanelQuery(filters), environment).pipe`WHERE ${inDiscoverTimeRange()}`
    .pipe`STATS ${kpiStats()}
      BY ${resultColumn('bucket')} = BUCKET(@timestamp, ${BUCKET_INTERVALS[bucket]()})`
    .pipe`SORT ${resultColumn('bucket')} ASC`
    .inlineParams()
    .print('pipe-multiline');
