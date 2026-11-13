/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Finds one standalone-host type KI per source; Kubernetes node hosts enrich the node type KI.
import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import { stringsOf } from './entity_rows/helpers';
import {
  createDroppedRows,
  droppedRowsCount,
  ENTITY_QUERY_LIMIT,
  type EntityFoldContext,
  type EntityFoldResult,
  type EsqlRow,
} from './entity_rows/types';
import {
  buildConceptListQuery,
  buildInfrastructureConceptDescription,
} from './kubernetes/concepts';
import { KUBERNETES_ENTITY_STORE_TYPES } from './kubernetes/ids';

const HOST_DATASET_CONDITION =
  '(STARTS_WITH(data_stream.dataset, "system.") OR data_stream.dataset == "hostmetricsreceiver.otel")';
const HOST_NODE_NAME_EVAL = '| EVAL node_name = COALESCE(kubernetes.node.name, k8s.node.name)';

export const buildHostQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND ${HOST_DATASET_CONDITION}
    AND host.name IS NOT NULL
${HOST_NODE_NAME_EVAL}
| EVAL entity_type = CASE(node_name IS NULL, "host", "node"),
       concept_cluster = CASE(node_name IS NULL, "", orchestrator.cluster.name),
       member = COALESCE(node_name, host.name)
| STATS docs = COUNT(*), last_seen = MAX(@timestamp), os = VALUES(host.os.name),
        cloud_provider = VALUES(cloud.provider)
  BY entity_type, concept_cluster, member
| STATS scale = COUNT(*), activity = SUM(docs), last_seen = MAX(last_seen),
        members = TOP(member, 50, "asc"), os = VALUES(os),
        cloud_provider = VALUES(cloud_provider)
  BY entity_type, concept_cluster
| SORT activity DESC
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const foldHostRows = (
  rows: EsqlRow[],
  { sourceQuery, sourceId }: EntityFoldContext
): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  const features: FeatureUpsert[] = [];
  for (const row of rows) {
    const entityType = row.entity_type;
    const members = stringsOf(row.members).slice(0, 50);
    const scale = typeof row.scale === 'number' ? row.scale : 0;
    if (entityType === 'host') {
      const id = `hosts:${sourceId}`;
      const title = 'Hosts';
      if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
        droppedRows.idTooLong += 1;
        continue;
      }
      features.push({
        type: 'infrastructure',
        subtype: 'host',
        id,
        title,
        description: buildInfrastructureConceptDescription({
          concept: 'hosts',
          scope: sourceId,
          scale,
          breakdownFields: ['host.name'],
          members,
        }),
        filter: { field: 'host.name', exists: true },
        properties: {
          breakdown: ['host.name'],
          entity_store_type: 'host',
          scale,
          members,
          list_query: buildConceptListQuery({
            sourceQuery,
            datasetCondition: HOST_DATASET_CONDITION,
            additionalPipeline: `${HOST_NODE_NAME_EVAL}
| WHERE node_name IS NULL AND host.name IS NOT NULL`,
            breakdownFields: ['host.name'],
          }),
          host_summary: {
            os: stringsOf(row.os),
            cloud_provider: stringsOf(row.cloud_provider),
          },
          origin: 'metrics',
          key_row: 'metrics.hosts',
        },
        confidence: 100,
      });
      continue;
    }
    if (entityType !== 'node') {
      continue;
    }
    const cluster = row.concept_cluster;
    if (typeof cluster !== 'string' || cluster.length === 0) {
      droppedRows.nullCluster += 1;
      continue;
    }
    const id = `k8s.nodes:${cluster}`;
    const title = `Kubernetes nodes of ${cluster}`;
    if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      continue;
    }
    features.push({
      type: 'infrastructure',
      subtype: KUBERNETES_ENTITY_STORE_TYPES.node,
      id,
      title,
      description: buildInfrastructureConceptDescription({
        concept: 'nodes',
        scope: cluster,
        scale,
        breakdownFields: ['kubernetes.node.name'],
        members,
      }),
      filter: { field: 'orchestrator.cluster.name', eq: cluster },
      properties: {
        breakdown: ['kubernetes.node.name'],
        entity_store_type: KUBERNETES_ENTITY_STORE_TYPES.node,
        scale,
        members,
        list_query: buildConceptListQuery({
          sourceQuery,
          cluster,
          datasetCondition: HOST_DATASET_CONDITION,
          additionalPipeline: `${HOST_NODE_NAME_EVAL}
| WHERE node_name IS NOT NULL
| EVAL \`kubernetes.node.name\` = node_name`,
          breakdownFields: ['kubernetes.node.name'],
        }),
        host_summary: {
          os: stringsOf(row.os),
          cloud_provider: stringsOf(row.cloud_provider),
        },
        origin: 'metrics',
        key_row: 'metrics.hosts',
      },
      confidence: 100,
    });
  }

  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
  };
};

const stringArrayOf = (value: FeatureUpsert['properties'][string]): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const hostSummaryOf = (
  feature: FeatureUpsert
): { os: readonly string[]; cloud_provider: readonly string[] } => {
  const summary = feature.properties.host_summary;
  if (typeof summary !== 'object' || summary === null || Array.isArray(summary)) {
    return { os: [], cloud_provider: [] };
  }
  return {
    os: stringArrayOf('os' in summary ? summary.os : undefined),
    cloud_provider: stringArrayOf('cloud_provider' in summary ? summary.cloud_provider : undefined),
  };
};

const mergeValues = (left: readonly string[], right: readonly string[]): string[] =>
  [...new Set([...left, ...right])].sort();

export const mergeHostFeatures = (features: FeatureUpsert[]): FeatureUpsert[] => {
  const featuresById = new Map<string, FeatureUpsert>();
  for (const feature of features) {
    const current = featuresById.get(feature.id);
    if (!current) {
      featuresById.set(feature.id, feature);
      continue;
    }
    if (
      current.subtype === KUBERNETES_ENTITY_STORE_TYPES.node &&
      feature.subtype === KUBERNETES_ENTITY_STORE_TYPES.node
    ) {
      const currentIsConcept = current.properties.key_row === 'ecs.k8s_nodes';
      const conceptFeature =
        currentIsConcept || feature.properties.key_row !== 'ecs.k8s_nodes' ? current : feature;
      const currentSummary = hostSummaryOf(current);
      const featureSummary = hostSummaryOf(feature);
      featuresById.set(feature.id, {
        ...conceptFeature,
        properties: {
          ...conceptFeature.properties,
          host_summary: {
            os: mergeValues(currentSummary.os, featureSummary.os),
            cloud_provider: mergeValues(
              currentSummary.cloud_provider,
              featureSummary.cloud_provider
            ),
          },
        },
      });
    }
  }
  return [...featuresById.values()];
};
