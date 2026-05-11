/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { ToolsFlyoutHeader } from '../shared/components/tools_flyout_header';
import { CorrelationsDetailsView } from './components/correlations_details_view';
import { useKibana } from '../../common/lib/kibana';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { flyoutProviders } from '../shared/components/flyout_provider';
import { DocumentFlyoutWrapper } from '../document/document_flyout_wrapper';
import { useDefaultDocumentFlyoutProperties } from '../shared/hooks/use_default_flyout_properties';
import { useFlyoutNavTitle } from '../shared/hooks/use_flyout_nav_title';
import { CORRELATIONS_TITLE } from '../shared/constants/flyout_titles';
import { getAlertHistoryTitle } from '../document/utils/get_header_title';

export interface CorrelationsDetailsProps {
  /**
   * Alert/event document
   */
  hit: DataTableRecord;
  /**
   * Scope ID for the document
   */
  scopeId: string;
  /**
   * Whether the document is being displayed in a rule preview
   */
  isRulePreview: boolean;
  /**
   * Renderer used by the document flyout for field cell actions.
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh parent flyout content.
   */
  onAlertUpdated: () => void;
  /**
   * Callback to open an attack preview when clicking the expand button in the related attacks table.
   * When not provided, the expand button column is hidden.
   * // TODO make required once we have an attack flyout in the new flyout system
   */
  onShowAttack?: (id: string, indexName: string) => void;
}

/**
 * Displays the full correlations details for a given alert/event document.
 * This component is meant to be used in a tools flyout, with the new EUI flyout system.
 */
export const CorrelationsDetails = memo(
  ({
    hit,
    scopeId,
    isRulePreview,
    renderCellActions,
    onAlertUpdated,
    onShowAttack,
  }: CorrelationsDetailsProps) => {
    const { euiTheme } = useEuiTheme();
    const { services } = useKibana();
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
    const buildChildFlyoutTitle = useFlyoutNavTitle();

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
            ...defaultFlyoutProperties,
            session: 'inherit',
            title: buildChildFlyoutTitle(getAlertHistoryTitle()),
          }
        ),
      [
        buildChildFlyoutTitle,
        defaultFlyoutProperties,
        renderCellActions,
        history,
        onAlertUpdated,
        overlays,
        services,
        store,
      ]
    );

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <ToolsFlyoutHeader hit={hit} title={CORRELATIONS_TITLE} />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <CorrelationsDetailsView
            hit={hit}
            scopeId={scopeId}
            isRulePreview={isRulePreview}
            onShowAlert={onShowAlert}
            onShowAttack={onShowAttack}
            useLegacyExpandableFlyout={false}
          />
        </EuiFlyoutBody>
      </>
    );
  }
);

CorrelationsDetails.displayName = 'CorrelationsDetails';
