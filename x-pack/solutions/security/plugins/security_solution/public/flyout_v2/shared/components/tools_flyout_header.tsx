/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
<<<<<<< HEAD
import { ToolsFlyoutTitle } from './tools_flyout_title';
import { TOOLS_FLYOUT_HEADER_TEST_ID } from './test_ids';

=======
import type { DataTableRecord } from '@kbn/discover-utils';
import { Timestamp } from '../../document/components/timestamp';
import { DocumentSeverity } from '../../document/components/severity';
import type { CellActionRenderer } from './cell_actions';
import { noopCellActionRenderer } from './cell_actions';
import { ToolsFlyoutTitle } from './tools_flyout_title';
import { TOOLS_FLYOUT_HEADER_TEST_ID } from './test_ids';

const noop = () => {};

>>>>>>> 9.4
export interface ToolsFlyoutHeaderProps {
  /**
   * Title for the tools flyout (e.g. "Correlations", "Risk score", "Insights").
   */
  title: ReactNode;
  /**
   * Called when the context title button is clicked. Should open the originating
   * document or entity flyout as a child via `overlays.openSystemFlyout` with
   * `session: 'inherit'`.
   */
  onTitleClick?: () => void;
  /**
   * Label shown in the context title button (e.g. rule name or entity name).
   */
  label?: string;
  /**
   * EUI icon type shown next to the label.
   */
  iconType?: string;
  /**
   * Optional badge rendered alongside the title button (e.g. severity badge for documents).
   */
  badge?: ReactNode;
  /**
   * Optional metadata rendered below the title row (e.g. timestamp for documents).
   */
  timestamp?: ReactNode;
}

/**
 * Shared header for all tools flyouts. Renders the tool title on the left and optional
 * source context on the right (expand button, label, badge, timestamp).
 */
export const ToolsFlyoutHeader: FC<ToolsFlyoutHeaderProps> = memo(
<<<<<<< HEAD
  ({ title, onTitleClick, label, iconType, badge, timestamp }) => {
    const showSourceContext = !!onTitleClick && !!label && !!iconType;

=======
  ({ hit, title, renderCellActions = noopCellActionRenderer, onAlertUpdated = noop }) => {
>>>>>>> 9.4
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
<<<<<<< HEAD
        {showSourceContext && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="flexEnd" direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
                  <EuiFlexItem grow={false}>
                    <ToolsFlyoutTitle
                      onTitleClick={onTitleClick}
                      label={label}
                      iconType={iconType}
                    />
                  </EuiFlexItem>
                  {badge && <EuiFlexItem grow={false}>{badge}</EuiFlexItem>}
                </EuiFlexGroup>
              </EuiFlexItem>
              {timestamp && <EuiFlexItem>{timestamp}</EuiFlexItem>}
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
=======
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
              <Timestamp hit={hit} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
>>>>>>> 9.4
      </EuiFlexGroup>
    );
  }
);

ToolsFlyoutHeader.displayName = 'ToolsFlyoutHeader';
