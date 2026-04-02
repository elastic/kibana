/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlyoutBody, EuiFlyoutHeader } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { Header } from './header';
import { OverviewTab } from './tabs/overview_tab';

export interface DocumentFlyoutProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Cell action renderer for the analyzer
   */
  renderCellActions: CellActionRenderer;
  /**
   * Callback invoked after alert mutations to refresh related flyouts.
   */
  onAlertUpdated: () => void;
}

/**
 * Content for the document flyout, combining the header and overview tab.
 * Alert privilege checks are handled by DocumentFlyoutWrapper before this renders.
 */
export const DocumentFlyout = memo(
  ({ hit, renderCellActions, onAlertUpdated }: DocumentFlyoutProps) => (
    <>
      <EuiFlyoutHeader>
        <Header hit={hit} renderCellActions={renderCellActions} onAlertUpdated={onAlertUpdated} />
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <OverviewTab
          hit={hit}
          renderCellActions={renderCellActions}
          onAlertUpdated={onAlertUpdated}
        />
      </EuiFlyoutBody>
    </>
  )
);

DocumentFlyout.displayName = 'DocumentFlyout';
