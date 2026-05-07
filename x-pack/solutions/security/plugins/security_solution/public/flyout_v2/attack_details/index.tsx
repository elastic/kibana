/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { RemoteDocumentCallout } from '../document/components/remote_document_callout';
import { ATTACK_DETAILS_FLYOUT_TEST_ID } from './constants/test_ids';
import { AttackDetailsProvider } from './context';
import { Content } from './content';
import { Footer } from './footer';
import { Header } from './header';
import { useTabs } from './hooks/use_tabs';
import { useKibana } from '../../common/lib/kibana';
import { useIsInSecurityApp } from '../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../shared/constants/flyout_history';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../document/document_flyout_wrapper';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { AttackEntities } from './attack_entities';
import { AttackCorrelations } from './attack_correlations';

export interface AttackDetailsProps {
  /**
   * The document hit corresponding to the attack-discovery alert opened in
   * the v2 document flyout.
   */
  hit: DataTableRecord;
  /**
   * Callback fired when the user opens the notes sub-flyout from the header.
   * Wired to the same `overlays.openSystemFlyout(<NotesDetails/>)` flow used
   * by the regular document flyout.
   */
  onShowNotes: () => void;
  /**
   * Cell action renderer threaded through to the alert preview opened from
   * the attack-correlations child flyout's related-alerts table. Mirrors
   * the `renderCellActions` prop on `DocumentFlyout` so the previewed alert
   * gets the same field-level actions Discover provides for the parent
   * attack-discovery hit.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh related flyouts.
   * Threaded to {@link DocumentFlyoutWrapper} when previewing a related
   * alert from the attack-correlations child flyout.
   */
  onAlertUpdated: () => void;
}

const AttackDetailsInner: FC<{
  onShowNotes: () => void;
  onShowAttackEntities: () => void;
  onShowAttackCorrelations: () => void;
}> = memo(({ onShowNotes, onShowAttackEntities, onShowAttackCorrelations }) => {
  const { tabsDisplayed, selectedTabId, setSelectedTabId } = useTabs({
    onShowAttackEntities,
    onShowAttackCorrelations,
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder data-test-subj={ATTACK_DETAILS_FLYOUT_TEST_ID}>
        <Header
          selectedTabId={selectedTabId}
          setSelectedTabId={setSelectedTabId}
          tabs={tabsDisplayed}
          onShowNotes={onShowNotes}
        />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <Content tabs={tabsDisplayed} selectedTabId={selectedTabId} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <Footer />
      </EuiFlyoutFooter>
    </>
  );
});

AttackDetailsInner.displayName = 'AttackDetailsInner';

/**
 * v2 attack details flyout content. Rendered inside the v2 document flyout
 * surface when the document hit is detected as an attack-discovery alert.
 *
 * The legacy expandable-flyout exposed three panels (right / left / preview);
 * this v2 surface implements the right panel plus two attack-specific child
 * flyouts (Entities and Correlations) that ported the legacy left-panel
 * Insights sub-tabs as discrete sibling flyouts opened via
 * `overlays.openSystemFlyout`. The header notes link reuses the parent
 * `DocumentFlyout`'s `onShowNotes` callback.
 */
export const AttackDetails: FC<AttackDetailsProps> = memo(
  ({ hit, onShowNotes, renderCellActions, onAlertUpdated }) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
    const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const onShowAlert = useCallback(
      (id: string, indexName: string) =>
        overlays.openSystemFlyout(
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
      [
        defaultDocumentFlyoutProperties,
        history,
        onAlertUpdated,
        overlays,
        renderCellActions,
        services,
        store,
      ]
    );

    const onShowAttackEntities = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <AttackEntities hit={hit} />,
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
        }
      );
    }, [history, historyKey, hit, overlays, services, store]);

    const onShowAttackCorrelations = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <AttackCorrelations hit={hit} onShowAlert={onShowAlert} />,
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
        }
      );
    }, [history, historyKey, hit, onShowAlert, overlays, services, store]);

    return (
      <>
        <RemoteDocumentCallout hit={hit} />
        <AttackDetailsProvider hit={hit}>
          <AttackDetailsInner
            onShowNotes={onShowNotes}
            onShowAttackEntities={onShowAttackEntities}
            onShowAttackCorrelations={onShowAttackCorrelations}
          />
        </AttackDetailsProvider>
      </>
    );
  }
);

AttackDetails.displayName = 'AttackDetails';
