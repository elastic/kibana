/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import type { GraphGroupedNodePreviewPanelProps } from '.';
import type { PanelItems, EntityItem, EventItem, AlertItem } from './components/grouped_item/types';
import { LoadingBody } from './components/loading_body';
import { EmptyBody } from './components/empty_body';
import { ContentBody } from './components/content_body';

// Interface for ContentTemplate args that includes the items property
interface ContentTemplateArgs extends Partial<GraphGroupedNodePreviewPanelProps> {
  items?: PanelItems;
}

const meta: Meta<ContentTemplateArgs> = {
  title: 'Components/Flyout components/GraphGroupedNodePreviewPanel',
  decorators: [GlobalStylesStorybookDecorator],
  argTypes: {
    items: {
      description: 'Array of entity, event, or alert items to display in the grouped panel',
      control: { type: 'object' },
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          'A flyout panel that renders groups of entities, events, and alerts with different visualizations based on the item type.',
      },
    },
  },
};

export default meta;

const createEntityItem = (overrides: Partial<EntityItem> = {}): EntityItem => ({
  itemType: 'entity',
  id: 'entity-1',
  type: 'host',
  label: 'host-01.acme.com',
  icon: 'storage',
  risk: 75,
  timestamp: new Date('2023-12-01T10:30:00Z'),
  ip: '10.200.0.101',
  countryCode: 'US',
  ...overrides,
});

const createEventItem = (overrides: Partial<EventItem> = {}): EventItem => ({
  itemType: 'event',
  id: 'event-1',
  action: 'process_start',
  timestamp: new Date('2023-12-01T11:15:00Z'),
  ip: '192.168.1.100',
  countryCode: 'CA',
  actor: { id: 'user-123', label: 'admin_user', icon: 'user' },
  target: { id: 'process-456', label: 'notepad.exe', icon: 'document' },
  ...overrides,
});

const createAlertItem = (overrides: Partial<AlertItem> = {}): AlertItem => ({
  itemType: 'alert',
  id: 'alert-1',
  action: 'malware_detected',
  timestamp: new Date('2023-12-01T12:45:00Z'),
  ip: '172.16.0.50',
  countryCode: 'GB',
  actor: { id: 'system-789', label: 'antivirus_scanner', icon: 'shield' },
  target: { id: 'file-101', label: 'suspicious.exe', icon: 'warning' },
  ...overrides,
});

const ContentTemplate: StoryFn<ContentTemplateArgs> = (args) => {
  const [pagination, setPagination] = React.useState({ pageIndex: 0, pageSize: 5 });
  const items = args.items || [];
  const paginatedItems = items.slice(
    pagination.pageIndex * pagination.pageSize,
    (pagination.pageIndex + 1) * pagination.pageSize
  );

  // Determine the icon and type based on the items
  const firstItem = items[0];
  let icon = 'index';
  let groupedItemsType = 'Events';

  const capitalize = (str: string) =>
    !str ? '' : str[0].toUpperCase() + str.slice(1).toLowerCase();

  if (firstItem && firstItem.itemType === 'entity') {
    icon = firstItem.icon ?? icon;
    groupedItemsType = capitalize(`${firstItem.type}s`) || 'Entities';
  }

  return (
    <div style={{ width: '460px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <ContentBody
        items={paginatedItems}
        totalHits={items.length}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
        onChangePage={(pageIndex) => setPagination({ ...pagination, pageIndex })}
        onChangeItemsPerPage={(pageSize) => setPagination({ pageIndex: 0, pageSize })}
      />
    </div>
  );
};

const LoadingTemplate: StoryFn = () => (
  <div style={{ width: '460px', border: '1px solid #ccc', borderRadius: '4px' }}>
    <LoadingBody />
  </div>
);

const EmptyTemplate: StoryFn = () => (
  <div style={{ width: '460px', border: '1px solid #ccc', borderRadius: '4px' }}>
    <EmptyBody onRefresh={() => {}} />
  </div>
);

export const EntitiesGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
EntitiesGroup.args = {
  items: [
    createEntityItem({
      id: 'host-1',
      label: 'web-server-01.prod',
      type: 'host',
      icon: 'storage',
      risk: 85,
      ip: '10.0.1.10',
      countryCode: 'US',
    }),
    createEntityItem({
      id: 'host-2',
      label: 'db-server-02.prod',
      type: 'host',
      icon: 'storage',
      risk: 45,
      ip: '10.0.1.11',
      countryCode: 'US',
    }),
    createEntityItem({
      id: 'host-3',
      label: 'api-server-03.staging',
      type: 'host',
      icon: 'storage',
      risk: 65,
      ip: '10.0.2.15',
      countryCode: 'CA',
    }),
  ],
};
EntitiesGroup.parameters = {
  docs: {
    description: {
      story: 'Displays a group of entity items (hosts) with consistent type and icon.',
    },
  },
};

export const EventsGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
EventsGroup.args = {
  items: [
    createEventItem({
      id: 'event-1',
      action: 'file_access',
      actor: { id: 'user-001', label: 'john.doe', icon: 'user' },
      target: { id: 'file-001', label: '/etc/passwd', icon: 'document' },
    }),
    createEventItem({
      id: 'event-2',
      action: 'network_connection',
      actor: { id: 'process-002', label: 'chrome.exe', icon: 'globe' },
      target: { id: 'endpoint-002', label: 'google.com:443', icon: 'network' },
    }),
    createEventItem({
      id: 'event-3',
      action: 'process_execution',
      actor: { id: 'user-003', label: 'admin', icon: 'user' },
      target: { id: 'process-003', label: 'powershell.exe', icon: 'console' },
    }),
  ],
};
EventsGroup.parameters = {
  docs: {
    description: {
      story:
        'Displays a group of event items with different actions and actor-target relationships.',
    },
  },
};

export const AlertsGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
AlertsGroup.args = {
  items: [
    createAlertItem({
      id: 'alert-1',
      action: 'suspicious_login',
      actor: { id: 'user-suspicious', label: 'unknown_user', icon: 'user' },
      target: { id: 'system-login', label: 'ssh_service', icon: 'lock' },
    }),
    createAlertItem({
      id: 'alert-2',
      action: 'malware_execution',
      actor: { id: 'process-malware', label: 'trojan.exe', icon: 'alert' },
      target: { id: 'system-memory', label: 'system_memory', icon: 'memory' },
    }),
    createAlertItem({
      id: 'alert-3',
      action: 'data_exfiltration',
      actor: { id: 'network-conn', label: 'unknown_endpoint', icon: 'globe' },
      target: { id: 'sensitive-data', label: 'customer_db.sql', icon: 'database' },
    }),
  ],
};
AlertsGroup.parameters = {
  docs: {
    description: {
      story:
        'Displays a group of alert items highlighting security threats and suspicious activities.',
    },
  },
};

export const EventsAndAlertsGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
EventsAndAlertsGroup.args = {
  items: [
    createEventItem({
      id: 'event-mixed-1',
      action: 'user_login',
      actor: { id: 'user-normal', label: 'jane.smith', icon: 'user' },
      target: { id: 'workstation-01', label: 'WS-001', icon: 'desktop' },
    }),
    createAlertItem({
      id: 'alert-mixed-1',
      action: 'privilege_escalation',
      actor: { id: 'user-escalate', label: 'jane.smith', icon: 'user' },
      target: { id: 'admin-group', label: 'administrators', icon: 'users' },
    }),
    createEventItem({
      id: 'event-mixed-2',
      action: 'file_modification',
      actor: { id: 'process-editor', label: 'notepad.exe', icon: 'document' },
      target: { id: 'config-file', label: 'app.config', icon: 'gear' },
    }),
    createAlertItem({
      id: 'alert-mixed-2',
      action: 'unauthorized_access',
      actor: { id: 'external-ip', label: '203.0.113.42', icon: 'globe' },
      target: { id: 'secure-folder', label: '/secure/documents', icon: 'folderClosed' },
    }),
  ],
};
EventsAndAlertsGroup.parameters = {
  docs: {
    description: {
      story:
        'Displays a mixed group containing both events and alerts, showing how the component handles heterogeneous item types.',
    },
  },
};

export const LargeGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
LargeGroup.args = {
  items: Array.from({ length: 10 }, (_, index) => {
    const itemTypes = ['entity', 'event', 'alert'] as const;
    const itemType = itemTypes[index % 3];

    if (itemType === 'entity') {
      return createEntityItem({
        id: `entity-${index}`,
        label: `host-${String(index).padStart(2, '0')}.domain.com`,
        risk: Math.floor(Math.random() * 100),
        ip: `10.0.1.${100 + index}`,
        countryCode: ['US', 'CA', 'GB', 'DE', 'FR'][index % 5],
      });
    } else if (itemType === 'event') {
      const actions = [
        'file_access',
        'network_connection',
        'process_execution',
        'registry_modification',
      ];
      return createEventItem({
        id: `event-${index}`,
        action: actions[index % actions.length],
        actor: { id: `actor-${index}`, label: `user_${index}`, icon: 'user' },
        target: { id: `target-${index}`, label: `resource_${index}`, icon: 'document' },
      });
    } else {
      const actions = [
        'malware_detected',
        'suspicious_login',
        'data_exfiltration',
        'privilege_escalation',
      ];
      return createAlertItem({
        id: `alert-${index}`,
        action: actions[index % actions.length],
        actor: { id: `threat-${index}`, label: `threat_actor_${index}`, icon: 'alert' },
        target: { id: `victim-${index}`, label: `target_${index}`, icon: 'warning' },
      });
    }
  }) as PanelItems,
};
LargeGroup.parameters = {
  docs: {
    description: {
      story:
        'Displays a large mixed group of 10 items to test component performance and scrolling behavior.',
    },
  },
};

export const LoadingState: StoryFn = LoadingTemplate.bind({});
LoadingState.parameters = {
  docs: {
    description: {
      story:
        "Displays a loading state with no items to test the component's behavior when data is being fetched.",
    },
  },
};

export const EmptyState: StoryFn = EmptyTemplate.bind({});
EmptyState.parameters = {
  docs: {
    description: {
      story:
        "Displays an empty state with no items to test the component's behavior when there is no data.",
    },
  },
};
