/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import { crashEventsInDiscoverRange } from './crash_groups';
import { mobilePanelQuery, withEnvironment, type MobilePanelFilters } from './filters';
import { resultColumn } from './fields';
import { mobileSessionDocuments } from './session_events';

/**
 * Discover fills `?_tstart` and `?_tend` with its time range. Its own time filter includes the
 * end, so this keeps the panel's `[start, end)`.
 */
const inDiscoverTimeRange = () => esql.exp`@timestamp >= ?_tstart AND @timestamp < ?_tend`;

/**
 * The ES|QL that Discover opens for a panel: the events behind it, newest first, with every filter
 * (the environment included) and the values written into the text, as a Discover link takes no
 * params. Events rather than aggregates, so each crash, exception and its stack trace can be read.
 */
export const mobilePanelDiscoverEsql = (
  filters: MobilePanelFilters,
  { environment }: { environment?: string }
): string =>
  withEnvironment(mobilePanelQuery(filters), environment).pipe`WHERE ${inDiscoverTimeRange()}`
    .pipe`SORT @timestamp DESC`
    .inlineParams()
    .print('pipe-multiline');

/**
 * The ES|QL that Discover opens for the Crashes tab: the crashes it lists, by when they happened
 * and the release that crashed, newest first, with the values written into the text.
 */
export const mobileCrashesDiscoverEsql = (
  filters: MobilePanelFilters,
  { environment }: { environment?: string }
): string =>
  withEnvironment(crashEventsInDiscoverRange(filters), environment).pipe`SORT ${resultColumn(
    'crashTime'
  )} DESC`
    .inlineParams()
    .print('pipe-multiline');

/**
 * The ES|QL that Discover opens for a crash's session: its events, oldest first, matched as the
 * crash's "Before the crash" matches them, with the values written into the text.
 */
export const mobileSessionDiscoverEsql = ({
  serviceName,
  sessionId,
}: {
  serviceName: string;
  sessionId: string;
}): string =>
  mobileSessionDocuments({ serviceName, sessionId }).pipe`SORT @timestamp ASC`
    .inlineParams()
    .print('pipe-multiline');
