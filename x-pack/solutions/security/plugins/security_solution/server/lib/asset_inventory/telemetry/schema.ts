/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { AssetInventoryUsage } from './type';

export const assetInventoryUsageSchema: MakeSchemaFrom<AssetInventoryUsage> = {
  entities: {
    doc_count: {
      type: 'long',
    },
    last_doc_timestamp: {
      type: 'date',
    },
  },
  entities_type_stats: {
    type: 'array',
    items: {
      entity_type: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  entity_store_stats: {
    type: 'array',
    items: {
      entity_store: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  entity_source_stats: {
    type: 'array',
    items: {
      entity_source: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  asset_criticality_stats: {
    type: 'array',
    items: {
      criticality: { type: 'keyword' },
      doc_count: { type: 'long' },
      last_doc_timestamp: { type: 'date' },
    },
  },
  asset_inventory_cloud_connector_usage_stats: {
    type: 'array',
    items: {
      id: {
        type: 'keyword',
        _meta: { description: 'Cloud connector ID' },
      },
      created_at: {
        type: 'date',
        _meta: { description: 'Cloud connector created at timestamp' },
      },
      updated_at: {
        type: 'date',
        _meta: { description: 'Cloud connector updated at timestamp' },
      },
      hasCredentials: {
        type: 'boolean',
        _meta: { description: 'Whether the cloud connector has valid credentials' },
      },
      cloud_provider: {
        type: 'keyword',
        _meta: { description: 'Cloud provider (aws, azure, gcp)' },
      },
      account_type: {
        type: 'keyword',
        _meta: { description: 'Account type: single or organization' },
      },
      packagePolicyIds: {
        type: 'array',
        items: {
          type: 'keyword',
          _meta: { description: 'Package policy ID using this cloud connector' },
        },
      },
      packagePolicyCount: {
        type: 'long',
        _meta: { description: 'Number of package policies using this cloud connector' },
      },
    },
  },
  asset_inventory_installation_stats: {
    type: 'array',
    items: {
      package_policy_id: {
        type: 'keyword',
        _meta: { description: 'Package policy ID' },
      },
      package_name: {
        type: 'keyword',
        _meta: { description: 'Package name' },
      },
      package_version: {
        type: 'keyword',
        _meta: { description: 'Package version' },
      },
      created_at: {
        type: 'date',
        _meta: { description: 'Package policy created at timestamp' },
      },
      agent_policy_id: {
        type: 'keyword',
        _meta: { description: 'Agent policy ID' },
      },
      agent_count: {
        type: 'long',
        _meta: { description: 'Number of agents associated with the agent policy' },
      },
      is_agentless: {
        type: 'boolean',
        _meta: { description: 'Whether the deployment is agentless' },
      },
      supports_cloud_connector: {
        type: 'boolean',
        _meta: { description: 'Whether the package policy supports cloud connector' },
      },
      cloud_connector_id: {
        type: 'keyword',
        _meta: { description: 'Cloud connector ID associated with the package policy' },
      },
    },
  },
};
