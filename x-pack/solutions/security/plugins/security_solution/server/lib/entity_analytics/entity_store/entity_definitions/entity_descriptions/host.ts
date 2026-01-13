/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect, newestValue, oldestValue } from './field_utils';
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common';

// Osquery CAASM endpoint assets index pattern
const ENDPOINT_ASSETS_OSQUERY_INDEX = 'endpoint-assets-osquery-*';

export const HOST_DEFINITION_VERSION = '1.0.0';
export const HOST_IDENTITY_FIELD = 'host.name';

const HOST_ENTITY_TYPE = 'Host';
export const hostEntityEngineDescription: EntityDescription = {
  entityType: 'host',
  version: HOST_DEFINITION_VERSION,
  identityField: HOST_IDENTITY_FIELD,
  identityFieldMapping: { type: 'keyword' },
  indexPatterns: [ENDPOINT_ASSETS_OSQUERY_INDEX],
  settings: {
    timestampField: '@timestamp',
  },
  pipeline: [
    {
      set: {
        field: 'entity.type',
        value: HOST_ENTITY_TYPE,
        override: false,
      },
    },
  ],
  fields: [
    collect({ source: 'host.domain' }),
    collect({ source: 'host.hostname' }),
    collect({ source: 'host.id' }),
    collect({
      source: 'host.os.name',
      mapping: {
        type: 'keyword',
        fields: {
          text: {
            type: 'match_only_text',
          },
        },
      },
    }),
    collect({ source: 'host.os.type' }),
    // Additional OS fields from osquery
    newestValue({ source: 'host.os.family' }),
    newestValue({ source: 'host.os.kernel' }),
    newestValue({ source: 'host.os.version' }),
    newestValue({ source: 'host.os.platform' }),
    newestValue({ source: 'host.os.build' }),
    collect({
      source: 'host.ip',
      mapping: {
        type: 'ip',
      },
    }),
    collect({ source: 'host.mac' }),
    collect({ source: 'host.type' }),
    collect({ source: 'host.architecture' }),

    // Agent information (from osquery)
    newestValue({ source: 'agent.id' }),
    newestValue({ source: 'agent.name' }),
    newestValue({ source: 'agent.type' }),
    newestValue({ source: 'agent.version' }),

    ...getCommonFieldDescriptions('host'),
    ...getEntityFieldsDescriptions('host'),

    collect({
      source: `host.entity.relationships.Communicates_with`,
      destination: 'entity.relationships.Communicates_with',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Depends_on`,
      destination: 'entity.relationships.Depends_on',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Dependent_of`,
      destination: 'entity.relationships.Dependent_of',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    collect({
      source: `host.entity.relationships.Owned_by`,
      destination: 'entity.relationships.Owned_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),
    collect({
      source: `host.entity.relationships.Accessed_frequently_by`,
      destination: 'entity.relationships.Accessed_frequently_by',
      mapping: { type: 'keyword' },
      allowAPIUpdate: true,
    }),

    // ==========================================================================
    // Endpoint Trust Intelligence Fields (from endpoint-assets-osquery-*)
    // CAASM: Cyber Asset Attack Surface Management
    // ==========================================================================

    // Entity & Asset metadata
    newestValue({ source: 'entity.sub_type' }),
    newestValue({ source: 'entity.source' }),
    newestValue({ source: 'asset.category' }),
    newestValue({ source: 'asset.platform' }),

    // Lifecycle tracking
    oldestValue({ source: 'endpoint.lifecycle.first_seen', mapping: { type: 'date' } }),
    newestValue({ source: 'endpoint.lifecycle.last_seen', mapping: { type: 'date' } }),

    // Trust/Posture scoring
    newestValue({ source: 'endpoint.posture.score', mapping: { type: 'float' } }),
    newestValue({ source: 'endpoint.posture.level' }),
    collect({ source: 'endpoint.posture.failed_checks' }),
    newestValue({ source: 'endpoint.posture.checks.total', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.posture.checks.passed', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.posture.checks.failed', mapping: { type: 'integer' } }),

    // Security controls
    newestValue({ source: 'endpoint.posture.firewall_enabled', mapping: { type: 'boolean' } }),
    newestValue({ source: 'endpoint.posture.firewall_enabled_raw' }),
    newestValue({ source: 'endpoint.posture.secure_boot', mapping: { type: 'boolean' } }),
    newestValue({ source: 'endpoint.posture.secure_boot_raw' }),
    newestValue({ source: 'endpoint.posture.disk_encryption' }),
    newestValue({ source: 'endpoint.posture.disk_encryption_raw' }),
    newestValue({ source: 'endpoint.posture.gatekeeper_enabled', mapping: { type: 'boolean' } }),
    newestValue({ source: 'endpoint.posture.gatekeeper_enabled_raw' }),
    newestValue({ source: 'endpoint.posture.sip_enabled', mapping: { type: 'boolean' } }),
    newestValue({ source: 'endpoint.posture.sip_enabled_raw' }),

    // Privileges (Unknown Knowns detection)
    newestValue({ source: 'endpoint.privileges.admin_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.privileges.ssh_keys_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.privileges.elevated_risk', mapping: { type: 'boolean' } }),
    collect({ source: 'endpoint.privileges.local_admins' }),
    collect({ source: 'endpoint.privileges.root_users' }),

    // Software inventory
    newestValue({ source: 'endpoint.software.installed_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.services_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.scheduled_tasks_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.startup_items_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.browser_extensions_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.chrome_extensions_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.launch_agents_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.launch_daemons_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.unsigned_apps_count', mapping: { type: 'integer' } }),

    // Hardware
    newestValue({ source: 'endpoint.hardware.vendor' }),
    newestValue({ source: 'endpoint.hardware.cpu' }),
    newestValue({ source: 'endpoint.hardware.model' }),
    newestValue({ source: 'endpoint.hardware.usb_removable_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.hardware.disk.total_capacity_gb', mapping: { type: 'float' } }),
    newestValue({ source: 'endpoint.hardware.disk.free_space_gb', mapping: { type: 'float' } }),

    // Network exposure
    newestValue({ source: 'endpoint.network.listening_ports_count', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.network.interfaces' }),

    // Security detections
    newestValue({
      source: 'endpoint.detections.encoded_powershell_count',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.detections.suspicious_ports_count', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.detections.hidden_temp_files_count',
      mapping: { type: 'integer' },
    }),

    // Drift tracking
    newestValue({ source: 'endpoint.drift.recently_changed', mapping: { type: 'boolean' } }),
    collect({ source: 'endpoint.drift.change_types' }),

    // Query stats
    newestValue({ source: 'endpoint.queries.total_results', mapping: { type: 'integer' } }),
  ],
};
