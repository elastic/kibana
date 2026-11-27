/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Describes metrics type KIs; it reads no datasets.
export type InfrastructureConcept =
  | 'deployments'
  | 'statefulsets'
  | 'daemonsets'
  | 'cronjobs'
  | 'nodes'
  | 'namespaces'
  | 'hosts'
  | 'services';

const CONCEPT_MEANINGS: Record<InfrastructureConcept, string> = {
  deployments: 'Kubernetes deployments',
  statefulsets: 'Kubernetes statefulsets',
  daemonsets: 'Kubernetes daemonsets',
  cronjobs: 'Kubernetes cronjobs',
  nodes: 'Kubernetes nodes are the machines that run workloads',
  namespaces: 'Kubernetes namespaces partition workloads',
  hosts: 'Hosts',
  services: 'Services',
};

// A source without cluster metadata has no clusters to mention.
const formatClusters = (clusterCount: number | undefined): string =>
  clusterCount ? ` across ${clusterCount} ${clusterCount === 1 ? 'cluster' : 'clusters'}` : '';

/** One line count summary shared by the description and the evidence. */
export const buildConceptCountLine = ({
  concept,
  memberCount,
  clusterCount,
}: {
  concept: InfrastructureConcept;
  memberCount: number;
  clusterCount?: number;
}): string => `${memberCount} ${concept} seen in the last hour${formatClusters(clusterCount)}`;

export const buildInfrastructureConceptDescription = ({
  concept,
  memberCount,
  clusterCount,
  breakdownFields,
}: {
  concept: InfrastructureConcept;
  memberCount: number;
  clusterCount?: number;
  breakdownFields: readonly string[];
}): string =>
  [
    `${CONCEPT_MEANINGS[concept]}; this source has ${buildConceptCountLine({
      concept,
      memberCount,
      clusterCount,
    })}.`,
    `Break them down by ${breakdownFields.join(' and ')}; properties.list_query lists them live.`,
  ].join(' ');

export const buildConceptListQuery = ({
  sourceQuery,
  datasetCondition,
  additionalPipeline,
  breakdownFields,
}: {
  sourceQuery: string;
  datasetCondition: string;
  additionalPipeline?: string;
  breakdownFields: readonly string[];
}): string => {
  const extraPipeline = additionalPipeline ? `\n${additionalPipeline}` : '';
  return `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND ${datasetCondition}${extraPipeline}
| STATS last_seen = MAX(@timestamp) BY ${breakdownFields.join(', ')}
| SORT ${breakdownFields.join(', ')}`;
};
