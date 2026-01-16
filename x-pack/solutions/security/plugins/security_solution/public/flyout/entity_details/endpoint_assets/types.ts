/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutPanelProps } from '@kbn/expandable-flyout';

/**
 * Host details data structure from Entity Store
 * Matches the structure in host_details_page.tsx
 */
export interface HostDetailsData {
  '@timestamp': string;
  entity: {
    id: string;
    name: string;
    source: string;
  };
  host?: {
    id?: string;
    name?: string;
    hostname?: string;
    ip?: string | string[];
    mac?: string | string[];
    os?: {
      name?: string;
      platform?: string;
      version?: string;
      type?: string;
      family?: string;
      build?: string;
      kernel?: string;
    };
    architecture?: string;
  };
  agent?: {
    id?: string;
    name?: string;
    version?: string;
  };
  endpoint?: {
    hardware?: {
      vendor?: string;
      model?: string;
      serial?: string;
      uuid?: string;
      cpu?: string;
      cpu_cores?: string | number;
      cpu_physical_cores?: string | number;
      cpu_type?: string;
      cpu_sockets?: string | number;
      memory_gb?: string | number;
      memory_type?: string;
      memory_speed?: string;
      disk_count?: string | number;
      disk_total_gb?: string | number;
      usb_count?: string | number;
      usb_removable_count?: string | number;
      board_vendor?: string;
      board_model?: string;
    };
    network?: {
      listening_ports_count?: string | number;
      interface_count?: string | number;
      mac_addresses?: string[];
      ip_addresses?: string[];
    };
    software?: {
      installed_count?: string | number;
      services_count?: string | number;
      browsers?: string[];
      security_tools?: string[];
      remote_access?: string[];
    };
    posture?: {
      score?: number;
      level?: string;
      firewall_enabled?: boolean;
      secure_boot?: boolean;
      disk_encryption?: string;
      checks?: {
        total?: number;
        passed?: number;
        failed?: number;
      };
      failed_checks?: string[];
    };
    drift?: {
      events_24h?: {
        total?: number;
        by_severity?: {
          critical?: number;
          high?: number;
          medium?: number;
          low?: number;
        };
      };
    };
    privileges?: {
      admin_count?: number;
      elevated_risk?: boolean;
      local_admins?: string[];
      root_users?: string[];
      ssh_keys_count?: number;
    };
    lifecycle?: {
      first_seen?: string;
      last_seen?: string;
    };
  };
}

/**
 * Props for the Endpoint Assets Panel
 */
export interface EndpointAssetsPanelProps extends Record<string, unknown> {
  hostName: string;
  contextID: string;
  scopeId: string;
  isPreviewMode?: boolean;
}

/**
 * Flyout props type for panel registration
 */
export interface EndpointAssetsPanelExpandableFlyoutProps extends FlyoutPanelProps {
  key: 'endpoint-assets-panel' | 'endpoint-assets-preview-panel';
  params: EndpointAssetsPanelProps;
}

/**
 * Tab identifiers for the flyout content
 */
export type EndpointAssetsTabId = 'overview' | 'posture' | 'drift' | 'privileges' | 'software';
