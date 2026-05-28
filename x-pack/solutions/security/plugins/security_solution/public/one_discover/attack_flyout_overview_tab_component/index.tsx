/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { CellActionRenderer } from '../../flyout_v2/shared/components/cell_actions';
import { OverviewTab } from '../../flyout_v2/attack_details/main/tabs/overview_tab';
import { AttackEntities } from '../../flyout_v2/attack_details/tools/entities';
import { AttackCorrelations } from '../../flyout_v2/attack_details/tools/correlations';
import type { SecurityAppStore } from '../../common/store/types';
import type { StartServices } from '../../types';
import { documentFlyoutHistoryKey } from '../../flyout_v2/shared/constants/flyout_history';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../../flyout_v2/shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../flyout_v2/shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../../flyout_v2/document/main/document_flyout_wrapper';
import { DiscoverCellActions } from '../cell_actions';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { useKibana } from '../../common/lib/kibana';

export interface AttackFlyoutOverviewTabProps {
  /**
   * The document record that will be used to render the attack overview tab.
   */
  hit: DataTableRecord;
  /**
   * A promise that resolves to the services required to render the attack overview tab.
   */
  servicesPromise: Promise<StartServices>;
  /**
   * A promise that resolves to a Security Solution redux store for flyout rendering.
   */
  storePromise: Promise<SecurityAppStore>;
  /**
   * Callback invoked after alert mutations to refresh the Discover table.
   */
  onAlertUpdated: () => void;
  /**
   * Current Discover columns shown in the doc viewer.
   */
  columns?: DocViewRenderProps['columns'];
  /**
   * Discover filter callback used by flyout cell actions.
   */
  filter?: DocViewRenderProps['filter'];
  /**
   * Callback used to add a column to the Discover table.
   */
  onAddColumn?: DocViewRenderProps['onAddColumn'];
  /**
   * Callback used to remove a column from the Discover table.
   */
  onRemoveColumn?: DocViewRenderProps['onRemoveColumn'];
}

export const AttackFlyoutOverviewTab = ({
  hit,
  servicesPromise,
  storePromise,
  onAlertUpdated,
  columns,
  filter,
  onAddColumn,
  onRemoveColumn,
}: AttackFlyoutOverviewTabProps) => {
  const [services, setServices] = useState<StartServices | null>(null);
  const [store, setStore] = useState<SecurityAppStore | null>(null);

  const renderCellActions = useCallback<CellActionRenderer>(
    (props) => (
      <DiscoverCellActions
        {...props}
        columns={columns}
        filter={filter}
        onAddColumn={onAddColumn}
        onRemoveColumn={onRemoveColumn}
      />
    ),
    [columns, filter, onAddColumn, onRemoveColumn]
  );

  useEffect(() => {
    let isCanceled = false;

    Promise.all([servicesPromise, storePromise])
      .then(([resolvedServices, resolvedStore]) => {
        if (isCanceled) {
          return;
        }

        setServices(resolvedServices);
        setStore(resolvedStore);
      })
      .catch(() => {
        if (!isCanceled) {
          setServices(null);
          setStore(null);
        }
      });

    return () => {
      isCanceled = true;
    };
  }, [servicesPromise, storePromise]);

  if (!services || !store) {
    return null;
  }

  return flyoutProviders({
    services,
    store,
    children: (
      <AttackFlyoutOverviewTabContent
        hit={hit}
        onAlertUpdated={onAlertUpdated}
        renderCellActions={renderCellActions}
      />
    ),
  });
};

interface AttackFlyoutOverviewTabContentProps {
  hit: DataTableRecord;
  onAlertUpdated: () => void;
  renderCellActions: CellActionRenderer;
}

const AttackFlyoutOverviewTabContent = ({
  hit,
  onAlertUpdated,
  renderCellActions,
}: AttackFlyoutOverviewTabContentProps) => {
  const { services } = useKibana();
  const store = useStore();
  const history = useHistory();
  const isInSecurityApp = useIsInSecurityApp();
  const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
  const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

  const onShowAlert = useCallback(
    (id: string, indexName: string) =>
      services.overlays?.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <DocumentFlyoutWrapper
              documentId={id}
              indexName={indexName}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          ),
        }),
        {
          ...defaultDocumentFlyoutProperties,
          session: 'inherit',
        }
      ),
    [defaultDocumentFlyoutProperties, history, onAlertUpdated, renderCellActions, services, store]
  );

  const openAttackTool = useCallback(
    (children: ReactNode) => {
      services.overlays?.openSystemFlyout(flyoutProviders({ services, store, history, children }), {
        ...defaultToolsFlyoutProperties,
        historyKey,
        session: 'start',
      });
    },
    [history, historyKey, services, store]
  );

  const onShowAttackEntities = useCallback(
    () => openAttackTool(<AttackEntities hit={hit} />),
    [hit, openAttackTool]
  );

  const onShowAttackCorrelations = useCallback(
    () => openAttackTool(<AttackCorrelations hit={hit} onShowAlert={onShowAlert} />),
    [hit, onShowAlert, openAttackTool]
  );

  return (
    <div data-test-subj="discover-attack-flyout-overview-tab">
      <EuiSpacer size="m" />
      <OverviewTab
        hit={hit}
        onShowAttackEntities={onShowAttackEntities}
        onShowAttackCorrelations={onShowAttackCorrelations}
      />
    </div>
  );
};
