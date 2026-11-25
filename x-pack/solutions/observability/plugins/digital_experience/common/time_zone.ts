/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// moment-timezone names Elasticsearch 9.7 rejects, as the zone each links to.
const ELASTICSEARCH_TIME_ZONE_OF: Readonly<Record<string, string>> = {
  EST: 'America/Panama',
  HST: 'Pacific/Honolulu',
  MST: 'America/Phoenix',
  ROC: 'Asia/Taipei',
};

/** `timeZone` as Elasticsearch accepts it. */
export const toElasticsearchTimeZone = (timeZone: string): string =>
  ELASTICSEARCH_TIME_ZONE_OF[timeZone] ?? timeZone;
