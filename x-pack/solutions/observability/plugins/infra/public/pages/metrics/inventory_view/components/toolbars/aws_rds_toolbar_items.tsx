/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { awsRDSSnapshotMetricTypes } from '@kbn/metrics-data-access-plugin/common';
import { CloudToolbarItems } from './cloud_toolbar_items';
import { MetricsAndGroupByToolbarItems } from './metrics_and_groupby_toolbar_items';
import type { ToolbarProps } from './types';

export const rdsGroupByFields = [
  'cloud.availability_zone',
  'aws.rds.db_instance.class',
  'aws.rds.db_instance.status',
];

export const AwsRDSToolbarItems = (props: ToolbarProps) => {
  return (
    <>
      <CloudToolbarItems {...props} />
      <MetricsAndGroupByToolbarItems
        {...props}
        metricTypes={awsRDSSnapshotMetricTypes}
        groupByFields={rdsGroupByFields}
      />
    </>
  );
};
