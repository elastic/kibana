/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { Timestamp } from '../../document/components/timestamp';
import { DocumentSeverity } from '../../document/components/severity';
import type { CellActionRenderer } from './cell_actions';
import { noopCellActionRenderer } from './cell_actions';
import { ToolsFlyoutTitle } from './tools_flyout_title';
import { TOOLS_FLYOUT_HEADER_TEST_ID } from './test_ids';

const noop = () => {};

export interface ToolsFlyoutHeaderProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Title for the tools flyout (e.g. "Correlations", "Analyzer", "Session view")
   */
  title: ReactNode;
  /**
   * Optional cell action renderer passed to the child document flyout.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Optional callback invoked after alert mutations in the child document flyout.
   */
  onAlertUpdated?: () => void;
}

/**
 * Shared header for all tools flyouts. Renders the tool title on the left and document
 * context (expand button, rule name, severity, timestamp) on the right.
 */
export const ToolsFlyoutHeader: FC<ToolsFlyoutHeaderProps> = memo(
  ({ hit, title, renderCellActions = noopCellActionRenderer, onAlertUpdated = noop }) => {
    return (
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="m"
        responsive={false}
        data-test-subj={TOOLS_FLYOUT_HEADER_TEST_ID}
      >
        <EuiFlexItem grow={false}>
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="flexEnd" direction="column" gutterSize="none">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <ToolsFlyoutTitle
                    hit={hit}
                    renderCellActions={renderCellActions}
                    onAlertUpdated={onAlertUpdated}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <DocumentSeverity hit={hit} />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem>
              <Timestamp hit={hit} size="xs" />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ToolsFlyoutHeader.displayName = 'ToolsFlyoutHeader';
