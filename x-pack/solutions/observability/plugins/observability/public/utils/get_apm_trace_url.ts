/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getApmTraceUrl({
  traceId,
  rangeFrom,
  rangeTo,
}: {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
}) {
  return `/link-to/trace/${traceId}?` + new URLSearchParams({ rangeFrom, rangeTo }).toString();
}
