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

const STORYBOOK_SCOPE_ID = 'storybook-graph-grouped-panel';

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
  label: 'host-01.acme.com',
  icon: 'storage',
  risk: 75,
  timestamp: new Date('2023-12-01T10:30:00Z'),
  ips: ['10.200.0.101'],
  countryCodes: ['US'],
  entity: { type: 'host' },
  ...overrides,
});

// Actor and targets are the EUIDs the flyout resolves from each document, so they carry the
// entity type prefix and namespace rather than a friendly label or icon.
const createEventItem = (overrides: Partial<EventItem> = {}): EventItem => ({
  itemType: DOCUMENT_TYPE_EVENT,
  id: 'event-1',
  action: 'google.iam.admin.v1.CreateRole',
  timestamp: new Date('2023-12-01T11:15:00Z'),
  ips: ['192.168.1.100'],
  countryCodes: ['CA'],
  actor: { id: 'user:admin@example.com@gcp' },
  target: { ids: ['projects/acme-prod/roles/customRole'] },
  ...overrides,
});

const createAlertItem = (overrides: Partial<AlertItem> = {}): AlertItem => ({
  itemType: DOCUMENT_TYPE_ALERT,
  id: 'alert-1',
  action: 'google.iam.admin.v1.SetIamPolicy',
  timestamp: new Date('2023-12-01T12:45:00Z'),
  ips: ['172.16.0.50'],
  countryCodes: ['GB'],
  actor: { id: 'user:admin@example.com@gcp' },
  target: { ids: ['projects/acme-prod'] },
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
    groupedItemsType = capitalize(`${firstItem.entity?.type}s`) || 'Entities';
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
        scopeId={STORYBOOK_SCOPE_ID}
        items={items}
        totalHits={items.length}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
        onShowDocument={() => {}}
        onShowEntity={() => {}}
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
      entity: { type: 'host' },
      icon: 'storage',
      risk: 85,
      ips: ['10.0.1.10'],
      countryCodes: ['US'],
    }),
    createEntityItem({
      id: 'host-2',
      label: 'db-server-02.prod',
      entity: { type: 'host' },
      icon: 'storage',
      risk: 45,
      ips: ['10.0.1.11'],
      countryCodes: ['US'],
    }),
    createEntityItem({
      id: 'host-3',
      label: 'api-server-03.staging',
      entity: { type: 'host' },
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
    createEventItem({ id: 'event-1' }),
    createEventItem({
      id: 'event-2',
      action: 'AssumeRole',
      actor: { id: 'user:alice@acme.com@aws' },
      target: {
        ids: ['service:sts.amazonaws.com', 'arn:aws:iam::123456789012:role/DataPipelineRole'],
      },
      ips: ['203.0.113.10'],
      countryCodes: ['DE'],
    }),
    createEventItem({
      id: 'event-3',
      action: 'google.compute.v1.Instances.start',
      actor: { id: 'service:pipeline@acme-prod.iam.gserviceaccount.com' },
      target: {
        ids: ['host:web-01', 'host:web-02', 'host:web-03', 'host:db-01', 'host:db-02'],
      },
    }),
  ],
};
EventsGroup.parameters = {
  docs: {
    description: {
      story:
        'Events with one, two and five targets: the row shows the first target and a +N badge whose tooltip lists the rest.',
    },
  },
};

export const AlertsGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
AlertsGroup.args = {
  items: [
    createAlertItem({
      id: 'alert-1',
      action: 'ConsoleLogin',
      actor: { id: 'user:jane.smith@acme.com@okta' },
      target: { ids: ['service:aws-console'] },
    }),
    createAlertItem({
      id: 'alert-2',
      action: 'google.iam.admin.v1.SetIamPolicy',
      actor: { id: 'user:unknown.user@gmail.com@gcp' },
      target: { ids: ['projects/acme-prod', 'projects/acme-staging', 'projects/acme-dev'] },
    }),
    createAlertItem({
      id: 'alert-3',
      action: 'DeleteBucket',
      actor: { id: 'user:bob@acme.com@aws' },
      target: { ids: ['arn:aws:s3:::acme-customer-data'] },
    }),
  ],
};
AlertsGroup.parameters = {
  docs: {
    description: {
      story: 'Alerts, one of which has three targets.',
    },
  },
};

export const EventsAndAlertsGroup: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
EventsAndAlertsGroup.args = {
  items: [
    createEventItem({ id: 'event-mixed-1' }),
    createAlertItem({
      id: 'alert-mixed-1',
      target: {
        ids: [
          'projects/acme-prod',
          'projects/acme-staging',
          'projects/acme-dev',
          'projects/acme-sandbox',
        ],
      },
    }),
    createEventItem({
      id: 'event-mixed-2',
      action: 'AssumeRole',
      actor: { id: 'user:alice@acme.com@aws' },
      target: { ids: ['arn:aws:iam::123456789012:role/DataPipelineRole'] },
    }),
    createAlertItem({
      id: 'alert-mixed-2',
      action: 'ConsoleLogin',
      actor: { id: 'user:jane.smith@acme.com@okta' },
      target: { ids: ['service:aws-console'] },
    }),
  ],
};
EventsAndAlertsGroup.parameters = {
  docs: {
    description: {
      story:
        'A mixed group of events and alerts, showing how the component handles heterogeneous item types.',
    },
  },
};

export const ManyTargets: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
ManyTargets.args = {
  items: [
    createEventItem({ id: 'event-targets-1' }),
    createEventItem({
      id: 'event-targets-2',
      target: { ids: ['host:web-01', 'host:web-02'] },
    }),
    createEventItem({
      id: 'event-targets-3',
      target: { ids: ['host:web-01', 'host:web-02', 'host:web-03'] },
    }),
    createEventItem({
      id: 'event-targets-4',
      target: {
        ids: Array.from(
          { length: 12 },
          (_, index) => `host:web-${String(index + 1).padStart(2, '0')}`
        ),
      },
    }),
    createEventItem({
      id: 'event-targets-5',
      target: {
        ids: [
          'arn:aws:iam::123456789012:role/a-very-long-role-name-that-does-not-fit-in-the-badge',
          'projects/acme-prod/serviceAccounts/pipeline@acme-prod.iam.gserviceaccount.com',
        ],
      },
    }),
  ],
};
ManyTargets.parameters = {
  docs: {
    description: {
      story:
        'Documents with 1, 2, 3 and 12 targets, and with ids too long for the badge. The +N badge counts the targets after the first.',
    },
  },
};

export const PartiallyResolved: StoryFn<ContentTemplateArgs> = ContentTemplate.bind({});
PartiallyResolved.args = {
  items: [
    createEventItem({ id: 'event-actor-only', target: undefined }),
    createEventItem({ id: 'event-target-only', actor: undefined }),
    createEventItem({ id: 'event-no-identity', actor: undefined, target: undefined }),
  ],
};
PartiallyResolved.parameters = {
  docs: {
    description: {
      story:
        'Documents whose identity fields resolve only an actor, only targets, or nothing. A missing side shows a dash and the row is hidden when neither resolves.',
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
            actor: { id: `user:user-${index}@acme.com@gcp` },
            target: {
              ids: Array.from(
                { length: (index % 4) + 1 },
                (_unused, targetIndex) => `host:web-${index}-${targetIndex}`
              ),
            },
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
            actor: { id: `user:threat-${index}@example.org@okta` },
            target: { ids: [`service:victim-${index}`] },
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
    groupedItemsType = capitalize(`${firstItem.entity?.type}s`) || 'Entities';
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
        scopeId={STORYBOOK_SCOPE_ID}
        items={pageItems}
        totalHits={allItems.length}
        icon={icon}
        groupedItemsType={groupedItemsType}
        pagination={pagination}
        onShowDocument={() => {}}
        onShowEntity={() => {}}
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
