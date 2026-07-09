/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { EVENT_KIND } from '@kbn/rule-data-utils';
import { useHistory } from 'react-router-dom';
import { useStore } from 'react-redux';
import { DOC_VIEWER_FLYOUT_HISTORY_KEY } from '@kbn/unified-doc-viewer';
import { defaultToolsFlyoutProperties } from '../../shared/hooks/use_default_flyout_properties';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { useAlertsPrivileges } from '../../../detections/containers/detection_engine/alerts/use_alerts_privileges';
import { FlyoutLoading } from '../../shared/components/flyout_loading';
import { FlyoutMissingAlertsPrivilege } from './components/flyout_missing_alerts_privilege';
import { EventKind } from './constants/event_kinds';
import { Footer } from './footer';
import { Header } from './header';
import { OverviewTab } from './tabs/overview_tab';
import { JsonTab } from './tabs/json_tab';
import { TableTab } from './tabs/table_tab';
import { FLYOUT_STORAGE_KEYS } from './constants/local_storage';
import { NotesDetails } from '../../shared/tools/notes';
import { useTabs } from '../../shared/hooks/use_tabs';
import { useKibana } from '../../../common/lib/kibana';
import { flyoutProviders } from '../../shared/components/flyout_provider';
import type { OpenFlyoutLinkProps } from '../../shared/components/open_flyout_link';
import { OpenFlyoutLink } from '../../shared/components/open_flyout_link';
import { useIsInSecurityApp } from '../../../common/hooks/is_in_security_app';
import { documentFlyoutHistoryKey } from '../../shared/constants/flyout_history';
import {
  HOST_NAME_FIELD_NAME,
  LEGACY_SIGNAL_RULE_NAME_FIELD_NAME,
  SIGNAL_RULE_NAME_FIELD_NAME,
} from '../../../timelines/components/timeline/body/renderers/constants';
import { RemoteDocumentCallout } from './components/remote_document_callout';

const footerStyles = css`
  @media (max-width: 767px) {
    overflow: auto;
  }
`;

const headerStyles = css`
  @media (max-width: 767px) {
    overflow: auto;
  }
`;

type DocumentFlyoutTabId = 'overview' | 'table' | 'json';

const VALID_TAB_IDS: DocumentFlyoutTabId[] = ['overview', 'table', 'json'];

export const OVERVIEW_TAB_TEST_ID = 'securitySolutionDocumentDetailsFlyoutOverviewTab';
export const TABLE_TAB_TEST_ID = 'securitySolutionDocumentDetailsFlyoutTableTab';
export const JSON_TAB_TEST_ID = 'securitySolutionDocumentDetailsFlyoutJsonTab';

const OVERVIEW_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.document.overviewTabLabel',
  {
    defaultMessage: 'Overview',
  }
);
const TABLE_TAB_LABEL = i18n.translate('xpack.securitySolution.flyout.document.tableTabLabel', {
  defaultMessage: 'Table',
});
const JSON_TAB_LABEL = i18n.translate('xpack.securitySolution.flyout.document.jsonTabLabel', {
  defaultMessage: 'JSON',
});

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
    const { overlays } = services;
    const store = useStore();
    const history = useHistory();
    const isAlert = useMemo(
      () => (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal,
      [hit]
    );
    const isSecurityApp = useIsInSecurityApp();
    const historyKey = isSecurityApp ? documentFlyoutHistoryKey : DOC_VIEWER_FLYOUT_HISTORY_KEY;
    const { hasAlertsRead, loading } = useAlertsPrivileges();
    const missingAlertsPrivilege = !loading && !hasAlertsRead && isAlert;

    // The Table and JSON tabs are only available in Security Solution, not in Discover.
    // The selected tab is persisted to localStorage, sharing the key with the legacy
    // document flyout so the user's preference carries across both implementations.
    const { selectedTabId, setSelectedTabId } = useTabs<DocumentFlyoutTabId>({
      validTabIds: VALID_TAB_IDS,
      storageKey: FLYOUT_STORAGE_KEYS.SELECTED_TAB,
    });

    // The rule flyout is keyed by the rule UUID, but the table/highlighted fields display the rule
    // name. We resolve the UUID from the document so a click on a rule name opens the right rule.
    const ruleId = useMemo(
      () =>
        (getFieldValue(hit, EVENT_KIND) as string) === EventKind.signal
          ? (getFieldValue(hit, 'kibana.alert.rule.uuid') as string)
          : (getFieldValue(hit, 'signal.rule.id') as string),
      [hit]
    );

    // Opens the relevant system flyout (host, ip, rule) when a supported value is clicked in the
    // Table tab. Mirrors the Highlighted Fields behavior in the Overview tab.
    const renderFlyoutLink = useCallback(
      (props: OpenFlyoutLinkProps) => {
        // Rule name fields: substitute the rule UUID as the link target (the flyout is keyed by
        // UUID) while keeping the rule name as the displayed text. When no UUID is available,
        // render plain text to avoid opening the rule flyout with an invalid id.
        if (
          props.field === SIGNAL_RULE_NAME_FIELD_NAME ||
          props.field === LEGACY_SIGNAL_RULE_NAME_FIELD_NAME
        ) {
          if (!ruleId) {
            return <>{props.children}</>;
          }
          return <OpenFlyoutLink {...props} value={ruleId} />;
        }
        return <OpenFlyoutLink {...props} asParent={props.field === HOST_NAME_FIELD_NAME} />;
      },
      [ruleId]
    );

    const onShowNotes = useCallback(() => {
      overlays.openSystemFlyout(
        flyoutProviders({
          services,
          store,
          history,
          children: <NotesDetails hit={hit} />,
        }),
        {
          ...defaultToolsFlyoutProperties,
          historyKey,
        }
      );
    }, [history, historyKey, hit, overlays, services, store]);

    if (isAlert && loading) {
      return <FlyoutLoading data-test-subj="document-overview-loading" />;
    }

    if (missingAlertsPrivilege) {
      return <FlyoutMissingAlertsPrivilege />;
    }

    return (
      <>
        <RemoteDocumentCallout hit={hit} />
        <EuiFlyoutHeader css={headerStyles}>
          <Header
            hit={hit}
            renderCellActions={renderCellActions}
            onAlertUpdated={onAlertUpdated}
            onShowNotes={onShowNotes}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {isSecurityApp && (
            <>
              <EuiTabs>
                <EuiTab
                  isSelected={selectedTabId === 'overview'}
                  onClick={() => setSelectedTabId('overview')}
                  data-test-subj={OVERVIEW_TAB_TEST_ID}
                >
                  {OVERVIEW_TAB_LABEL}
                </EuiTab>
                <EuiTab
                  isSelected={selectedTabId === 'table'}
                  onClick={() => setSelectedTabId('table')}
                  data-test-subj={TABLE_TAB_TEST_ID}
                >
                  {TABLE_TAB_LABEL}
                </EuiTab>
                <EuiTab
                  isSelected={selectedTabId === 'json'}
                  onClick={() => setSelectedTabId('json')}
                  data-test-subj={JSON_TAB_TEST_ID}
                >
                  {JSON_TAB_LABEL}
                </EuiTab>
              </EuiTabs>
              <EuiSpacer size="m" />
            </>
          )}
          {isSecurityApp && selectedTabId === 'table' ? (
            <TableTab
              hit={hit}
              renderCellActions={renderCellActions}
              renderFlyoutLink={renderFlyoutLink}
            />
          ) : isSecurityApp && selectedTabId === 'json' ? (
            <JsonTab hit={hit} />
          ) : (
            <OverviewTab
              hit={hit}
              renderCellActions={renderCellActions}
              onAlertUpdated={onAlertUpdated}
            />
          )}
        </EuiFlyoutBody>
        <EuiFlyoutFooter css={footerStyles}>
          <Footer hit={hit} onAlertUpdated={onAlertUpdated} onShowNotes={onShowNotes} />
        </EuiFlyoutFooter>
      </>
    );
  }
);

DocumentFlyout.displayName = 'DocumentFlyout';
