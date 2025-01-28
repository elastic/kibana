/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { FAILED_TESTS_LABEL } from './failed_tests';
import { ClientPluginsStart } from '../../../../../plugin';
import { useMonitorQueryFilters } from '../hooks/use_monitor_query_filters';

export const FailedTestsCount = ({ from, to, id }: { to: string; from: string; id: string }) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  const { queryIdFilter, locationFilter } = useMonitorQueryFilters();

  if (!queryIdFilter) {
    return null;
  }

  return (
    <ExploratoryViewEmbeddable
      id={id}
      reportType="single-metric"
      attributes={[
        {
          time: { from, to },
          reportDefinitions: queryIdFilter,
          filters: locationFilter,
          dataType: 'synthetics',
          selectedMetricField: 'monitor_failed_tests',
          name: FAILED_TESTS_LABEL,
        },
      ]}
    />
  );
};
