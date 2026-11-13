/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Describes per-cluster Kubernetes node and namespace cattle KIs; it reads no datasets.
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { quoteEsqlString } from '../entity_rows/helpers';

const roundToTwoSignificantDigits = (value: number): number =>
  value === 0 ? 0 : Number(value.toPrecision(2));

const formatScale = (value: number, label: string): string =>
  value < 10 ? `${value} ${label}` : `about ${roundToTwoSignificantDigits(value)} ${label}`;

export const buildInfrastructureConceptDescription = ({
  concept,
  cluster,
  scale,
  breakdownField,
  members,
}: {
  concept: 'nodes' | 'namespaces';
  cluster: string;
  scale: number;
  breakdownField: 'kubernetes.node.name' | 'kubernetes.namespace';
  members: readonly string[];
}): string => {
  const label = concept === 'nodes' ? 'nodes' : 'namespaces';
  const meaning =
    concept === 'nodes'
      ? `Kubernetes nodes are the machines that run workloads in cluster ${cluster}`
      : `Kubernetes namespaces partition workloads in cluster ${cluster}`;
  const sentences = [
    `${meaning}; this source has ${formatScale(scale, label)}.`,
    `Break them down by ${breakdownField}; properties.list_query lists them live.`,
  ];

  const descriptionPrefix = `${sentences.join(' ')} Members: `;
  // The 9,800-character budget leaves room for the final omitted-member count.
  const descriptionLimit = MAX_TEXT_LENGTH - 200;
  const includedMembers: string[] = [];
  for (const member of members) {
    const nextMembers = [...includedMembers, member];
    const remaining = Math.max(0, scale - nextMembers.length);
    const suffix =
      remaining > 0 ? `, and about ${roundToTwoSignificantDigits(remaining)} more.` : '.';
    if (`${descriptionPrefix}${nextMembers.join(', ')}${suffix}`.length > descriptionLimit) {
      break;
    }
    includedMembers.push(member);
  }

  const remaining = Math.max(0, scale - includedMembers.length);
  if (includedMembers.length === 0) {
    return `${descriptionPrefix}about ${roundToTwoSignificantDigits(remaining)} more.`;
  }
  const suffix =
    remaining > 0 ? `, and about ${roundToTwoSignificantDigits(remaining)} more.` : '.';
  return `${descriptionPrefix}${includedMembers.join(', ')}${suffix}`;
};

export const buildConceptListQuery = ({
  sourceQuery,
  cluster,
  datasetCondition,
  breakdownField,
}: {
  sourceQuery: string;
  cluster: string;
  datasetCondition: string;
  breakdownField: 'kubernetes.node.name' | 'kubernetes.namespace' | 'host.name';
}): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    AND orchestrator.cluster.name == ${quoteEsqlString(cluster)}
    AND ${datasetCondition}
| STATS last_seen = MAX(@timestamp) BY ${breakdownField}
| SORT ${breakdownField}`;
