/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { css } from '@emotion/react';
import { EuiFlyoutBody, EuiFlyoutHeader, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { DocumentToolsFlyoutHeader } from '../../../shared/components/document_tools_flyout_header';
import { CorrelationsDetailsView } from './components/correlations_details_view';
import { CORRELATIONS_TITLE } from '../../../shared/constants/flyout_titles';

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
   * Callback to open an alert preview when clicking the preview button in the correlations table
   */
  onShowAlert: (id: string, indexName: string, title?: string) => void;
  /**
   * Callback to open an attack preview when clicking the expand button in the related attacks table.
   * When not provided, the expand button column is hidden.
   */
  onShowAttack?: (id: string, indexName: string, title?: string) => void;
}

/**
 * Displays the full correlations details for a given alert/event document.
 * This component is meant to be used in a tools flyout, with the new EUI flyout system.
 */
export const CorrelationsDetails = memo(
  ({ hit, scopeId, isRulePreview, onShowAlert, onShowAttack }: CorrelationsDetailsProps) => {
    const { euiTheme } = useEuiTheme();

    return (
      <>
        <EuiFlyoutHeader
          hasBorder
          css={css`
            padding-block: ${euiTheme.size.s} !important;
          `}
        >
          <DocumentToolsFlyoutHeader title={CORRELATIONS_TITLE} hit={hit} />
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
