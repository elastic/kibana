/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo } from 'react';
import type { Meta, StoryFn } from '@storybook/react';
import {
  DOCUMENT_TYPE_ENTITY,
  DOCUMENT_TYPE_EVENT,
  DOCUMENT_TYPE_ALERT,
} from '@kbn/cloud-security-posture-common/schema/graph/v1';
import { GlobalStylesStorybookDecorator } from '../../../.storybook/decorators';
import type { GraphGroupedNodePreviewPanelProps } from './graph_grouped_node_preview_panel';
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
  itemType: DOCUMENT_TYPE_ENTITY,
  id: 'entity-1',
  type: 'host',
  label: 'host-01.acme.com',
  icon: 'storage',
  risk: 75,
  timestamp: new Date('2023-12-01T10:30:00Z'),
  ips: ['10.200.0.101'],
  countryCodes: ['US'],
  ...overrides,
});

const createEventItem = (overrides: Partial<EventItem> = {}): EventItem => ({
  itemType: DOCUMENT_TYPE_EVENT,
  id: 'event-1',
  action: 'process_start',
  timestamp: new Date('2023-12-01T11:15:00Z'),
  ips: ['192.168.1.100'],
  countryCodes: ['CA'],
  actor: { id: 'user-123', label: 'admin_user', icon: 'user' },
  target: { id: 'process-456', label: 'notepad.exe', icon: 'document' },
  ...overrides,
});

const createAlertItem = (overrides: Partial<AlertItem> = {}): AlertItem => ({
  itemType: DOCUMENT_TYPE_ALERT,
  id: 'alert-1',
  action: 'malware_detected',
  timestamp: new Date('2023-12-01T12:45:00Z'),
  ips: ['172.16.0.50'],
  countryCodes: ['GB'],
  actor: { id: 'system-789', label: 'antivirus_scanner', icon: 'shield' },
  target: { id: 'file-101', label: 'suspicious.exe', icon: 'warning' },
  ...overrides,
});

const ContentTemplate: StoryFn<ContentTemplateArgs> = (args) => {
  const items = args.items || [];

  // Determine the icon and type based on the items
  const firstItem = items[0];
  let icon = 'index';
  let groupedItemsType = 'Events';

  const capitalize = (str: string) =>
    !str ? '' : str[0].toUpperCase() + str.slice(1).toLowerCase();

  if (firstItem && firstItem.itemType === DOCUMENT_TYPE_ENTITY) {
    icon = firstItem.icon ?? icon;
    groupedItemsType = capitalize(`${firstItem.type}s`) || 'Entities';
  }

  // Create mock pagination controls
  const pagination = {
    state: { pageIndex: 0, pageSize: 10 },
    goToPage: () => {},
    setPageSize: () => {},
  };

  return (
    <div style={{ width: '460px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <ContentBody
        items={items}
        totalHits={items.length}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
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
      ips: ['10.0.1.10'],
      countryCodes: ['US'],
    }),
    createEntityItem({
      id: 'host-2',
      label: 'db-server-02.prod',
      type: 'host',
      icon: 'storage',
      risk: 45,
      ips: ['10.0.1.11'],
      countryCodes: ['US'],
    }),
    createEntityItem({
      id: 'host-3',
      label: 'api-server-03.staging',
      type: 'host',
      icon: 'storage',
      risk: 65,
      ips: ['10.0.2.15'],
      countryCodes: ['CA'],
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
      actor: { id: 'process-malware', label: 'trojan.exe', icon: DOCUMENT_TYPE_ALERT },
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

export const LargeGroup: StoryFn<ContentTemplateArgs> = () => {
  // Generate 100 items
  const allItems = useMemo(
    () =>
      Array.from({ length: 100 }, (_, index) => {
        const itemTypes = [DOCUMENT_TYPE_ENTITY, DOCUMENT_TYPE_EVENT, DOCUMENT_TYPE_ALERT] as const;
        const itemType = itemTypes[index % 3];
        if (itemType === DOCUMENT_TYPE_ENTITY) {
          return createEntityItem({
            id: `entity-${index}`,
            label: `host-${String(index).padStart(2, '0')}.domain.com`,
            risk: Math.floor(Math.random() * 100),
            ips: [`10.0.1.${100 + index}`],
            countryCodes: [['US', 'CA', 'GB', 'DE', 'FR'][index % 5]],
          });
        } else if (itemType === DOCUMENT_TYPE_EVENT) {
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
            actor: {
              id: `threat-${index}`,
              label: `threat_actor_${index}`,
              icon: DOCUMENT_TYPE_ALERT,
            },
            target: { id: `victim-${index}`, label: `target_${index}`, icon: 'warning' },
          });
        }
      }) as PanelItems,
    []
  );

  // Pagination state (simulate what PaginationControls does)
  const [state, setPaginationState] = useState({ pageIndex: 0, pageSize: 10 });

  const goToPage = (pageIndex: number) => {
    setPaginationState((prev) => ({ ...prev, pageIndex }));
  };

  const setPageSize = (pageSize: number) => {
    setPaginationState({ pageIndex: 0, pageSize });
  };

  // Determine the icon and type based on the items
  const firstItem = allItems[0];
  let icon = 'index';
  let groupedItemsType = 'Events';
  const capitalize = (str: string) =>
    !str ? '' : str[0].toUpperCase() + str.slice(1).toLowerCase();
  if (firstItem && firstItem.itemType === DOCUMENT_TYPE_ENTITY) {
    icon = firstItem.icon ?? icon;
    groupedItemsType = capitalize(`${firstItem.type}s`) || 'Entities';
  }

  // Slice items for current page
  const start = state.pageIndex * state.pageSize;
  const end = start + state.pageSize;
  const pageItems = allItems.slice(start, end);

  const pagination = {
    state,
    goToPage,
    setPageSize,
  };

  return (
    <div style={{ width: '460px', border: '1px solid #ccc', borderRadius: '4px' }}>
      <ContentBody
        items={pageItems}
        totalHits={allItems.length}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
      />
    </div>
  );
};
LargeGroup.parameters = {
  docs: {
    description: {
      story:
        'Displays a large mixed group of 100 items to test component performance and scrolling behavior.',
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
