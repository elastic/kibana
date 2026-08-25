/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiPageHeader, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { AlertsV2SearchBar } from './alerts_v2_search_bar';

const DEFAULT_QUERY: AggregateQuery = { esql: 'FROM .rule-events | LIMIT 100' };
const DEFAULT_TIME_RANGE: TimeRange = { from: 'now-15m', to: 'now' };

/**
 * POC "Alerts v2" page (RnA / Alerting v2). Roughly mimics the v1 alerts page,
 * but ES|QL-first: the top search bar is Discover's "Query in ES|QL" experience.
 * Running the query and rendering results is wired in a later step.
 */
export const AlertsV2Page = () => {
  const [query, setQuery] = useState<AggregateQuery>(DEFAULT_QUERY);
  const [timeRange, setTimeRange] = useState<TimeRange>(DEFAULT_TIME_RANGE);

  const onSubmit = useCallback(
    (payload: { query: AggregateQuery; timeRange: TimeRange }) => {
      setQuery(payload.query);
      setTimeRange(payload.timeRange);
    },
    []
  );

  return (
    <>
      <EuiPageHeader
        bottomBorder
        pageTitle={
          <FormattedMessage
            id="xpack.securitySolution.alertsV2.pageTitle"
            defaultMessage="Alerts v2"
          />
        }
      />
      <EuiSpacer size="l" />
      <AlertsV2SearchBar query={query} timeRange={timeRange} onSubmit={onSubmit} />
    </>
  );
};
