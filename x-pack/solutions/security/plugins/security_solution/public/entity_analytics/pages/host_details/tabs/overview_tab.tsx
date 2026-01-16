/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
  EuiDescriptionList,
} from '@elastic/eui';

interface HostDetailsData {
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

interface OverviewTabProps {
  hostId: string;
  hostData: HostDetailsData;
}

const getFirst = <T,>(value: T | T[] | undefined): T | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
};

export const OverviewTab: React.FC<OverviewTabProps> = React.memo(({ hostId, hostData }) => {
  const identityItems = useMemo(() => {
    if (!hostData) return [];
    return [
      {
        title: 'Hostname',
        description: getFirst(hostData.host?.hostname) || getFirst(hostData.host?.name) || '-',
      },
      {
        title: 'Host ID',
        description: getFirst(hostData.host?.id) || '-',
      },
      {
        title: 'IP Address',
        description: getFirst(hostData.host?.ip) || '-',
      },
      {
        title: 'MAC Address',
        description: getFirst(hostData.host?.mac) || '-',
      },
      {
        title: 'OS',
        description: getFirst(hostData.host?.os?.name) || '-',
      },
      {
        title: 'OS Version',
        description: hostData.host?.os?.version || '-',
      },
      {
        title: 'OS Build',
        description: hostData.host?.os?.build || '-',
      },
      {
        title: 'Platform',
        description: hostData.host?.os?.platform || '-',
      },
      {
        title: 'Architecture',
        description: hostData.host?.architecture || '-',
      },
    ];
  }, [hostData]);

  const hardwareItems = useMemo(() => {
    if (!hostData) return [];
    const hw = hostData.endpoint?.hardware;

    // Format memory - flattened field name
    let memoryDisplay = '-';
    const memoryGb = hw?.memory_gb;
    if (memoryGb) {
      const val = parseFloat(String(memoryGb));
      if (!isNaN(val)) memoryDisplay = `${val.toFixed(1)} GB`;
    }

    // Format CPU cores - flattened field names
    const physicalCores = hw?.cpu_physical_cores;
    const logicalCores = hw?.cpu_cores;
    let coresDisplay = '-';
    if (physicalCores || logicalCores) {
      const phys = physicalCores ? String(physicalCores) : '?';
      const log = logicalCores ? String(logicalCores) : '?';
      coresDisplay = `${phys} physical / ${log} logical`;
    }

    return [
      {
        title: 'Vendor',
        description: hw?.vendor || '-',
      },
      {
        title: 'Model',
        description: hw?.model || '-',
      },
      {
        title: 'Serial',
        description: hw?.serial || '-',
      },
      {
        title: 'UUID',
        description: hw?.uuid || '-',
      },
      {
        title: 'CPU',
        description: hw?.cpu || '-',
      },
      {
        title: 'CPU Cores',
        description: coresDisplay,
      },
      {
        title: 'Memory',
        description: memoryDisplay,
      },
      {
        title: 'Memory Type',
        description:
          hw?.memory_type && hw?.memory_speed
            ? `${hw.memory_type} @ ${hw.memory_speed}`
            : hw?.memory_type || '-',
      },
    ];
  }, [hostData]);

  const agentItems = useMemo(() => {
    if (!hostData) return [];
    return [
      {
        title: 'Agent ID',
        description: hostData.agent?.id || '-',
      },
      {
        title: 'Agent Name',
        description: hostData.agent?.name || '-',
      },
      {
        title: 'Agent Version',
        description: hostData.agent?.version || '-',
      },
      {
        title: 'Last Seen',
        description: hostData['@timestamp']
          ? new Date(hostData['@timestamp']).toLocaleString()
          : '-',
      },
    ];
  }, [hostData]);

  const diskItems = useMemo(() => {
    if (!hostData) return [];
    const hw = hostData.endpoint?.hardware;
    const diskCount = hw?.disk_count ? String(hw.disk_count) : '-';
    const totalCapacity = hw?.disk_total_gb
      ? `${parseFloat(String(hw.disk_total_gb)).toFixed(1)} GB`
      : '-';
    const usbCount = hw?.usb_count ? String(hw.usb_count) : '-';
    const usbRemovable = hw?.usb_removable_count ? String(hw.usb_removable_count) : '-';

    return [
      { title: 'Disk Count', description: diskCount },
      { title: 'Total Capacity', description: totalCapacity },
      { title: 'USB Devices', description: usbCount },
      { title: 'Removable USB', description: usbRemovable },
    ];
  }, [hostData]);

  const networkItems = useMemo(() => {
    if (!hostData) return [];
    const net = hostData.endpoint?.network;
    const interfaceCount = net?.interface_count ? String(net.interface_count) : '-';
    const listeningPorts = net?.listening_ports_count ? String(net.listening_ports_count) : '-';
    const macAddresses = Array.isArray(net?.mac_addresses) ? net.mac_addresses.join(', ') : '-';
    const ipAddresses = Array.isArray(net?.ip_addresses) ? net.ip_addresses.join(', ') : '-';

    return [
      { title: 'Interfaces', description: interfaceCount },
      { title: 'Listening Ports', description: listeningPorts },
      { title: 'MAC Addresses', description: macAddresses },
      { title: 'IP Addresses', description: ipAddresses },
    ];
  }, [hostData]);

  const softwareItems = useMemo(() => {
    if (!hostData) return [];
    const sw = hostData.endpoint?.software;
    const installedCount = sw?.installed_count ? String(sw.installed_count) : '-';
    const servicesCount = sw?.services_count ? String(sw.services_count) : '-';
    const browsers = Array.isArray(sw?.browsers) ? sw.browsers.filter(Boolean).join(', ') : '-';
    const securityTools = Array.isArray(sw?.security_tools)
      ? sw.security_tools.filter(Boolean).join(', ')
      : '-';
    const remoteAccess = Array.isArray(sw?.remote_access)
      ? sw.remote_access.filter(Boolean).join(', ')
      : '-';

    return [
      { title: 'Installed Apps', description: installedCount },
      { title: 'Services', description: servicesCount },
      { title: 'Browsers', description: browsers || '-' },
      { title: 'Security Tools', description: securityTools || '-' },
      { title: 'Remote Access (Shadow IT)', description: remoteAccess || 'None detected' },
    ];
  }, [hostData]);

  return (
    <>
      <EuiSpacer size="m" />

      {/* First row: Identity, Hardware, Agent & Activity */}
      <EuiFlexGroup gutterSize="m" wrap responsive>
        <EuiFlexItem grow={1}>
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs">
              <h4>Identity</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="row"
              listItems={identityItems}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs">
              <h4>Hardware</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="row"
              listItems={hardwareItems}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs">
              <h4>Agent & Activity</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="row"
              listItems={agentItems}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Second row: Storage, Network, Software Summary */}
      <EuiFlexGroup gutterSize="m" wrap responsive>
        <EuiFlexItem grow={1}>
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs">
              <h4>Storage</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="row"
              listItems={diskItems}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs">
              <h4>Network</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="row"
              listItems={networkItems}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={1}>
          <EuiPanel paddingSize="s">
            <EuiTitle size="xxs">
              <h4>Software Summary</h4>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiDescriptionList
              type="row"
              listItems={softwareItems}
              compressed
            />
          </EuiPanel>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

OverviewTab.displayName = 'OverviewTab';
