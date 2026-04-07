/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlyoutBody, EuiFlyoutFooter, EuiFlyoutHeader } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import type { CellActionRenderer } from '../shared/components/cell_actions';
import { useAlertsPrivileges } from '../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FlyoutLoading } from '../../flyout/shared/components/flyout_loading';
import { FlyoutMissingAlertsPrivilege } from './components/flyout_missing_alerts_privilege';
import { EventKind } from './constants/event_kinds';
import { Footer } from './footer';
import { Header } from './header';
import { OverviewTab } from './tabs/overview_tab';
import { NotesDetails } from '../notes';
import { useKibana } from '../../common/lib/kibana';
import { flyoutProviders } from '../shared/components/flyout_provider';

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
 */
export const DocumentFlyout = memo(
  ({ hit, onAlertUpdated, renderCellActions }: DocumentFlyoutProps) => {
    const { services } = useKibana();
    const store = useStore();
    const history = useHistory();
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );

    const { hasAlertsRead, loading } = useAlertsPrivileges();
    const missingAlertsPrivilege = !loading && !hasAlertsRead && isAlert;

    const onShowNotes = useCallback(() => {
      services.overlays?.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <NotesDetails hit={hit} />,
        }),
        {
          ownFocus: false,
          resizable: true,
          size: 'm',
          type: 'overlay',
        }
      );
    }, [history, hit, services, store]);

    if (isAlert && loading) {
      return <FlyoutLoading data-test-subj="document-overview-loading" />;
    }

    if (missingAlertsPrivilege) {
      return <FlyoutMissingAlertsPrivilege />;
    }

    return (
      <>
        <EuiFlyoutHeader>
          <Header
            hit={hit}
            renderCellActions={renderCellActions}
            onAlertUpdated={onAlertUpdated}
            onShowNotes={onShowNotes}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <OverviewTab
            hit={hit}
            renderCellActions={renderCellActions}
            onAlertUpdated={onAlertUpdated}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <Footer hit={hit} onAlertUpdated={onAlertUpdated} onShowNotes={onShowNotes} />
        </EuiFlyoutFooter>
      </>
    );
  }
);

DocumentFlyout.displayName = 'DocumentFlyout';
