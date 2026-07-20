/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux-v7';
import { noop } from 'lodash/fp';
import { EventKind } from '../../document/main/constants/event_kinds';
import {
  getDocumentHistoryTitle,
  getDocumentTitle,
} from '../../document/main/utils/get_header_title';
import { useKibana } from '../../../common/lib/kibana';
import type { CellActionRenderer } from '../components/cell_actions';
import { noopCellActionRenderer } from '../components/cell_actions';
import { flyoutProviders } from '../components/flyout_provider';
import { DocumentFlyout } from '../../document/main';
import { useDefaultDocumentFlyoutProperties } from './use_default_flyout_properties';
import { buildFlyoutNavTitle } from '../utils/build_flyout_nav_title';
import { DocumentSeverity } from '../../document/main/components/severity';
import { Timestamp } from '../components/timestamp';
import { FlyoutSessionContextProvider, useFlyoutSessionContext } from '../../session_context';

export interface UseDocumentFlyoutTitleOptions {
  /** The source document to derive display values from. */
  hit: DataTableRecord;
  /** Cell action renderer forwarded to the child document flyout. */
  renderCellActions?: CellActionRenderer;
  /** Callback invoked after alert mutations in the child document flyout. */
  onAlertUpdated?: () => void;
}

export interface DocumentFlyoutTitleResult {
  /** Document title derived from the hit. */
  label: string;
  /** Icon type: `'warning'` for alerts, `'analyzeEvent'` for other documents. */
  iconType: string;
  /** Opens the source document as a child flyout. */
  onTitleClick: () => void;
  /** Severity badge for the document. */
  badge: React.ReactNode;
  /** Formatted timestamp for the document. */
  timestamp: React.ReactNode;
}

/**
 * Derives all `ToolsFlyoutHeader` display values from a source document hit.
 */
export const useDocumentFlyoutTitle = ({
  hit,
  renderCellActions = noopCellActionRenderer,
  onAlertUpdated = noop,
}: UseDocumentFlyoutTitleOptions): DocumentFlyoutTitleResult => {
  const { services } = useKibana();
  const store = useStore();
  const history = useHistory();
  const defaultFlyoutProperties = useDefaultDocumentFlyoutProperties();
  const { historyKey } = useFlyoutSessionContext();

  const isAlert = useMemo(
    () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
    [hit]
  );

  const label = useMemo(() => getDocumentTitle(hit), [hit]);
  const sessionTitle = useMemo(() => getDocumentHistoryTitle(hit), [hit]);
  const iconType = isAlert ? 'warning' : 'analyzeEvent';

  const onTitleClick = useCallback(() => {
    services.overlays?.openSystemFlyout(
      flyoutProviders({
        services,
        store,
        history,
        children: (
          <FlyoutSessionContextProvider value={{ session: 'inherit', historyKey }}>
            <DocumentFlyout
              hit={hit}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          </FlyoutSessionContextProvider>
        ),
      }),
      {
        ...defaultFlyoutProperties,
        historyKey,
        session: 'inherit',
        title: buildFlyoutNavTitle(sessionTitle),
      }
    );
  }, [
    defaultFlyoutProperties,
    history,
    historyKey,
    hit,
    onAlertUpdated,
    renderCellActions,
    services,
    sessionTitle,
    store,
  ]);

  const badge = <DocumentSeverity hit={hit} />;
  const timestamp = <Timestamp hit={hit} size="xs" />;

  return { label, iconType, onTitleClick, badge, timestamp };
};
