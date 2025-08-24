/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import { FAILED_TESTS_LABEL } from './failed_tests';
import type { ClientPluginsStart } from '../../../../../plugin';

export const FailedTestsCount = ({
  from,
  to,
  monitorIds,
}: {
  to: string;

  from: string;
  monitorIds: string[];
}) => {
  const {
    exploratoryView: { ExploratoryViewEmbeddable },
  } = useKibana<ClientPluginsStart>().services;

  return (
    <ExploratoryViewEmbeddable
      id="failedTestsCount"
      reportType="single-metric"
      attributes={[
        {
          time: { from, to },
          reportDefinitions: { 'monitor.id': monitorIds },
          filters: [],
          dataType: 'synthetics',
          selectedMetricField: 'monitor_failed_tests',
          name: FAILED_TESTS_LABEL,
        },
      ]}
    />
  );
};
