/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ID_LENGTH,
  MAX_TITLE_LENGTH,
  type FeatureUpsert,
} from '@kbn/significant-events-schema';
import { clustersOf, lastSeenOf, stringsOf, UNKNOWN_CLUSTER } from './entity_rows/helpers';
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

// Finds standalone host pets in system and OTel hostmetrics data; node hosts enrich cluster cattle.
export const buildSystemHostQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour AND STARTS_WITH(data_stream.dataset, "system.")
| STATS last_seen = MAX(@timestamp), os = VALUES(host.os.name),
        cloud_provider = VALUES(cloud.provider), cloud_instance = VALUES(cloud.instance.id),
        clusters = VALUES(orchestrator.cluster.name)
  BY host.name, kubernetes.node.name
| SORT last_seen DESC, host.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

export const buildOtelHostQuery = (sourceQuery: string): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND data_stream.dataset == "hostmetricsreceiver.otel"
| STATS last_seen = MAX(@timestamp), os = VALUES(host.os.name),
        cloud_provider = VALUES(cloud.provider), cloud_instance = VALUES(cloud.instance.id),
        clusters = VALUES(orchestrator.cluster.name)
  BY host.name, k8s.node.name
| SORT last_seen DESC, host.name
| LIMIT ${ENTITY_QUERY_LIMIT}`;

const foldHostRows = ({
  rows,
  nodeField,
  keyRow,
  sourceQuery,
  datasetCondition,
}: {
  rows: EsqlRow[];
  nodeField: 'kubernetes.node.name' | 'k8s.node.name';
  keyRow: 'ecs.host' | 'otel.host';
  sourceQuery: string;
  datasetCondition: string;
}): EntityFoldResult => {
  const droppedRows = createDroppedRows();
  let unknownClusterRows = 0;
  const nodeHostsByCluster = new Map<
    string,
    {
      members: Set<string>;
      os: Set<string>;
      cloudProviders: Set<string>;
    }
  >();
  const features = rows.flatMap((row): FeatureUpsert[] => {
    const hostName = row['host.name'];
    if (typeof hostName !== 'string') {
      return [];
    }
    const nodeName = row[nodeField];
    const host = {
      os: stringsOf(row.os),
      cloud_provider: stringsOf(row.cloud_provider),
      cloud_instance: stringsOf(row.cloud_instance),
    };
    // Standalone hosts are pets; hosts with node names join the per-cluster nodes cattle KI.
    if (typeof nodeName === 'string') {
      const clusters = clustersOf(row.clusters);
      if (clusters.includes(UNKNOWN_CLUSTER)) {
        droppedRows.nullCluster += 1;
        return [];
      }
      for (const cluster of clusters) {
        const concept = nodeHostsByCluster.get(cluster) ?? {
          members: new Set<string>(),
          os: new Set<string>(),
          cloudProviders: new Set<string>(),
        };
        concept.members.add(nodeName);
        host.os.forEach((value) => concept.os.add(value));
        host.cloud_provider.forEach((value) => concept.cloudProviders.add(value));
        nodeHostsByCluster.set(cluster, concept);
      }
      return [];
    }
    const id = `host:${hostName}`;
    if (id.length > MAX_ID_LENGTH || hostName.length > MAX_TITLE_LENGTH) {
      droppedRows.idTooLong += 1;
      return [];
    }
    const clusters = clustersOf(row.clusters);
    if (clusters.includes(UNKNOWN_CLUSTER)) {
      unknownClusterRows += 1;
    }
    return [
      {
        type: 'entity',
        subtype: 'host',
        id,
        title: hostName,
        description: `Host ${hostName}.`,
        filter: { field: 'host.name', eq: hostName },
        properties: {
          name: hostName,
          identity: { 'host.name': hostName },
          breakdown: ['orchestrator.cluster.name'],
          entity_store_type: 'host',
          clusters,
          host,
          last_seen: lastSeenOf(row),
          origin: 'metrics',
          key_row: keyRow,
        },
        confidence: 100,
      },
    ];
  });
  features.push(
    ...[...nodeHostsByCluster].flatMap(([cluster, concept]): FeatureUpsert[] => {
      const id = `k8s.nodes:${cluster}`;
      const title = `Kubernetes nodes of ${cluster}`;
      if (id.length > MAX_ID_LENGTH || title.length > MAX_TITLE_LENGTH) {
        droppedRows.idTooLong += 1;
        return [];
      }
      const allMembers = [...concept.members].sort();
      // The description lists at most 50 members before directing readers to the live query.
      const members = allMembers.slice(0, 50);
      return [
        {
          type: 'infrastructure',
          subtype: 'k8s_nodes',
          id,
          title,
          description: buildInfrastructureConceptDescription({
            concept: 'nodes',
            cluster,
            scale: allMembers.length,
            breakdownField: 'kubernetes.node.name',
            members,
          }),
          filter: { field: 'orchestrator.cluster.name', eq: cluster },
          properties: {
            breakdown: ['kubernetes.node.name'],
            scale: allMembers.length,
            members,
            list_query: buildConceptListQuery({
              sourceQuery,
              cluster,
              datasetCondition,
              breakdownField: 'host.name',
            }),
            host_summary: {
              os: [...concept.os].sort(),
              cloud_provider: [...concept.cloudProviders].sort(),
            },
            origin: 'metrics',
            key_row: keyRow,
          },
          confidence: 100,
        },
      ];
    })
  );
  return {
    features,
    droppedIncompleteRowsCount: droppedRowsCount(droppedRows),
    droppedRows,
    unknownClusterRows,
  };
};

export const foldSystemHostRows = (
  rows: EsqlRow[],
  { sourceQuery }: EntityFoldContext
): EntityFoldResult =>
  foldHostRows({
    rows,
    nodeField: 'kubernetes.node.name',
    keyRow: 'ecs.host',
    sourceQuery,
    datasetCondition: 'STARTS_WITH(data_stream.dataset, "system.")',
  });

export const foldOtelHostRows = (
  rows: EsqlRow[],
  { sourceQuery }: EntityFoldContext
): EntityFoldResult =>
  foldHostRows({
    rows,
    nodeField: 'k8s.node.name',
    keyRow: 'otel.host',
    sourceQuery,
    datasetCondition: 'data_stream.dataset == "hostmetricsreceiver.otel"',
  });

const featureLastSeen = (feature: FeatureUpsert): string =>
  typeof feature.properties.last_seen === 'string' ? feature.properties.last_seen : '';

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
    if (current.subtype === 'k8s_nodes' && feature.subtype === 'k8s_nodes') {
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
      continue;
    }
    if (featureLastSeen(feature) > featureLastSeen(current)) {
      featuresById.set(feature.id, feature);
    }
  }
  return [...featuresById.values()];
};
