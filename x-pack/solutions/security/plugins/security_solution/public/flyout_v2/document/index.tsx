/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiPanel } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import type { ResolverCellActionRenderer } from '../../resolver/types';
import { DocumentHeader } from './header';
import { OverviewTab } from './tabs/overview_tab';

export interface DocumentFlyoutProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Cell action renderer for the analyzer
   */
  renderCellActions: ResolverCellActionRenderer;
}

/**
 * Content for the document flyout, combining the header and overview tab.
 */
export const DocumentFlyout: FC<DocumentFlyoutProps> = memo(
  ({ hit, renderCellActions }) => {
    return (
      <>
        <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m" grow={false}>
          <DocumentHeader hit={hit} />
        </EuiPanel>
        <OverviewTab hit={hit} renderCellActions={renderCellActions} />
      </>
    );
  }
);

DocumentFlyout.displayName = 'DocumentFlyout';
