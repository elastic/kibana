/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { first } from 'lodash';
import { findInventoryFields, K8S_NODE_NAME } from '@kbn/metrics-data-access-plugin/common';
import type { DataSchemaFormat } from '@kbn/metrics-data-access-plugin/common';
import type { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import type { InfraSourceConfiguration } from '../../../lib/sources';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import { TIMESTAMP_FIELD } from '../../../../common/constants';

export const getPodNodeName = async (
  framework: KibanaFramework,
  requestContext: InfraPluginRequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: 'host' | 'pod' | 'container',
  timeRange: { from: number; to: number },
  schema?: DataSchemaFormat
): Promise<string | undefined> => {
  const fields = findInventoryFields(nodeType, schema);
  const nodeNameField = schema === 'semconv' ? K8S_NODE_NAME : 'kubernetes.node.name';
  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    terminate_after: 1,
    index: sourceConfiguration.metricAlias,
    body: {
      size: 1,
      _source: false,
      fields: [nodeNameField],
      sort: [{ [TIMESTAMP_FIELD]: 'desc' }],
      query: {
        bool: {
          filter: [
            { match: { [fields.id]: nodeId } },
            { exists: { field: nodeNameField } },
            {
              range: {
                [TIMESTAMP_FIELD]: {
                  gte: timeRange.from,
                  lte: timeRange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
    },
  };
  const response = await framework.callWithRequest<{ fields?: PodNodeNameFields }, {}>(
    requestContext,
    'search',
    params
  );
  const firstHit = first(response.hits.hits);
  const nodeNameValues =
    schema === 'semconv'
      ? firstHit?.fields?.[K8S_NODE_NAME]
      : firstHit?.fields?.['kubernetes.node.name'];
  const nodeName = nodeNameValues?.[0];
  return typeof nodeName === 'string' ? nodeName : undefined;
};

interface PodNodeNameFields {
  'kubernetes.node.name'?: string[];
  'k8s.node.name'?: string[];
}
