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
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiHealth,
  EuiInMemoryTable,
  EuiLink,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiToolTip,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { HttpStart } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { ServiceEntity } from '../../common/service_entity';
import { getHealthColors, getHealthColor } from '../utils/health_colors';
import { getApmServiceOverviewUrl } from '../utils/apm_service_link';
import { ServiceMetadataFlyout } from './service_metadata_flyout';
import { useServiceEntities } from '../hooks/use_service_entities';
import { useEntityStoreStatus } from '../hooks/use_entity_store_status';
import { useServiceDependencies } from '../hooks/use_service_dependencies';
import { ServiceMap } from './service_map/service_map';
import { KubernetesEntitiesTab } from './kubernetes_entities_tab';

type TabId = 'entities' | 'map' | 'kubernetes';

const toStringArray = (value: string | string[] | null): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

interface Props {
  data: DataPublicPluginStart;
  http: HttpStart;
  share: SharePluginStart;
}

export const ServiceEntitiesPage = ({ data, http, share }: Props) => {
  const { euiTheme } = useEuiTheme();
  const [selectedTab, setSelectedTab] = useState<TabId>('entities');
  const [flyoutEntity, setFlyoutEntity] = useState<{
    entityId: string;
    serviceName: string;
  } | null>(null);

  const { data: dependenciesData, refetch: refetchDependencies } = useServiceDependencies(http);

  const healthColors = useMemo(() => getHealthColors(euiTheme), [euiTheme]);

  const columns = useMemo<Array<EuiBasicTableColumn<ServiceEntity>>>(
    () => [
      {
        field: 'entity.name',
        name: i18n.translate('xpack.entitiesCaue.columns.name', { defaultMessage: 'Name' }),
        sortable: true,
        width: '180px',
        render: (name: string, item: ServiceEntity) => {
          const href = getApmServiceOverviewUrl({
            share,
            serviceName: name,
            environments: toStringArray(item['service.environment']),
          });
          if (!href) return name;
          return (
            <EuiLink data-test-subj="entitiesCaueServiceNameLink" href={href}>
              {name}
            </EuiLink>
          );
        },
      },
      {
        field: 'service.health.calculated_level',
        name: i18n.translate('xpack.entitiesCaue.columns.health', { defaultMessage: 'Health' }),
        sortable: true,
        width: '170px',
        render: (_level: string | null, item: ServiceEntity) => {
          const level = item['service.health.calculated_level'];
          const scoreNorm = item['service.health.calculated_score_norm'];
          if (!level) {
            return (
              <EuiHealth color={healthColors.Unknown}>
                {i18n.translate('xpack.entitiesCaue.health.unknown', {
                  defaultMessage: 'Unknown',
                })}
              </EuiHealth>
            );
          }
          const displayScore =
            scoreNorm !== null && scoreNorm !== undefined
              ? ` (${(Math.round(scoreNorm * 100) / 100).toFixed(2)})`
              : '';
          const rawLabel = `${level}${displayScore}`;
          return (
            <EuiToolTip
              content={
                scoreNorm !== null && scoreNorm !== undefined
                  ? i18n.translate('xpack.entitiesCaue.health.tooltip', {
                      defaultMessage: 'Health score: {score}',
                      values: { score: scoreNorm.toFixed(2) },
                    })
                  : undefined
              }
            >
              <EuiHealth color={getHealthColor(level, healthColors)}>{rawLabel}</EuiHealth>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'service.environment',
        name: i18n.translate('xpack.entitiesCaue.columns.environment', {
          defaultMessage: 'Environment',
        }),
        sortable: true,
        render: (value: string | string[] | null) => {
          const envs = toStringArray(value);
          if (envs.length === 0) return '—';
          if (envs.length === 1) return <EuiBadge color="hollow">{envs[0]}</EuiBadge>;
          return (
            <EuiToolTip content={envs.join('\n')}>
              <EuiBadge color="hollow" tabIndex={0}>
                {i18n.translate('xpack.entitiesCaue.columns.environment.count', {
                  defaultMessage: '{count} environments',
                  values: { count: envs.length },
                })}
              </EuiBadge>
            </EuiToolTip>
          );
        },
      },
      {
        field: 'entity.source',
        name: i18n.translate('xpack.entitiesCaue.columns.source', { defaultMessage: 'Sources' }),
        render: (value: string | string[] | null) =>
          toStringArray(value).map((src) => (
            <EuiBadge key={src} color="primary">
              {src}
            </EuiBadge>
          )),
      },
      {
        field: 'entity.lifecycle.first_seen',
        name: i18n.translate('xpack.entitiesCaue.columns.firstSeen', {
          defaultMessage: 'First seen',
        }),
        sortable: true,
        width: '200px',
        render: (value: string | null) => (value ? new Date(value).toLocaleString() : '—'),
      },
      {
        field: 'entity.lifecycle.last_seen',
        name: i18n.translate('xpack.entitiesCaue.columns.lastSeen', {
          defaultMessage: 'Last seen',
        }),
        sortable: true,
        width: '200px',
        render: (value: string | null) => (value ? new Date(value).toLocaleString() : '—'),
      },
      {
        name: i18n.translate('xpack.entitiesCaue.columns.actions', { defaultMessage: 'Actions' }),
        width: '80px',
        actions: [
          {
            render: (item: ServiceEntity) => {
              const label = i18n.translate('xpack.entitiesCaue.columns.actions.edit', {
                defaultMessage: 'Edit metadata for {name}',
                values: { name: item['entity.name'] },
              });
              return (
                <EuiToolTip content={label} disableScreenReaderOutput>
                  <EuiButtonIcon
                    data-test-subj="entitiesCaueColumnsButton"
                    iconType="pencil"
                    aria-label={label}
                    onClick={() =>
                      setFlyoutEntity({
                        entityId: item['entity.id'],
                        serviceName: item['entity.name'],
                      })
                    }
                  />
                </EuiToolTip>
              );
            },
          },
        ],
      },
    ],
    [share, healthColors]
  );

  const { statusQuery, startMutation, stopMutation } = useEntityStoreStatus(http);

  const entityStoreStatus = statusQuery.data?.status;
  const isInstalled = entityStoreStatus !== undefined && entityStoreStatus !== 'not_installed';
  const isRunning = entityStoreStatus === 'running';

  const {
    isLoading,
    isError,
    error,
    data: response,
    refetch,
  } = useServiceEntities(data, isInstalled);
  const isTransitioning =
    entityStoreStatus === 'installing' || startMutation.isLoading || stopMutation.isLoading;

  const items = useMemo<ServiceEntity[]>(() => {
    const cols = response?.columns ?? [];
    return (response?.values ?? []).map((row) => {
      const record: Record<string, unknown> = {};
      cols.forEach((col, i) => {
        record[col.name] = row[i];
      });
      return record as unknown as ServiceEntity;
    });
  }, [response?.columns, response?.values]);

  const refreshButton = (
    <EuiButton
      data-test-subj="ServiceEntitiesPageRefreshButton"
      size="s"
      iconType="refresh"
      isLoading={isLoading}
      isDisabled={!isInstalled || isLoading}
      onClick={() => {
        refetch();
        refetchDependencies();
      }}
    >
      {i18n.translate('xpack.entitiesCaue.refresh', { defaultMessage: 'Refresh' })}
    </EuiButton>
  );

  const toggleButton = (
    <EuiButton
      data-test-subj="ServiceEntitiesPageButton"
      size="s"
      color={isRunning ? 'danger' : 'primary'}
      isLoading={isTransitioning}
      isDisabled={isTransitioning || statusQuery.isLoading}
      onClick={() => (isRunning ? stopMutation.mutate() : startMutation.mutate())}
    >
      {isRunning
        ? i18n.translate('xpack.entitiesCaue.toggle.stop', { defaultMessage: 'Stop entity store' })
        : i18n.translate('xpack.entitiesCaue.toggle.start', {
            defaultMessage: 'Start entity store',
          })}
    </EuiButton>
  );

  const tabs = [
    {
      label: i18n.translate('xpack.entitiesCaue.tabs.entities', { defaultMessage: 'Entities' }),
      isSelected: selectedTab === 'entities',
      onClick: () => setSelectedTab('entities'),
      'data-test-subj': 'serviceEntitiesTab-entities',
    },
    {
      label: i18n.translate('xpack.entitiesCaue.tabs.serviceMap', {
        defaultMessage: 'Service map',
      }),
      isSelected: selectedTab === 'map',
      onClick: () => setSelectedTab('map'),
      'data-test-subj': 'serviceEntitiesTab-map',
    },
    {
      label: i18n.translate('xpack.entitiesCaue.tabs.kubernetes', {
        defaultMessage: 'Kubernetes 2',
      }),
      isSelected: selectedTab === 'kubernetes',
      onClick: () => setSelectedTab('kubernetes'),
      'data-test-subj': 'serviceEntitiesTab-kubernetes',
    },
  ];

  const content = (() => {
    if (statusQuery.isLoading) return <EuiLoadingSpinner size="xl" />;

    if (!isInstalled) {
      return (
        <EuiEmptyPrompt
          iconType="database"
          title={
            <h2>
              {i18n.translate('xpack.entitiesCaue.notInstalled.title', {
                defaultMessage: 'Entity store not installed',
              })}
            </h2>
          }
          body={i18n.translate('xpack.entitiesCaue.notInstalled.body', {
            defaultMessage:
              'Install the entity store to start collecting and viewing service entities.',
          })}
        />
      );
    }

    if (selectedTab === 'kubernetes') {
      return <KubernetesEntitiesTab data={data} isInstalled={isInstalled} />;
    }

    if (isError) {
      return (
        <EuiCallOut
          announceOnMount
          title={i18n.translate('xpack.entitiesCaue.error.title', {
            defaultMessage: 'Failed to load service entities',
          })}
          color="danger"
          iconType="error"
        >
          {error instanceof Error ? error.message : String(error)}
        </EuiCallOut>
      );
    }

    if (isLoading) return <EuiLoadingSpinner size="xl" />;

    if (selectedTab === 'map') {
      return <ServiceMap items={items} edges={dependenciesData?.edges ?? []} />;
    }

    return (
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.entitiesCaue.table.caption', {
          defaultMessage: 'Service entities',
        })}
        columns={columns}
        items={items}
        itemId="entity.id"
        pagination
        sorting
        search
      />
    );
  })();

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('xpack.entitiesCaue.pageTitle', {
          defaultMessage: 'Service Entities 222',
        })}
        rightSideItems={[toggleButton, refreshButton]}
        tabs={tabs}
      />
      <EuiPageTemplate.Section>{content}</EuiPageTemplate.Section>
      {flyoutEntity && (
        <ServiceMetadataFlyout
          http={http}
          entityId={flyoutEntity.entityId}
          serviceName={flyoutEntity.serviceName}
          onClose={() => setFlyoutEntity(null)}
        />
      )}
    </EuiPageTemplate>
  );
};
