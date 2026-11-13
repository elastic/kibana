/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Describes metrics type KIs; it reads no datasets.
import { MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { quoteEsqlString } from '../entity_rows/helpers';

export type InfrastructureConcept =
  | 'deployments'
  | 'statefulsets'
  | 'daemonsets'
  | 'cronjobs'
  | 'nodes'
  | 'namespaces'
  | 'hosts'
  | 'services';

export const buildInfrastructureConceptDescription = ({
  concept,
  scope,
  scale,
  breakdownFields,
  members,
}: {
  concept: InfrastructureConcept;
  scope: string;
  scale: number;
  breakdownFields: readonly string[];
  members: readonly string[];
}): string => {
  const meaning = (() => {
    switch (concept) {
      case 'nodes':
        return `Kubernetes nodes are the machines that run workloads in cluster ${scope}`;
      case 'namespaces':
        return `Kubernetes namespaces partition workloads in cluster ${scope}`;
      case 'hosts':
        return `Hosts outside Kubernetes in source ${scope}`;
      case 'services':
        return `Services in source ${scope}`;
      default:
        return `Kubernetes ${concept} in cluster ${scope}`;
    }
  })();
  const sentences = [
    `${meaning}; this source has ${scale} ${concept}.`,
    `Break them down by ${breakdownFields.join(' and ')}; properties.list_query lists them live.`,
  ];

  const descriptionPrefix = `${sentences.join(' ')} Members: `;
  // The 9,800-character budget leaves room for the final omitted-member count.
  const descriptionLimit = MAX_TEXT_LENGTH - 200;
  const includedMembers: string[] = [];
  for (const member of members) {
    const nextMembers = [...includedMembers, member];
    const remaining = Math.max(0, scale - nextMembers.length);
    const suffix = remaining > 0 ? `, and ${remaining} more.` : '.';
    if (`${descriptionPrefix}${nextMembers.join(', ')}${suffix}`.length > descriptionLimit) {
      break;
    }
    includedMembers.push(member);
  }

  const remaining = Math.max(0, scale - includedMembers.length);
  if (includedMembers.length === 0) {
    return `${descriptionPrefix}${remaining} more.`;
  }
  const suffix = remaining > 0 ? `, and ${remaining} more.` : '.';
  return `${descriptionPrefix}${includedMembers.join(', ')}${suffix}`;
};

export const buildConceptListQuery = ({
  sourceQuery,
  cluster,
  datasetCondition,
  additionalPipeline = '',
  breakdownFields,
}: {
  sourceQuery: string;
  cluster?: string;
  datasetCondition: string;
  additionalPipeline?: string;
  breakdownFields: readonly string[];
}): string => `${sourceQuery}
| WHERE @timestamp > NOW() - 1 hour
    ${
      cluster ? `AND orchestrator.cluster.name == ${quoteEsqlString(cluster)}\n    ` : ''
    }AND ${datasetCondition}
${additionalPipeline}
| STATS last_seen = MAX(@timestamp) BY ${breakdownFields.join(', ')}
| SORT ${breakdownFields.join(', ')}`;
