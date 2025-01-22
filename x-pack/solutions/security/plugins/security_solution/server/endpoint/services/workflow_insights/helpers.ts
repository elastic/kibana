/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { get as _get } from 'lodash';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient } from '@kbn/core/server';

import { DataStreamSpacesAdapter } from '@kbn/data-stream-adapter';

import type {
  SearchParams,
  SecurityWorkflowInsight,
} from '../../../../common/endpoint/types/workflow_insights';
import type { SupportedHostOsType } from '../../../../common/endpoint/constants';

import type { EndpointMetadataService } from '../metadata';
import {
  COMPONENT_TEMPLATE_NAME,
  DATA_STREAM_PREFIX,
  INDEX_TEMPLATE_NAME,
  INGEST_PIPELINE_NAME,
  TOTAL_FIELDS_LIMIT,
} from './constants';
import { securityWorkflowInsightsFieldMap } from './field_map_configurations';

export function createDatastream(kibanaVersion: string): DataStreamSpacesAdapter {
  const ds = new DataStreamSpacesAdapter(DATA_STREAM_PREFIX, {
    kibanaVersion,
    totalFieldsLimit: TOTAL_FIELDS_LIMIT,
  });
  ds.setComponentTemplate({
    name: COMPONENT_TEMPLATE_NAME,
    fieldMap: securityWorkflowInsightsFieldMap,
  });
  ds.setIndexTemplate({
    name: INDEX_TEMPLATE_NAME,
    componentTemplateRefs: [COMPONENT_TEMPLATE_NAME],
    template: {
      settings: {
        default_pipeline: INGEST_PIPELINE_NAME,
      },
    },
    hidden: true,
  });
  return ds;
}

export async function createPipeline(esClient: ElasticsearchClient): Promise<boolean> {
  const response = await esClient.ingest.putPipeline({
    id: INGEST_PIPELINE_NAME,
    processors: [
      // requires @elastic/elasticsearch 8.16.0
      // {
      //   fingerprint: {
      //     fields: ['type', 'category', 'value', 'target.type', 'target.id'],
      //     target_field: '_id',
      //     method: 'SHA-256',
      //     if: 'ctx._id == null',
      //   },
      // },
    ],
    _meta: {
      managed: true,
    },
  });
  return response.acknowledged;
}

const validKeys = new Set([
  'ids',
  'categories',
  'types',
  'sourceTypes',
  'sourceIds',
  'targetTypes',
  'targetIds',
  'actionTypes',
]);

const paramFieldMap = {
  ids: '_id',
  sourceTypes: 'source.type',
  sourceIds: 'source.id',
  targetTypes: 'target.type',
  targetIds: 'target.ids',
  actionTypes: 'action.type',
};
const nestedKeys = new Set(['source', 'target', 'action']);
export function buildEsQueryParams(searchParams: SearchParams): QueryDslQueryContainer[] {
  return Object.entries(searchParams).reduce((acc: object[], [k, v]) => {
    if (!validKeys.has(k)) {
      return acc;
    }

    const paramKey = _get(paramFieldMap, k, k);

    const topKey = paramKey.split('.')[0];
    if (nestedKeys.has(topKey)) {
      const nestedQuery = {
        nested: {
          path: topKey,
          query: {
            terms: { [paramKey]: v },
          },
        },
      };
      return [...acc, nestedQuery];
    }

    const next = { terms: { [paramKey]: v } };
    return [...acc, next];
  }, []);
}

export async function groupEndpointIdsByOS(
  endpointIds: string[],
  endpointMetadataService: EndpointMetadataService
): Promise<Record<SupportedHostOsType, string[]>> {
  const metadata = await endpointMetadataService.getMetadataForEndpoints(endpointIds);
  return metadata.reduce<Record<string, string[]>>((acc, m) => {
    const os = m.host.os.name.toLowerCase() as SupportedHostOsType;
    if (!acc[os]) {
      acc[os] = [];
    }

    acc[os].push(m.agent.id);

    return acc;
  }, {});
}

export function generateInsightId(insight: SecurityWorkflowInsight): string {
  const { type, category, value, target } = insight;
  const targetType = target.type;
  const targetIds = target.ids.join(',');

  const hash = createHash('sha256');
  hash.update(type);
  hash.update(category);
  hash.update(value);
  hash.update(targetType);
  hash.update(targetIds);

  return hash.digest('hex');
}

export function getUniqueInsights(insights: SecurityWorkflowInsight[]): SecurityWorkflowInsight[] {
  const uniqueInsights: { [key: string]: SecurityWorkflowInsight } = {};
  for (const insight of insights) {
    const id = generateInsightId(insight);
    if (!uniqueInsights[id]) {
      uniqueInsights[id] = insight;
    }
  }
  return Object.values(uniqueInsights);
}
