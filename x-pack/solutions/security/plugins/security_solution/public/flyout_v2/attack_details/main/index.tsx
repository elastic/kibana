/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader, EuiPanel } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import type { AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import type { BrowserFields, TimelineEventsDetailsItem } from '@kbn/timelines-plugin/common';
import { RemoteDocumentCallout } from '../../document/main/components/remote_document_callout';
import { FlyoutError } from '../../shared/components/flyout_error';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { ATTACK_DETAILS_FLYOUT_TEST_ID } from './constants/test_ids';
import { Content } from './content';
import { Footer } from './footer';
import { Header } from './header';
import { useAttackDetails } from './hooks/use_attack_details';
import { useTabs } from './hooks/use_tabs';
import { useKibana } from '../../../common/lib/kibana';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import {
  defaultToolsFlyoutProperties,
  useDefaultDocumentFlyoutProperties,
} from '../../shared/hooks/use_default_flyout_properties';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../../document/main/document_flyout_wrapper';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { AttackEntities } from '../tools/entities';
import { AttackCorrelations } from '../tools/correlations';

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
   * Callback invoked after alert mutations. Used both as the
   * `onAlertUpdated` hand threaded to {@link DocumentFlyoutWrapper} when
   * previewing a related alert from the attack-correlations child flyout,
   * and as the `refresh` source for {@link useAttackDetails} when the
   * hook skips its own fetch because `hit.raw._source` is already
   * populated (V1 path).
   */
  onAlertUpdated: () => void;
  /**
   * Optional override for the entities chevron link in the header. When
   * provided, the v2 flyout calls this instead of opening the v2
   * {@link AttackEntities} sub-flyout. Used by the legacy thin wrapper
   * (`flyout/attack_details/`) to navigate to the legacy left panel via
   * `openLeftPanel(...)` instead.
   */
  onShowAttackEntities?: () => void;
  /**
   * Optional override for the correlations chevron link in the header.
   * When provided, the v2 flyout calls this instead of opening the v2
   * {@link AttackCorrelations} sub-flyout. Used by the legacy thin wrapper
   * (`flyout/attack_details/`) to navigate to the legacy left panel via
   * `openLeftPanel(...)` instead.
   */
  onShowAttackCorrelations?: () => void;
  /**
   * When `true`, the rendered `EuiFlyoutHeader` / `EuiFlyoutBody` /
   * `EuiFlyoutFooter` content is wrapped in an inner `EuiPanel
   * hasShadow={false} color="transparent"` to provide the recommended 16px
   * padding. Use this when {@link AttackDetails} is rendered inside a flyout
   * whose `paddingSize` is `'none'` (e.g. the legacy expandable-flyout
   * surface in `flyout/attack_details/`). The default (no padding wrapper)
   * is correct when the parent flyout itself sets `paddingSize: 'm'` (e.g.
   * the v2 system flyout used by Discover via
   * {@link useDefaultDocumentFlyoutProperties}).
   */
  padded?: boolean;
}

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
 *
 * Data flow: this component owns the single call to {@link useAttackDetails}
 * (which subscribes to a `useTimelineEventsDetails` data fetch). The resolved
 * data is prop-drilled into the header / footer / tabs subtree so that the
 * subtree does not need to read a shared React context and does not duplicate
 * the data fetch.
 */
export const AttackDetails: FC<AttackDetailsProps> = memo(
  ({
    hit,
    onShowNotes,
    renderCellActions,
    onAlertUpdated,
    onShowAttackEntities: onShowAttackEntitiesOverride,
    onShowAttackCorrelations: onShowAttackCorrelationsOverride,
    padded = false,
  }) => {
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isInSecurityApp = useIsInSecurityApp();
    const historyKey = isInSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
    const defaultDocumentFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const { attack, browserFields, dataFormattedForFieldBrowser, loading, refetch } =
      useAttackDetails(hit, { refresh: onAlertUpdated });

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

    const openAttackTool = useCallback(
      (children: ReactNode) => {
        overlays.openSystemFlyout(flyoutProviders({ services, store, history, children }), {
          ...defaultToolsFlyoutProperties,
          historyKey,
          session: 'start',
        });
      },
      [history, historyKey, overlays, services, store]
    );

    const onShowAttackEntitiesDefault = useCallback(
      () => openAttackTool(<AttackEntities hit={hit} />),
      [hit, openAttackTool]
    );

    const onShowAttackCorrelationsDefault = useCallback(
      () => openAttackTool(<AttackCorrelations hit={hit} onShowAlert={onShowAlert} />),
      [hit, onShowAlert, openAttackTool]
    );

    const onShowAttackEntities = onShowAttackEntitiesOverride ?? onShowAttackEntitiesDefault;
    const onShowAttackCorrelations =
      onShowAttackCorrelationsOverride ?? onShowAttackCorrelationsDefault;

    if (loading) {
      return <FlyoutLoading />;
    }

    if (!attack || !dataFormattedForFieldBrowser) {
      return <FlyoutError />;
    }

    return (
      <>
        <RemoteDocumentCallout hit={hit} />
        <AttackDetailsInner
          hit={hit}
          attack={attack}
          browserFields={browserFields}
          dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
          refetch={refetch}
          onShowNotes={onShowNotes}
          onShowAttackEntities={onShowAttackEntities}
          onShowAttackCorrelations={onShowAttackCorrelations}
          padded={padded}
        />
      </>
    );
  }
);

AttackDetails.displayName = 'AttackDetails';

interface AttackDetailsInnerProps {
  hit: DataTableRecord;
  attack: AttackDiscoveryAlert;
  browserFields: BrowserFields;
  dataFormattedForFieldBrowser: TimelineEventsDetailsItem[];
  refetch: () => Promise<void>;
  onShowNotes: () => void;
  onShowAttackEntities: () => void;
  onShowAttackCorrelations: () => void;
  padded: boolean;
}

/**
 * When the parent flyout uses `paddingSize: 'none'` (the legacy
 * expandable-flyout surface), {@link EuiFlyoutHeader} / {@link EuiFlyoutBody}
 * / {@link EuiFlyoutFooter} render their content flush against the panel
 * edge. Wrapping the section content in a transparent {@link EuiPanel}
 * restores the recommended 16px padding without affecting v2 surfaces, which
 * already get padding from `paddingSize: 'm'` on their system flyout.
 */
const PaddedSection: FC<{ children: ReactNode }> = ({ children }) => (
  <EuiPanel hasShadow={false} color="transparent">
    {children}
  </EuiPanel>
);

const AttackDetailsInner: FC<AttackDetailsInnerProps> = memo(
  ({
    hit,
    attack,
    browserFields,
    dataFormattedForFieldBrowser,
    refetch,
    onShowNotes,
    onShowAttackEntities,
    onShowAttackCorrelations,
    padded,
  }) => {
    const { tabsDisplayed, selectedTabId, setSelectedTabId } = useTabs({
      hit,
      attack,
      browserFields,
      dataFormattedForFieldBrowser,
      onShowAttackEntities,
      onShowAttackCorrelations,
    });

    const SectionWrapper = padded ? PaddedSection : React.Fragment;

    return (
      <>
        <EuiFlyoutHeader hasBorder data-test-subj={ATTACK_DETAILS_FLYOUT_TEST_ID}>
          <SectionWrapper>
            <Header
              hit={hit}
              browserFields={browserFields}
              dataFormattedForFieldBrowser={dataFormattedForFieldBrowser}
              refetch={refetch}
              selectedTabId={selectedTabId}
              setSelectedTabId={setSelectedTabId}
              tabs={tabsDisplayed}
              onShowNotes={onShowNotes}
            />
          </SectionWrapper>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SectionWrapper>
            <Content tabs={tabsDisplayed} selectedTabId={selectedTabId} />
          </SectionWrapper>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <SectionWrapper>
            <Footer hit={hit} attack={attack} refetch={refetch} />
          </SectionWrapper>
        </EuiFlyoutFooter>
      </>
    );
  }
);

AttackDetailsInner.displayName = 'AttackDetailsInner';
