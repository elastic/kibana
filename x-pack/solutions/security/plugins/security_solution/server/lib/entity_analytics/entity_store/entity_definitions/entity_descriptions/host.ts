/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectValues as collect, newestValue, oldestValue } from './field_utils';
import type { EntityDescription } from '../types';
import { getCommonFieldDescriptions, getEntityFieldsDescriptions } from './common';

// Osquery CAASM endpoint assets index patterns
const ENDPOINT_ASSETS_OSQUERY_INDEX = 'endpoint-assets-osquery-*';
const ENDPOINT_DRIFT_STATS_INDEX = 'endpoint-drift-stats-*';

export const HOST_DEFINITION_VERSION = '1.0.0';
export const HOST_IDENTITY_FIELD = 'host.name';

const HOST_ENTITY_TYPE = 'Host';
export const hostEntityEngineDescription: EntityDescription = {
  entityType: 'host',
  version: HOST_DEFINITION_VERSION,
  identityField: HOST_IDENTITY_FIELD,
  identityFieldMapping: { type: 'keyword' },
  indexPatterns: [ENDPOINT_ASSETS_OSQUERY_INDEX, ENDPOINT_DRIFT_STATS_INDEX],
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

    // Drift detection statistics (from Drift Stats Transform)
    newestValue({ source: 'endpoint.drift.events_24h.total', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_severity.critical',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_severity.high',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_severity.medium',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.drift.events_24h.by_severity.low', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_category.privileges',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_category.persistence',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_category.network',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_category.software',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.drift.events_24h.by_category.posture',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.drift.last_event_timestamp', mapping: { type: 'date' } }),

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

    // ==========================================================================
    // Hardware Inventory (from transform: endpoint-assets-osquery-*)
    // Field names match transform output (flattened structure)
    // ==========================================================================

    // --- System Info (from osquery system_info table) ---
    newestValue({ source: 'endpoint.hardware.vendor' }),
    newestValue({ source: 'endpoint.hardware.model' }),
    newestValue({ source: 'endpoint.hardware.serial' }),
    newestValue({ source: 'endpoint.hardware.uuid' }),

    // --- CPU (from system_info) - flattened field names from transform ---
    newestValue({ source: 'endpoint.hardware.cpu' }), // CPU brand string
    newestValue({ source: 'endpoint.hardware.cpu_cores', mapping: { type: 'integer' } }), // logical cores
    newestValue({ source: 'endpoint.hardware.cpu_physical_cores', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.hardware.cpu_type' }),
    newestValue({ source: 'endpoint.hardware.cpu_sockets', mapping: { type: 'integer' } }),

    // --- Memory (from system_info + memory_devices) - flattened ---
    newestValue({ source: 'endpoint.hardware.memory_gb', mapping: { type: 'float' } }),
    newestValue({ source: 'endpoint.hardware.memory_type' }),
    newestValue({ source: 'endpoint.hardware.memory_speed' }),

    // --- Disk (from disk_info) - flattened ---
    newestValue({ source: 'endpoint.hardware.disk_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.hardware.disk_total_gb', mapping: { type: 'float' } }),

    // --- USB Devices - flattened ---
    newestValue({ source: 'endpoint.hardware.usb_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.hardware.usb_removable_count', mapping: { type: 'integer' } }),

    // --- Board/Motherboard (from system_info) - flattened ---
    newestValue({ source: 'endpoint.hardware.board_vendor' }),
    newestValue({ source: 'endpoint.hardware.board_model' }),

    // ==========================================================================
    // Network Hardware (from interface_details, interface_addresses)
    // ==========================================================================
    newestValue({ source: 'endpoint.network.listening_ports_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.network.interface_count', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.network.mac_addresses' }), // Array of MAC addresses
    collect({ source: 'endpoint.network.ip_addresses' }), // Array of IP addresses

    // ==========================================================================
    // Software Inventory Summary (full list stored in endpoint-assets-osquery-*)
    // ==========================================================================
    newestValue({ source: 'endpoint.software.installed_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.software.services_count', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.software.browsers' }), // Detected browsers
    collect({ source: 'endpoint.software.security_tools' }), // AV, EDR, etc.
    collect({ source: 'endpoint.software.remote_access' }), // TeamViewer, AnyDesk (Shadow IT)

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

    // ==========================================================================
    // Extended CAASM Inventory Fields
    // ==========================================================================

    // --- Core Identity ---
    newestValue({ source: 'endpoint.identity.uptime_days', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.identity.uptime_seconds', mapping: { type: 'long' } }),
    newestValue({ source: 'endpoint.identity.logged_in_users_count', mapping: { type: 'integer' } }),

    // --- Network Exposure Extended ---
    newestValue({
      source: 'endpoint.network.physical_interfaces_count',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.network.arp_cache_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.network.routes_count', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.network.active_connections_count',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.network.suspicious_connections_count',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.network.smb_custom_shares_count', mapping: { type: 'integer' } }),

    // --- Privilege Assessment Extended ---
    newestValue({ source: 'endpoint.privileges.root_users_count', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.privileges.sudoers_nopasswd_count',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.privileges.privileged_memberships_count',
      mapping: { type: 'integer' },
    }),

    // --- Security Controls Extended ---
    newestValue({ source: 'endpoint.controls.security_tools_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.controls.security_tool' }),
    newestValue({ source: 'endpoint.controls.last_patch_date' }),
    newestValue({ source: 'endpoint.controls.xprotect_version' }),

    // --- Persistence Detection ---
    newestValue({
      source: 'endpoint.persistence.custom_systemd_units_count',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.persistence.cron_jobs_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.persistence.cron_external_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.persistence.wmi_consumers_count', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.persistence.unusual_kernel_modules_count',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.persistence.third_party_kext_count',
      mapping: { type: 'integer' },
    }),

    // --- Unknown Knowns (Dormant Risk Detection) ---
    newestValue({
      source: 'endpoint.unknown_knowns.ssh_keys_over_180d',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.unknown_knowns.dormant_users_30d', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.unknown_knowns.dormant_users_list' }),
    newestValue({
      source: 'endpoint.unknown_knowns.external_tasks_windows',
      mapping: { type: 'integer' },
    }),
    collect({ source: 'endpoint.unknown_knowns.external_tasks_list' }),
    newestValue({
      source: 'endpoint.unknown_knowns.external_cron_jobs',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.unknown_knowns.external_launch_items',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.unknown_knowns.expiring_certs_30d', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.unknown_knowns.expired_certs', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.unknown_knowns.nonstandard_system_services',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.unknown_knowns.nonstandard_root_processes',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.unknown_knowns.dormant_admins_90d', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.unknown_knowns.dormant_admins_list' }),
    newestValue({ source: 'endpoint.unknown_knowns.old_known_hosts', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.unknown_knowns.total_dormant_risks',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.unknown_knowns.risk_level' }),

    // --- Shadow IT Detection ---
    newestValue({ source: 'endpoint.shadow_it.vpn_clients_count', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.shadow_it.vpn_types' }),
    newestValue({
      source: 'endpoint.shadow_it.remote_access_tools_count',
      mapping: { type: 'integer' },
    }),
    collect({ source: 'endpoint.shadow_it.remote_access_types' }),
    newestValue({ source: 'endpoint.shadow_it.cloud_cli_count', mapping: { type: 'integer' } }),
    collect({ source: 'endpoint.shadow_it.cloud_cli_types' }),

    // --- Container Awareness ---
    newestValue({
      source: 'endpoint.container.running_containers_count',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.container.non_production_count', mapping: { type: 'integer' } }),
    newestValue({ source: 'endpoint.container.docker_images_count', mapping: { type: 'integer' } }),

    // --- Software Supply Chain ---
    newestValue({
      source: 'endpoint.software.python_packages_count',
      mapping: { type: 'integer' },
    }),
    newestValue({ source: 'endpoint.software.npm_packages_count', mapping: { type: 'integer' } }),
    newestValue({
      source: 'endpoint.software.homebrew_packages_count',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.software.firefox_extensions_count',
      mapping: { type: 'integer' },
    }),
    newestValue({
      source: 'endpoint.software.sensitive_extensions_count',
      mapping: { type: 'integer' },
    }),
  ],
};
