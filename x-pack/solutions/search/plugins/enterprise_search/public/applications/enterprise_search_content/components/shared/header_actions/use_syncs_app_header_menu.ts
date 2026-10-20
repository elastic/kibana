/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useActions, useValues } from 'kea';

import type { AppHeaderMenu } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { ConnectorStatus, IngestionStatus } from '@kbn/search-connectors';

import { Status } from '../../../../../../common/types/api';
import { KibanaLogic } from '../../../../shared/kibana';
import { CancelSyncsApiLogic } from '../../../api/connector/cancel_syncs_api_logic';
import { ConnectorViewLogic } from '../../connector_detail/connector_view_logic';
import { IndexViewLogic } from '../../search_index/index_view_logic';

import { SyncsLogic } from './syncs_logic';

export const useSyncsAppHeaderMenu = (): AppHeaderMenu | undefined => {
  const { productFeatures, isAgentlessEnabled } = useValues(KibanaLogic);
  const { ingestionStatus, isCanceling, isSyncing, isWaitingForSync } = useValues(IndexViewLogic);
  const { connector, hasDocumentLevelSecurityFeature, hasIncrementalSyncFeature } =
    useValues(ConnectorViewLogic);
  const { status } = useValues(CancelSyncsApiLogic);
  const { startSync, startIncrementalSync, startAccessControlSync, cancelSyncs } =
    useActions(SyncsLogic);

  return useMemo(() => {
    if (!connector) {
      return undefined;
    }

    const syncLoading =
      (isSyncing || isWaitingForSync) && ingestionStatus !== IngestionStatus.ERROR;
    const isWaitingForConnector = !connector.status || connector.status === ConnectorStatus.CREATED;
    const shouldShowDocumentLevelSecurity =
      productFeatures.hasDocumentLevelSecurityEnabled && hasDocumentLevelSecurityFeature;
    const shouldShowIncrementalSync =
      productFeatures.hasIncrementalSyncEnabled && hasIncrementalSyncFeature;
    const isSyncsDisabled =
      (connector.is_native && !isAgentlessEnabled) ||
      ingestionStatus === IngestionStatus.INCOMPLETE ||
      !connector.index_name;

    const label = isWaitingForSync
      ? i18n.translate('xpack.enterpriseSearch.content.index.syncButton.waitingForSync.label', {
          defaultMessage: 'Waiting for sync',
        })
      : isSyncing && connector.status !== ConnectorStatus.ERROR
      ? i18n.translate('xpack.enterpriseSearch.content.index.syncButton.syncing.label', {
          defaultMessage: 'Syncing',
        })
      : i18n.translate('xpack.enterpriseSearch.content.index.syncButton.label', {
          defaultMessage: 'Sync',
        });

    return {
      primaryActionItem: {
        id: 'sync',
        label,
        iconType: 'play',
        testId: 'enterpriseSearchSyncsContextMenuButton',
        disableButton: isWaitingForConnector,
        isLoading: syncLoading,
        items: [
          ...(!syncLoading
            ? [
                {
                  id: 'fullSync',
                  label: i18n.translate('xpack.enterpriseSearch.index.header.more.fullSync', {
                    defaultMessage: 'Full Content',
                  }),
                  iconType: 'play',
                  testId: 'entSearchContent-connector-header-sync-startSync',
                  disableButton: isSyncsDisabled,
                  run: () => startSync(connector),
                },
              ]
            : []),
          ...(shouldShowIncrementalSync
            ? [
                {
                  id: 'incrementalSync',
                  label: i18n.translate(
                    'xpack.enterpriseSearch.index.header.more.incrementalSync',
                    { defaultMessage: 'Incremental Content' }
                  ),
                  iconType: 'play',
                  testId: 'entSearchContent-connector-header-sync-more-incrementalSync',
                  disableButton: isSyncsDisabled,
                  run: () => startIncrementalSync(connector),
                },
              ]
            : []),
          ...(shouldShowDocumentLevelSecurity
            ? [
                {
                  id: 'accessControlSync',
                  label: i18n.translate(
                    'xpack.enterpriseSearch.index.header.more.accessControlSync',
                    { defaultMessage: 'Access Control' }
                  ),
                  iconType: 'play',
                  testId: 'entSearchContent-connector-header-sync-more-accessControlSync',
                  disableButton: Boolean(
                    isSyncsDisabled || !connector.configuration.use_document_level_security?.value
                  ),
                  run: () => startAccessControlSync(connector),
                },
              ]
            : []),
          {
            id: 'cancelSyncs',
            label: i18n.translate('xpack.enterpriseSearch.index.header.cancelSyncsTitle', {
              defaultMessage: 'Cancel Syncs',
            }),
            iconType: 'cross',
            testId: 'entSearchContent-connector-header-sync-cancelSync',
            disableButton:
              (isCanceling && ingestionStatus !== IngestionStatus.ERROR) ||
              status === Status.LOADING,
            isDestructive: true,
            run: () => cancelSyncs(connector),
          },
        ],
      },
    };
  }, [
    cancelSyncs,
    connector,
    hasDocumentLevelSecurityFeature,
    hasIncrementalSyncFeature,
    ingestionStatus,
    isAgentlessEnabled,
    isCanceling,
    isSyncing,
    isWaitingForSync,
    productFeatures.hasDocumentLevelSecurityEnabled,
    productFeatures.hasIncrementalSyncEnabled,
    startAccessControlSync,
    startIncrementalSync,
    startSync,
    status,
  ]);
};
