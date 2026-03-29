/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import type { EuiTabbedContentTab } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ALL_ENTITY_TYPES, PLUGIN_NAME } from '../../common';
import type { EntityType } from '../../common';
import type { EngineDescriptor } from '../types';
import {
  useEntityStoreStatus,
  useStartEntityStore,
  useStopEntityStore,
  useUninstallEntityStore,
} from '../hooks/use_entity_store_api';
import { useAppServices } from '../services_context';
import { EntityStoreEmptyState } from './empty_state';
import { ConfigurationTab } from './configuration_tab';
import { MonitoringTab } from './monitoring_tab';
import { ComponentsTab } from './components_tab';

const entityTypeButtons = ALL_ENTITY_TYPES.map((type) => ({
  id: type,
  label: type.charAt(0).toUpperCase() + type.slice(1),
}));

const isTransitioning = (status?: string): boolean =>
  status === 'installing' || status === 'updating';

export const EntityStorePage = () => {
  const { notifications } = useAppServices();
  const [selectedEntityType, setSelectedEntityType] = useState<EntityType>('user');
  const [showUninstallModal, setShowUninstallModal] = useState(false);

  const { data, isLoading, error } = useEntityStoreStatus(true);
  const startStore = useStartEntityStore();
  const stopStore = useStopEntityStore();
  const uninstallStore = useUninstallEntityStore();

  const selectedEngine: EngineDescriptor | undefined = useMemo(
    () => data?.engines.find((e) => e.type === selectedEntityType),
    [data, selectedEntityType]
  );

  const anyEngine = data?.engines[0];

  const handleStart = async () => {
    try {
      await startStore.mutateAsync([selectedEntityType]);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.entityStore.page.startSuccess', {
          defaultMessage: 'Started {entityType} engine',
          values: { entityType: selectedEntityType },
        })
      );
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.entityStore.page.startError', {
          defaultMessage: 'Failed to start {entityType} engine',
          values: { entityType: selectedEntityType },
        })
      );
    }
  };

  const handleStop = async () => {
    try {
      await stopStore.mutateAsync([selectedEntityType]);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.entityStore.page.stopSuccess', {
          defaultMessage: 'Stopped {entityType} engine',
          values: { entityType: selectedEntityType },
        })
      );
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.entityStore.page.stopError', {
          defaultMessage: 'Failed to stop {entityType} engine',
          values: { entityType: selectedEntityType },
        })
      );
    }
  };

  const handleUninstall = async () => {
    setShowUninstallModal(false);
    try {
      await uninstallStore.mutateAsync([selectedEntityType]);
      notifications.toasts.addSuccess(
        i18n.translate('xpack.entityStore.page.uninstallSuccess', {
          defaultMessage: '{entityType} engine uninstalled',
          values: { entityType: selectedEntityType },
        })
      );
    } catch (e) {
      notifications.toasts.addDanger(
        i18n.translate('xpack.entityStore.page.uninstallError', {
          defaultMessage: 'Failed to uninstall {entityType} engine',
          values: { entityType: selectedEntityType },
        })
      );
    }
  };

  if (isLoading) {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.EmptyPrompt>
          <EuiLoadingSpinner size="xl" />
        </EuiPageTemplate.EmptyPrompt>
      </EuiPageTemplate>
    );
  }

  if (error) {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.Header pageTitle={PLUGIN_NAME} />
        <EuiPageTemplate.Section>
          <EuiCallOut
            title={i18n.translate('xpack.entityStore.page.loadError', {
              defaultMessage: 'Failed to load Entity Store status',
            })}
            color="danger"
            iconType="error"
          >
            <p>{error instanceof Error ? error.message : String(error)}</p>
          </EuiCallOut>
        </EuiPageTemplate.Section>
      </EuiPageTemplate>
    );
  }

  if (data?.status === 'not_installed') {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.EmptyPrompt>
          <EntityStoreEmptyState />
        </EuiPageTemplate.EmptyPrompt>
      </EuiPageTemplate>
    );
  }

  if (data?.status === 'installing') {
    return (
      <EuiPageTemplate>
        <EuiPageTemplate.Header pageTitle={PLUGIN_NAME} />
        <EuiPageTemplate.EmptyPrompt>
          <EuiLoadingSpinner size="xl" />
          <EuiSpacer size="m" />
          <p>
            {i18n.translate('xpack.entityStore.page.installing', {
              defaultMessage: 'Installing Entity Store...',
            })}
          </p>
        </EuiPageTemplate.EmptyPrompt>
      </EuiPageTemplate>
    );
  }

  const isRunning = selectedEngine?.status === 'started';

  const enginesContent = (
    <>
      <EuiSpacer size="l" />
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={i18n.translate('xpack.entityStore.page.entityType', {
              defaultMessage: 'Entity type',
            })}
            options={entityTypeButtons}
            idSelected={selectedEntityType}
            onChange={(id) => setSelectedEntityType(id as EntityType)}
            buttonSize="m"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            {selectedEngine && (
              <EuiFlexItem grow={false}>
                {isRunning ? (
                  <EuiButton
                    color="warning"
                    iconType="stop"
                    onClick={handleStop}
                    isLoading={stopStore.isPending}
                    size="s"
                  >
                    {i18n.translate('xpack.entityStore.page.stop', {
                      defaultMessage: 'Stop',
                    })}
                  </EuiButton>
                ) : (
                  <EuiButton
                    color="success"
                    iconType="play"
                    onClick={handleStart}
                    isLoading={startStore.isPending}
                    size="s"
                    disabled={isTransitioning(selectedEngine.status)}
                  >
                    {i18n.translate('xpack.entityStore.page.start', {
                      defaultMessage: 'Start',
                    })}
                  </EuiButton>
                )}
              </EuiFlexItem>
            )}
            {selectedEngine && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  color="danger"
                  iconType="trash"
                  onClick={() => setShowUninstallModal(true)}
                  size="s"
                >
                  {i18n.translate('xpack.entityStore.page.uninstall', {
                    defaultMessage: 'Uninstall',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      {selectedEngine ? (
        <MonitoringTab engine={selectedEngine} />
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.entityStore.page.noEngine', {
            defaultMessage: 'No engine found for {entityType}',
            values: { entityType: selectedEntityType },
          })}
          color="warning"
        />
      )}

      {selectedEngine && (selectedEngine.components ?? []).length > 0 && (
        <>
          <EuiSpacer size="xl" />
          <ComponentsTab components={selectedEngine.components ?? []} />
        </>
      )}
    </>
  );

  const tabs: EuiTabbedContentTab[] = [
    {
      id: 'engines',
      name: i18n.translate('xpack.entityStore.page.enginesTab', {
        defaultMessage: 'Engines',
      }),
      content: enginesContent,
    },
    {
      id: 'configuration',
      name: i18n.translate('xpack.entityStore.page.configurationTab', {
        defaultMessage: 'Configuration',
      }),
      content: anyEngine ? (
        <>
          <EuiSpacer size="l" />
          <ConfigurationTab engine={anyEngine} />
        </>
      ) : (
        <EuiCallOut
          title={i18n.translate('xpack.entityStore.page.noEngines', {
            defaultMessage: 'No engines available',
          })}
          color="warning"
        />
      ),
    },
  ];

  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header pageTitle={PLUGIN_NAME} />
      <EuiPageTemplate.Section>
        <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />

        {showUninstallModal && (
          <EuiConfirmModal
            title={i18n.translate('xpack.entityStore.page.uninstallModalTitle', {
              defaultMessage: 'Uninstall {entityType} engine?',
              values: { entityType: selectedEntityType },
            })}
            onCancel={() => setShowUninstallModal(false)}
            onConfirm={handleUninstall}
            cancelButtonText={i18n.translate('xpack.entityStore.page.cancel', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate('xpack.entityStore.page.confirmUninstall', {
              defaultMessage: 'Uninstall',
            })}
            buttonColor="danger"
            defaultFocusedButton="cancel"
          >
            <p>
              {i18n.translate('xpack.entityStore.page.uninstallModalBody', {
                defaultMessage:
                  'This will remove the {entityType} engine and its data. This action cannot be undone.',
                values: { entityType: selectedEntityType },
              })}
            </p>
          </EuiConfirmModal>
        )}
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
