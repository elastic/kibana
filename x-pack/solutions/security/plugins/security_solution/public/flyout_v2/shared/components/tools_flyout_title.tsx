/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
<<<<<<< HEAD
import React, { memo } from 'react';
import { EuiButtonEmpty, EuiIcon, useEuiTheme } from '@elastic/eui';
import { TOOLS_FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

export interface ToolsFlyoutTitleProps {
  /**
   * Callback invoked when the title is clicked.
   */
  onTitleClick: () => void;
  /**
   * Text label displayed in the title.
   */
  label: string;
  /**
   * EUI icon type rendered next to the label.
   */
  iconType: string;
}

/**
 * Clickable title used in tools flyout headers. Renders an expand icon followed by a
 * context icon and label. Clicking opens the originating document or entity flyout.
 */
export const ToolsFlyoutTitle: FC<ToolsFlyoutTitleProps> = memo(
  ({ onTitleClick, label, iconType }) => {
    const { euiTheme } = useEuiTheme();

    return (
      <EuiButtonEmpty
        onClick={onTitleClick}
        iconType="expand"
        size="xs"
=======
import React, { memo, useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { EventKind } from '../../document/constants/event_kinds';
import { getDocumentTitle } from '../../document/utils/get_header_title';
import { useKibana } from '../../../common/lib/kibana';
import type { CellActionRenderer } from './cell_actions';
import { noopCellActionRenderer } from './cell_actions';
import { flyoutProviders } from './flyout_provider';
import { DocumentFlyout } from '../../document';
import { useDefaultDocumentFlyoutProperties } from '../hooks/use_default_flyout_properties';
import { TOOLS_FLYOUT_HEADER_TITLE_TEST_ID } from './test_ids';

const noop = () => {};

export interface ToolsFlyoutTitleProps {
  /**
   * The document to display
   */
  hit: DataTableRecord;
  /**
   * Optional cell action renderer passed to the document flyout.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Optional callback invoked after alert mutations in the document flyout.
   */
  onAlertUpdated?: () => void;
}

/**
 * Clickable title used in tools flyout headers. Renders an expand icon followed by the
 * document type icon and title. Clicking any part of the component opens the document flyout.
 */
export const ToolsFlyoutTitle: FC<ToolsFlyoutTitleProps> = memo(
  ({ hit, renderCellActions = noopCellActionRenderer, onAlertUpdated = noop }) => {
    const { euiTheme } = useEuiTheme();
    const { services } = useKibana();
    const store = useStore();
    const history = useHistory();
    const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();

    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const title = useMemo(() => getDocumentTitle(hit), [hit]);
    const iconType = isAlert ? 'warning' : 'analyzeEvent';

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
      <EuiButtonEmpty
        onClick={onShowDocument}
        iconType="expand"
        size="s"
>>>>>>> 9.4
        flush="left"
        data-test-subj={TOOLS_FLYOUT_HEADER_TITLE_TEST_ID}
      >
        <EuiIcon
          type={iconType}
          size="m"
          aria-hidden={true}
          css={{ marginRight: euiTheme.size.xs }}
        />
<<<<<<< HEAD
        {label}
=======
        {title}
>>>>>>> 9.4
      </EuiButtonEmpty>
    );
  }
);

ToolsFlyoutTitle.displayName = 'ToolsFlyoutTitle';
