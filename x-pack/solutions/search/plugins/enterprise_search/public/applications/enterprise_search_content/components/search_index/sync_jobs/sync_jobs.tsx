/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { css } from '@emotion/react';
import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiIconTip, EuiSpacer, useEuiTheme } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Connector, SyncJobsTable } from '@kbn/search-connectors';

import { KibanaLogic } from '../../../../shared/kibana';

import { hasDocumentLevelSecurityFeature } from '../../../utils/connector_helpers';

import {
  AccessControlIndexSelector,
  AccessControlSelectorOption,
} from '../components/access_control_index_selector/access_control_index_selector';

import { SyncJobsViewLogic } from './sync_jobs_view_logic';

export interface SyncJobsProps {
  connector: Connector;
}

export const SyncJobs: React.FC<SyncJobsProps> = ({ connector }) => {
  const { productFeatures } = useValues(KibanaLogic);
  const shouldShowAccessSyncs =
    productFeatures.hasDocumentLevelSecurityEnabled && hasDocumentLevelSecurityFeature(connector);
  const errorOnAccessSync = Boolean(connector.last_access_control_sync_error);
  const errorOnContentSync = Boolean(connector.last_sync_error);
  const [selectedIndexType, setSelectedIndexType] =
    useState<AccessControlSelectorOption['value']>('content-index');
  const {
    connectorId,
    syncJobsPagination: pagination,
    syncJobs,
    cancelSyncJobLoading,
    syncJobToCancel,
    selectedSyncJobCategory,
    syncTriggeredLocally,
  } = useValues(SyncJobsViewLogic);
  const {
    setConnectorId,
    fetchSyncJobs,
    cancelSyncJob,
    setCancelSyncJob,
    setSelectedSyncJobCategory,
  } = useActions(SyncJobsViewLogic);

  useEffect(() => {
    setConnectorId(connector.id);
  }, [connector]);

  useEffect(() => {
    if (connectorId) {
      fetchSyncJobs({
        connectorId,
        from: pagination.pageIndex * (pagination.pageSize || 0),
        size: pagination.pageSize ?? 10,
        type: selectedSyncJobCategory,
      });
    }
  }, [connectorId, selectedSyncJobCategory]);

  useEffect(() => {
    if (selectedIndexType === 'content-index') {
      setSelectedSyncJobCategory('content');
    } else {
      setSelectedSyncJobCategory('access_control');
    }
  }, [selectedIndexType]);
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {shouldShowAccessSyncs && (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem
              grow={false}
              css={css`
                min-width: ${euiTheme.base * 18}px;
              `}
            >
              <AccessControlIndexSelector
                fullWidth
                onChange={setSelectedIndexType}
                valueOfSelected={selectedIndexType}
                indexSelectorOptions={[
                  {
                    description: i18n.translate(
                      'xpack.enterpriseSearch.content.searchIndex.documents.selector.contentIndexSync.description',
                      {
                        defaultMessage: 'Browse content sync history',
                      }
                    ),
                    error: errorOnContentSync,
                    title: i18n.translate(
                      'xpack.enterpriseSearch.content.searchIndex.documents.selector.contentIndexSync.title',
                      {
                        defaultMessage: 'Content syncs',
                      }
                    ),
                    value: 'content-index',
                  },
                  {
                    description: i18n.translate(
                      'xpack.enterpriseSearch.content.searchIndex.documents.selector.accessControlSync.description',
                      {
                        defaultMessage: 'Browse access control sync history',
                      }
                    ),
                    error: errorOnAccessSync,
                    title: i18n.translate(
                      'xpack.enterpriseSearch.content.searchIndex.documents.selectorSync.accessControl.title',
                      {
                        defaultMessage: 'Access control syncs',
                      }
                    ),
                    value: 'access-control-index',
                  },
                ]}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiIconTip
                content={
                  <p>
                    {i18n.translate(
                      'xpack.enterpriseSearch.accessControlIndexSelector.p.accessControlSyncsAreLabel',
                      {
                        defaultMessage:
                          'Access control syncs keep permissions information up to date for document level security (DLS)',
                      }
                    )}
                  </p>
                }
                position="right"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      )}
      {selectedSyncJobCategory === 'content' ? (
        <SyncJobsTable
          isLoading={syncTriggeredLocally}
          onPaginate={({ page: { index, size } }) => {
            if (connectorId) {
              fetchSyncJobs({
                connectorId,
                from: index * size,
                size,
                type: selectedSyncJobCategory,
              });
            }
          }}
          pagination={pagination}
          syncJobs={syncJobs}
          type="content"
          cancelConfirmModalProps={{
            isLoading: cancelSyncJobLoading,
            onConfirmCb: (syncJobId: string) => {
              cancelSyncJob({ syncJobId });
            },
            setSyncJobIdToCancel: setCancelSyncJob,
            syncJobIdToCancel: syncJobToCancel ?? undefined,
          }}
        />
      ) : (
        <SyncJobsTable
          isLoading={syncTriggeredLocally}
          onPaginate={({ page: { index, size } }) => {
            if (connectorId) {
              fetchSyncJobs({
                connectorId,
                from: index * size,
                size,
                type: 'access_control',
              });
            }
          }}
          cancelConfirmModalProps={{
            isLoading: cancelSyncJobLoading,
            onConfirmCb: (syncJobId: string) => {
              cancelSyncJob({ syncJobId });
            },
            setSyncJobIdToCancel: setCancelSyncJob,
            syncJobIdToCancel: syncJobToCancel ?? undefined,
          }}
          pagination={pagination}
          syncJobs={syncJobs}
          type="access_control"
        />
      )}
    </>
  );
};
