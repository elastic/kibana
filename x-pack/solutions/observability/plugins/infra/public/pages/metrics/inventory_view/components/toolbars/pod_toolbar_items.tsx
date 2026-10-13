/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import {
  K8S_DEPLOYMENT_NAME,
  K8S_NAMESPACE_NAME,
  K8S_NODE_NAME,
} from '@kbn/metrics-data-access-plugin/common';
import { DEFAULT_SCHEMA } from '../../../../../../common/constants';
import { useIsPodSchemaSelectorEnabled } from '../../../../../hooks/use_is_pod_schema_selector_enabled';
import { MetricsAndGroupByToolbarItems } from './metrics_and_groupby_toolbar_items';
import type { ToolbarProps } from './types';

export const ecsPodGroupByFields = ['kubernetes.namespace', 'kubernetes.node.name', 'service.type'];

/** ECS group-by list. Kept under the original export name. */
export const podGroupByFields = ecsPodGroupByFields;

export const semconvPodGroupByFields = [K8S_NAMESPACE_NAME, K8S_NODE_NAME, K8S_DEPLOYMENT_NAME];

/**
 * Group-by fields for the pod inventory toolbar.
 * Uses the same request schema as the snapshot (`preferredSchema ?? DEFAULT_SCHEMA`).
 */
export const podGroupByFieldsForSchema = (
  preferredSchema: DataSchemaFormat | null | undefined,
  isPodSchemaSelectorEnabled: boolean
): string[] => {
  const requestSchema = preferredSchema ?? DEFAULT_SCHEMA;
  return isPodSchemaSelectorEnabled && requestSchema === 'semconv'
    ? semconvPodGroupByFields
    : ecsPodGroupByFields;
};

export const PodToolbarItems = (props: ToolbarProps) => {
  const isPodSchemaSelectorEnabled = useIsPodSchemaSelectorEnabled();
  const groupByFields = podGroupByFieldsForSchema(
    props.preferredSchema,
    isPodSchemaSelectorEnabled
  );

  return (
    <MetricsAndGroupByToolbarItems
      {...props}
      groupByFields={groupByFields}
      allowSchemaSelection={isPodSchemaSelectorEnabled}
    />
  );
};
