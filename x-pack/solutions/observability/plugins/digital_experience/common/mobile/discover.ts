/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { TARGET_BUCKETS } from '../histogram';
import { resultColumn } from './fields';
import { mobilePanelQuery, withEnvironment, type MobilePanelFilters } from './filters';
import { kpiStats } from './kpis';

/**
 * Discover fills `?_tstart` and `?_tend` with its time range. Its own time filter includes the
 * end, so this keeps the panel's `[start, end)`.
 */
const inDiscoverTimeRange = () => esql.exp`@timestamp >= ?_tstart AND @timestamp < ?_tend`;

/**
 * The ES|QL that Discover opens for a panel: the KPIs over time with every filter, the
 * environment included, and the values written into the text, as a Discover link takes no params.
 * The buckets follow Discover's time range, so they stay readable when it changes there:
 * `BUCKET` divides the range by `TARGET_BUCKETS` and rounds the width up to a standard one
 * (30 minutes, 1 day…), so there are never more buckets than that.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  { environment }: { environment?: string }
): string =>
  withEnvironment(mobilePanelQuery(filters), environment).pipe`WHERE ${inDiscoverTimeRange()}`
    .pipe`STATS ${kpiStats()}
      BY ${resultColumn('bucket')} = BUCKET(@timestamp, ${TARGET_BUCKETS}, ?_tstart, ?_tend)`
    .pipe`SORT ${resultColumn('bucket')} ASC`
    .inlineParams()
    .print('pipe-multiline');
