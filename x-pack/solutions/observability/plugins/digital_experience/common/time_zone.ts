/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every `moment.tz.names()` entry (and so `dateFormat:tz` option) that Elasticsearch 9.7 rejects,
// in a `date_histogram` and an ES|QL `time_zone` alike, as the zone it links to.
const ELASTICSEARCH_TIME_ZONE_OF: Readonly<Record<string, string>> = {
  EST: 'America/Panama',
  HST: 'Pacific/Honolulu',
  MST: 'America/Phoenix',
  ROC: 'Asia/Taipei',
};

/** `timeZone` as Elasticsearch takes it: the zone it links to, for a name Elasticsearch rejects. */
export const toElasticsearchTimeZone = (timeZone: string): string =>
  ELASTICSEARCH_TIME_ZONE_OF[timeZone] ?? timeZone;
