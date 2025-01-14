/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { CloudDefendUsage } from './types';

export const cloudDefendUsageSchema: MakeSchemaFrom<CloudDefendUsage> = {
  indices: {
    alerts: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    file: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    process: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    latestPackageVersion: { type: 'keyword' },
    packageStatus: {
      status: { type: 'keyword' },
      installedPackagePolicies: { type: 'long' },
      healthyAgents: { type: 'long' },
    },
  },
  pods_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      container_image_name: { type: 'keyword' },
      container_image_tag: { type: 'keyword' },
      pod_name: { type: 'keyword' },
      total_doc_count: { type: 'long' },
      process_doc_count: { type: 'long' },
      file_doc_count: { type: 'long' },
      alert_doc_count: { type: 'long' },
    },
  },
  accounts_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      cloud_provider: { type: 'keyword' },
      kubernetes_version: { type: 'keyword' },
      total_doc_count: { type: 'long' },
      file_doc_count: { type: 'long' },
      process_doc_count: { type: 'long' },
      alert_doc_count: { type: 'long' },
      agents_count: { type: 'short' },
      nodes_count: { type: 'short' },
      pods_count: { type: 'short' },
    },
  },
  installation_stats: {
    type: 'array',
    items: {
      package_policy_id: { type: 'keyword' },
      package_version: { type: 'keyword' },
      agent_policy_id: { type: 'keyword' },
      created_at: { type: 'date' },
      agent_count: { type: 'long' },
      policy_yaml: { type: 'keyword' },
      selectors: {
        type: 'array',
        items: {
          type: { type: 'keyword' },
          name: { type: 'keyword' },
          operation: { type: 'array', items: { type: 'keyword' } },
          containerImageFullName: { type: 'array', items: { type: 'keyword' } },
          containerImageName: { type: 'array', items: { type: 'keyword' } },
          containerImageTag: { type: 'array', items: { type: 'keyword' } },
          kubernetesClusterId: { type: 'array', items: { type: 'keyword' } },
          kubernetesClusterName: { type: 'array', items: { type: 'keyword' } },
          kubernetesNamespace: { type: 'array', items: { type: 'keyword' } },
          kubernetesPodLabel: { type: 'array', items: { type: 'keyword' } },
          kubernetesPodName: { type: 'array', items: { type: 'keyword' } },
          targetFilePath: { type: 'array', items: { type: 'keyword' } },
          ignoreVolumeFiles: { type: 'boolean' },
          ignoreVolumeMounts: { type: 'boolean' },
          processExecutable: { type: 'array', items: { type: 'keyword' } },
          processName: { type: 'array', items: { type: 'keyword' } },
          sessionLeaderInteractive: { type: 'boolean' },
        },
      },
      responses: {
        type: 'array',
        items: {
          type: { type: 'keyword' },
          match: { type: 'array', items: { type: 'keyword' } },
          exclude: { type: 'array', items: { type: 'keyword' } },
          actions: { type: 'array', items: { type: 'keyword' } },
        },
      },
    },
  },
};
