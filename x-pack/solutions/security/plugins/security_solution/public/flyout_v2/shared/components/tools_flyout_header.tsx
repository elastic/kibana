/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, ReactNode } from 'react';
import React, { memo, useCallback } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataTableRecord } from '@kbn/discover-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { Timestamp } from '../../document/components/timestamp';
import { Title } from '../../document/components/title';
import { DocumentSeverity } from '../../document/components/severity';
import { useKibana } from '../../../common/lib/kibana';
import type { CellActionRenderer } from './cell_actions';
import { noopCellActionRenderer } from './cell_actions';
import { flyoutProviders } from './flyout_provider';
import { DocumentFlyout } from '../../document';
import { useDefaultDocumentFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { TOOLS_FLYOUT_HEADER_EXPAND_BUTTON_TEST_ID, TOOLS_FLYOUT_HEADER_TEST_ID } from './test_ids';

const noop = () => {};

const EXPAND_BUTTON_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.toolsFlyoutHeader.expandButtonAriaLabel',
  { defaultMessage: 'Open document details' }
);

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
    const { services } = useKibana();
    const store = useStore();
    const history = useHistory();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const onShowDocument = useCallback(() => {
      services.overlays?.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: (
            <DocumentFlyout
              hit={hit}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          ),
        }),
        { ...defaultFlyoutProperties, session: 'inherit' }
      );
    }, [defaultFlyoutProperties, history, hit, onAlertUpdated, renderCellActions, services, store]);

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
          <EuiFlexGroup alignItems="flexEnd" direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap={false}>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="expand"
                    onClick={onShowDocument}
                    aria-label={EXPAND_BUTTON_ARIA_LABEL}
                    size="xs"
                    color="primary"
                    data-test-subj={TOOLS_FLYOUT_HEADER_EXPAND_BUTTON_TEST_ID}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <Title hit={hit} isCompact={true} />
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
      </EuiFlexGroup>
    );
  }
);

ToolsFlyoutHeader.displayName = 'ToolsFlyoutHeader';
