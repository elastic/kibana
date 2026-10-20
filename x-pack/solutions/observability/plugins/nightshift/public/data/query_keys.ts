/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const DISCOVERY_QUERIES_QUERY_KEY = ['discoveryQueries'] as const;
export const DISCOVERY_QUERIES_OCCURRENCES_QUERY_KEY = ['discoveryQueriesOccurrences'] as const;
export const SOURCES_QUERY_KEY = ['nightshiftSources'] as const;
export const FEATURES_QUERY_KEY = ['features'] as const;

export const detectionOverviewQueryKey = ({ from, to }: { from: string; to: string }) =>
  ['nightshift.detectionOverview', from, to] as const;

export const significantEventsListQueryKey = ({
  from,
  to,
  page,
  perPage,
  search,
  status,
  severity,
}: {
  from: string;
  to: string;
  page: number;
  perPage: number;
  search: string;
  status: readonly string[];
  severity: readonly string[];
}) =>
  ['nightshift.significantEventsList', from, to, page, perPage, search, status, severity] as const;
