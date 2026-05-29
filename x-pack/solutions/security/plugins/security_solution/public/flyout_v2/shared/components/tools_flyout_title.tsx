/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiButtonEmpty, EuiIcon, useEuiTheme } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { EventKind } from '../../document/main/constants/event_kinds';
import { getDocumentTitle } from '../../document/main/utils/get_header_title';
import { useKibana } from '../../../common/lib/kibana';
import type { CellActionRenderer } from './cell_actions';
import { noopCellActionRenderer } from './cell_actions';
import { flyoutProviders } from './flyout_provider';
import { DocumentFlyout } from '../../document/main';
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
        size="xs"
        flush="left"
        data-test-subj={TOOLS_FLYOUT_HEADER_TITLE_TEST_ID}
      >
        <EuiIcon
          type={iconType}
          size="m"
          aria-hidden={true}
          css={{ marginRight: euiTheme.size.xs }}
        />
        {title}
      </EuiButtonEmpty>
    );
  }
);

ToolsFlyoutTitle.displayName = 'ToolsFlyoutTitle';
