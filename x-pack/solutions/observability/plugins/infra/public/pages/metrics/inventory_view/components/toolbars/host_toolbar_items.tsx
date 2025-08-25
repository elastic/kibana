/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MetricsAndGroupByToolbarItems } from './metrics_and_groupby_toolbar_items';
import type { ToolbarProps } from './types';

export const ecsHostGroupByFields = [
  'cloud.availability_zone',
  'cloud.machine.type',
  'cloud.project.id',
  'cloud.provider',
  'service.type',
];

const semconvHostGroupByFields = [
  'os.name',
  'os.version',
  'os.type',
  'host.type',
  'host.arch',
  'host.image.id',
  'host.image.name',
  'host.image.version',
  'cloud.account_id',
  'cloud.platform',
  'cloud.provider',
  'cloud.availability_zone',
  'cloud.region',
];

export const HostToolbarItems = (props: ToolbarProps) => {
  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      groupByFields={
        props.preferredSchema === 'semconv' ? semconvHostGroupByFields : ecsHostGroupByFields
      }
      allowSchemaSelection
    />
  );
};
