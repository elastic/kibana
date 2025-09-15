/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { set } from '@kbn/safer-lodash-set';
import { startsWith, merge } from 'lodash';
import { findInventoryFields } from '@kbn/metrics-data-access-plugin/common';
import type { DataSchemaFormat, InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import type { InfraPluginRequestHandlerContext } from '../../../types';
import type { KibanaFramework } from '../../../lib/adapters/framework/kibana_framework_adapter';
import type { InfraSourceConfiguration } from '../../../lib/sources';
import type { InfraMetadataInfo } from '../../../../common/http_api/metadata_api';
import { getPodNodeName } from './get_pod_node_name';
import {
  unflattenMetadataFromSource,
  unflattenMetadataInfoFields,
} from './unflatten_metadata_info_fileds';
import { CLOUD_METRICS_MODULES } from '../../../lib/constants';
import { TIMESTAMP_FIELD } from '../../../../common/constants';

export const getNodeInfo = async (
  framework: KibanaFramework,
  requestContext: InfraPluginRequestHandlerContext,
  sourceConfiguration: InfraSourceConfiguration,
  nodeId: string,
  nodeType: InventoryItemType,
  timeRange: { from: number; to: number },
  schema: DataSchemaFormat
): Promise<InfraMetadataInfo> => {
  // If the nodeType is a Kubernetes pod then we need to get the node info
  // from a host record instead of a pod. This is due to the fact that any host
  // can report pod details and we can't rely on the host/cloud information associated
  // with the kubernetes.pod.uid. We need to first lookup the `kubernetes.node.name`
  // then use that to lookup the host's node information.
  if (nodeType === 'pod') {
    const kubernetesNodeName = await getPodNodeName(
      framework,
      requestContext,
      sourceConfiguration,
      nodeId,
      nodeType,
      timeRange
    );
    if (kubernetesNodeName) {
      return getNodeInfo(
        framework,
        requestContext,
        sourceConfiguration,
        kubernetesNodeName,
        'host',
        timeRange,
        schema
      );
    }
    return {};
  }
  const isSemconvSchema = schema === 'semconv';

  const getField = (field: string) =>
    isSemconvSchema
      ? { docvalue_fields: [field] }
      : {
          _source: {
            includes: [field],
          },
        };
  const fields = findInventoryFields(nodeType);
  const params = {
    allow_no_indices: true,
    ignore_unavailable: true,
    index: sourceConfiguration.metricAlias,
    body: {
      size: 1,
      fields: [TIMESTAMP_FIELD],
      sort: [{ [TIMESTAMP_FIELD]: 'desc' }],
      query: {
        bool: {
          filter: [
            { match: { [fields.id]: nodeId } },
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
      aggs: {
        hostMetadata: {
          filter: {
            exists: { field: 'host.name' },
          },
          aggs: {
            latest: {
              top_hits: {
                ...getField('host.*'),
                size: 10,
                sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
              },
            },
          },
        },
        cloudMetadata: {
          filter: {
            exists: { field: 'cloud.provider' },
          },
          aggs: {
            latest: {
              top_hits: {
                ...getField('cloud.*'),
                size: 10,
                sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
              },
            },
          },
        },
        agentMetadata: {
          filter: {
            exists: { field: 'agent.name' },
          },
          aggs: {
            latest: {
              top_hits: {
                ...getField('agent.*'),
                size: 10,
                sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
              },
            },
          },
        },
        containerMetadata: {
          filter: {
            exists: { field: 'container.id' },
          },
          aggs: {
            latest: {
              top_hits: {
                ...getField('container.*'),
                size: 10,
                sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
              },
            },
          },
        },
        ...(isSemconvSchema
          ? {
              resourceOsMetadata: {
                filter: {
                  exists: { field: 'resource.attributes.os.type' },
                },
                aggs: {
                  latest: {
                    top_hits: {
                      docvalue_fields: ['resource.attributes.os.*'],
                      size: 10,
                      sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
                    },
                  },
                },
              },
              resourceHostMetadata: {
                filter: {
                  exists: { field: 'resource.attributes.host.name' },
                },
                aggs: {
                  latest: {
                    top_hits: {
                      docvalue_fields: ['resource.attributes.host.*'],
                      size: 10,
                      sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
                    },
                  },
                },
              },
              resourceAgentMetadata: {
                filter: {
                  exists: { field: 'resource.attributes.agent.name' },
                },
                aggs: {
                  latest: {
                    top_hits: {
                      docvalue_fields: ['resource.attributes.agent.*'],
                      size: 10,
                      sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
                    },
                  },
                },
              },
              resourceCloudMetadata: {
                filter: {
                  exists: { field: 'resource.attributes.cloud.provider' },
                },
                aggs: {
                  latest: {
                    top_hits: {
                      docvalue_fields: ['resource.attributes.cloud.*'],
                      size: 10,
                      sort: [{ [TIMESTAMP_FIELD]: { order: 'desc' } }],
                    },
                  },
                },
              },
            }
          : {}),
      },
    },
  };
  if (!CLOUD_METRICS_MODULES.some((m) => startsWith(nodeType, m))) {
    set(
      params,
      'body.query.bool.must_not',
      CLOUD_METRICS_MODULES.map((module) => ({ match: { 'event.module': module } }))
    );
  }
  const response = await framework.callWithRequest<
    {},
    {
      aggregations: {
        hostMetadata: any;
        cloudMetadata: any;
        agentMetadata: any;
        containerMetadata: any;
        resourceOsMetadata: any;
        resourceHostMetadata: any;
        resourceAgentMetadata: any;
        resourceCloudMetadata: any;
      };
    }
  >(requestContext, 'search', params);

  const unflattenedFields: Record<string, any> = {};
  const firstHit = response.hits.hits[0];
  unflattenMetadataInfoFields(unflattenedFields, firstHit);

  const extractAndMergeFieldsFromAggregation = (aggregation: any) => {
    const hits = aggregation?.latest?.hits?.hits || [];
    const mergedFields: Record<string, any> = {};

    hits.forEach((hit: any) => {
      if (hit?.fields) {
        unflattenMetadataInfoFields(mergedFields, hit);
      }

      if (hit?._source && !isSemconvSchema) {
        const hitFields: Record<string, any> = {};
        unflattenMetadataFromSource(hitFields, hit._source);

        Object.keys(hitFields).forEach((key) => {
          if (mergedFields[key] === undefined) {
            mergedFields[key] = hitFields[key];
          }
        });
      }
    });

    return mergedFields;
  };

  if (response.aggregations) {
    const {
      hostMetadata,
      cloudMetadata,
      agentMetadata,
      containerMetadata,
      resourceOsMetadata,
      resourceHostMetadata,
      resourceAgentMetadata,
      resourceCloudMetadata,
    } = response.aggregations;

    const hostFields = extractAndMergeFieldsFromAggregation(hostMetadata);
    const cloudFields = extractAndMergeFieldsFromAggregation(cloudMetadata);
    const agentFields = extractAndMergeFieldsFromAggregation(agentMetadata);
    const containerFields = extractAndMergeFieldsFromAggregation(containerMetadata);
    const resourceOsFields = extractAndMergeFieldsFromAggregation(resourceOsMetadata);
    const resourceHostFields = extractAndMergeFieldsFromAggregation(resourceHostMetadata);
    const resourceAgentFields = extractAndMergeFieldsFromAggregation(resourceAgentMetadata);
    const resourceCloudFields = extractAndMergeFieldsFromAggregation(resourceCloudMetadata);

    merge(
      unflattenedFields,
      hostFields,
      cloudFields,
      agentFields,
      containerFields,
      resourceOsFields,
      resourceHostFields,
      resourceAgentFields,
      resourceCloudFields
    );

    return unflattenedFields;
  }

  return {};
};
