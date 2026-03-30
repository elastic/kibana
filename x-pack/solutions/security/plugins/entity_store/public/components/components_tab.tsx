/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBasicTable,
  EuiBadge,
  EuiEmptyPrompt,
  EuiLink,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EngineComponentStatus } from '../types';

interface ComponentsTabProps {
  components: EngineComponentStatus[];
}

const MANAGEMENT_URLS: Record<string, (id: string) => string> = {
  index_template: (id) =>
    `/app/management/data/index_management/templates/${encodeURIComponent(id)}`,
  component_template: (id) =>
    `/app/management/data/index_management/component_templates/${encodeURIComponent(id)}`,
  index: (id) =>
    `/app/management/data/index_management/indices/index_details?indexName=${encodeURIComponent(
      id
    )}&includeHiddenIndices=true`,
  ilm_policy: (id) =>
    `/app/management/data/index_lifecycle_management/policies/edit/${encodeURIComponent(id)}`,
};

const installedBadge = (installed: boolean) => (
  <EuiBadge color={installed ? 'success' : 'default'}>{installed ? 'Yes' : 'No'}</EuiBadge>
);

const renderName = (id: string, item: EngineComponentStatus) => {
  const urlFn = MANAGEMENT_URLS[item.resource];
  if (urlFn) {
    return <EuiLink href={urlFn(id)}>{id}</EuiLink>;
  }
  return id;
};

const resourceColumns: Array<EuiBasicTableColumn<EngineComponentStatus>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.entityStore.components.name', { defaultMessage: 'Name' }),
    truncateText: true,
    render: renderName,
  },
  {
    field: 'resource',
    name: i18n.translate('xpack.entityStore.components.type', { defaultMessage: 'Type' }),
    render: (resource: string) => resource.replace(/_/g, ' '),
    width: '180px',
  },
  {
    field: 'installed',
    name: i18n.translate('xpack.entityStore.components.installed', { defaultMessage: 'Installed' }),
    render: installedBadge,
    width: '100px',
  },
];

const taskColumns: Array<EuiBasicTableColumn<EngineComponentStatus>> = [
  {
    field: 'id',
    name: i18n.translate('xpack.entityStore.components.task', { defaultMessage: 'Task' }),
    truncateText: true,
  },
  {
    field: 'installed',
    name: i18n.translate('xpack.entityStore.components.installed', { defaultMessage: 'Installed' }),
    render: installedBadge,
    width: '100px',
  },
  {
    field: 'status',
    name: i18n.translate('xpack.entityStore.components.status', { defaultMessage: 'Status' }),
    render: (status?: string) => status ?? '-',
    width: '120px',
  },
  {
    field: 'runs',
    name: i18n.translate('xpack.entityStore.components.runs', { defaultMessage: 'Runs' }),
    render: (runs?: number) => (runs != null ? String(runs) : '-'),
    width: '80px',
  },
  {
    field: 'remainingLogsToExtract',
    name: i18n.translate('xpack.entityStore.components.remainingLogs', {
      defaultMessage: 'Remaining logs',
    }),
    render: (remaining?: number | null) => (remaining != null ? String(remaining) : '-'),
    width: '130px',
  },
  {
    field: 'lastError',
    name: i18n.translate('xpack.entityStore.components.lastError', {
      defaultMessage: 'Last error',
    }),
    truncateText: true,
    render: (lastError?: string) => lastError || '-',
  },
];

export const ComponentsTab = ({ components }: ComponentsTabProps) => {
  if (components.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="inspect"
        title={
          <h3>
            {i18n.translate('xpack.entityStore.components.noComponents', {
              defaultMessage: 'No components',
            })}
          </h3>
        }
        body={
          <p>
            {i18n.translate('xpack.entityStore.components.noComponentsBody', {
              defaultMessage:
                'Component data is not available. The engine may still be initializing.',
            })}
          </p>
        }
      />
    );
  }

  const tasks = components.filter((c) => c.resource === 'task');
  const resources = components.filter((c) => c.resource !== 'task');

  return (
    <>
      {resources.length > 0 && (
        <>
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.entityStore.components.infrastructure', {
                defaultMessage: 'Infrastructure',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBasicTable items={resources} columns={resourceColumns} rowHeader="id" />
        </>
      )}

      {tasks.length > 0 && (
        <>
          <EuiSpacer size="l" />
          <EuiTitle size="xs">
            <h4>
              {i18n.translate('xpack.entityStore.components.tasks', {
                defaultMessage: 'Tasks',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiBasicTable items={tasks} columns={taskColumns} rowHeader="id" />
        </>
      )}
    </>
  );
};
