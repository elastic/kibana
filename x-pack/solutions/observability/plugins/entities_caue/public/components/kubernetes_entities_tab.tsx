/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiLoadingSpinner,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { K8sEntity } from '../../common/k8s_entity';
import { K8S_TYPE_LABELS } from '../../common/k8s_type_labels';
import { useK8sEntities } from '../hooks/use_k8s_entities';
import { K8sTopologyMap } from './kubernetes_map/k8s_topology_map';

type ViewId = 'table' | 'map';

interface Props {
  data: DataPublicPluginStart;
  isInstalled: boolean;
}

const PHASE_COLOR: Record<string, string> = {
  running: 'success',
  pending: 'warning',
  terminated: 'default',
  unknown: 'default',
};

const firstVal = (v: string | string[] | null | undefined): string | null =>
  Array.isArray(v) ? v[0] ?? null : v ?? null;

// EUI interprets dots in `field` as nested-path traversal, but our items use
// literal dotted keys (e.g. `record['k8s.namespace.name']`). Use computed
// columns (no `field`) so `render` receives the full record via bracket access.
const columns: Array<EuiBasicTableColumn<K8sEntity>> = [
  {
    name: i18n.translate('xpack.entitiesCaue.k8s.columns.name', { defaultMessage: 'Name' }),
    sortable: (item: K8sEntity) => item['entity.name'] ?? '',
    render: (item: K8sEntity) => item['entity.name'],
  },
  {
    name: i18n.translate('xpack.entitiesCaue.k8s.columns.type', { defaultMessage: 'Type' }),
    sortable: (item: K8sEntity) => item['entity.EngineMetadata.Type'] ?? '',
    width: '130px',
    render: (item: K8sEntity) => {
      const value = item['entity.EngineMetadata.Type'];
      return <EuiBadge color="hollow">{K8S_TYPE_LABELS[value] ?? value}</EuiBadge>;
    },
  },
  {
    name: i18n.translate('xpack.entitiesCaue.k8s.columns.namespace', {
      defaultMessage: 'Namespace',
    }),
    sortable: (item: K8sEntity) =>
      firstVal(item['k8s.namespace.name']) ?? firstVal(item['kubernetes.namespace']) ?? '',
    width: '150px',
    render: (item: K8sEntity) =>
      firstVal(item['k8s.namespace.name']) ?? firstVal(item['kubernetes.namespace']) ?? '—',
  },
  {
    name: i18n.translate('xpack.entitiesCaue.k8s.columns.cluster', { defaultMessage: 'Cluster' }),
    sortable: (item: K8sEntity) => firstVal(item['fields.cluster']) ?? '',
    width: '130px',
    render: (item: K8sEntity) => firstVal(item['fields.cluster']) ?? '—',
  },
  {
    name: i18n.translate('xpack.entitiesCaue.k8s.columns.phase', { defaultMessage: 'Phase' }),
    sortable: (item: K8sEntity) => item['kubernetes.container.status.phase'] ?? '',
    width: '110px',
    render: (item: K8sEntity) => {
      const phase = item['kubernetes.container.status.phase'];
      return phase ? (
        <EuiBadge color={PHASE_COLOR[phase.toLowerCase()] ?? 'default'}>{phase}</EuiBadge>
      ) : (
        '—'
      );
    },
  },
  {
    name: i18n.translate('xpack.entitiesCaue.k8s.columns.lastSeen', {
      defaultMessage: 'Last seen',
    }),
    sortable: (item: K8sEntity) => item['entity.lifecycle.last_seen'] ?? '',
    width: '180px',
    render: (item: K8sEntity) => {
      const v = item['entity.lifecycle.last_seen'];
      return v ? new Date(v).toLocaleString() : '—';
    },
  },
];

const VIEW_OPTIONS = [
  {
    id: 'table' as const,
    label: i18n.translate('xpack.entitiesCaue.k8s.view.table', { defaultMessage: 'Table' }),
    iconType: 'list',
  },
  {
    id: 'map' as const,
    label: i18n.translate('xpack.entitiesCaue.k8s.view.map', { defaultMessage: 'Map' }),
    iconType: 'node',
  },
];

export const KubernetesEntitiesTab = ({ data, isInstalled }: Props) => {
  const [view, setView] = useState<ViewId>('table');
  const { isLoading, isError, error, data: response } = useK8sEntities(data, isInstalled);

  const items = useMemo<K8sEntity[]>(() => {
    const cols = response?.columns ?? [];
    return (response?.values ?? []).map((row) => {
      const record: Record<string, unknown> = {};
      cols.forEach((col, i) => {
        record[col.name] = row[i];
      });
      return record as unknown as K8sEntity;
    });
  }, [response?.columns, response?.values]);

  if (isLoading) return <EuiLoadingSpinner size="xl" />;

  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        title={i18n.translate('xpack.entitiesCaue.k8s.error.title', {
          defaultMessage: 'Failed to load Kubernetes entities',
        })}
        color="danger"
        iconType="error"
      >
        {error instanceof Error ? error.message : String(error)}
      </EuiCallOut>
    );
  }

  return (
    <>
      <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.entitiesCaue.k8s.view.legend', {
              defaultMessage: 'View mode',
            })}
            options={VIEW_OPTIONS}
            idSelected={view}
            onChange={(id) => setView(id as ViewId)}
            buttonSize="compressed"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {view === 'map' ? (
        <K8sTopologyMap items={items} />
      ) : (
        <EuiInMemoryTable
          tableCaption={i18n.translate('xpack.entitiesCaue.k8s.table.caption', {
            defaultMessage: 'Kubernetes entities',
          })}
          columns={columns}
          items={items}
          itemId="entity.id"
          pagination
          sorting
          search
        />
      )}
    </>
  );
};
