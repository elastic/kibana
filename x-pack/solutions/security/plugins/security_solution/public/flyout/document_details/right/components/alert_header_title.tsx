/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EuiFlexGroup, EuiFlexItem, EuiPagination, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  FlyoutHeaderBlock,
  flyoutHeaderBlockStyles,
} from '../../../../flyout_v2/shared/components/flyout_header_block';
import { useRefetchByScope } from '../../../../flyout_v2/document/main/hooks/use_refetch_by_scope';
import { useAlertsContext } from '../../../../detections/components/alerts_table/alerts_context';
import { useDocumentDetailsContext } from '../../shared/context';
import { useUserPrivileges } from '../../../../common/components/user_privileges';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { Assignees } from '../../../../flyout_v2/document/main/components/assignees';
import { Timestamp } from '../../../../flyout_v2/shared/components/timestamp';
import { Notes } from '../../../../flyout_v2/shared/components/notes';
import { RiskScore } from '../../../../flyout_v2/document/main/components/risk_score';
import { DocumentSeverity } from '../../../../flyout_v2/document/main/components/severity';
import { ALERT_SUMMARY_PANEL_TEST_ID } from '../../../../flyout_v2/shared/components/test_ids';
import { LeftPanelNotesTab } from '../../left';
import { FLYOUT_ALERT_PAGINATION_TEST_ID, STATUS_TITLE_TEST_ID } from './test_ids';
import { Title } from '../../../../flyout_v2/document/main/components/title';
import { Status } from '../../../../flyout_v2/document/main/components/status';
import type { CellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { CellActions } from '../../shared/components/cell_actions';

const PAGINATION_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.flyout.right.header.paginationAriaLabel',
  {
    defaultMessage: 'Navigate between alerts',
  }
);

/**
 * Alert details flyout right section header
 */
export const AlertHeaderTitle = memo(() => {
  const { scopeId, isRulePreview, refetchFlyoutData, searchHit } = useDocumentDetailsContext();
  const canReadRules = useUserPrivileges().rulesPrivileges.rules.read;
  const openNotesTab = useNavigateToLeftPanel({ tab: LeftPanelNotesTab });
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

  const { flyoutAlertIndex, totalAlertCount, openAlertFlyout } = useAlertsContext();
  // The flyout pagination spans the entire query result, so `pageCount` is
  // the total alert count and `activePage` is the absolute alert index. We
  // hide it when the flyout is opened outside an alerts table (for instance
  // from rule preview, where `flyoutAlertIndex` is never set) or when there
  // is only a single alert to navigate.
  const showPagination =
    totalAlertCount > 1 && flyoutAlertIndex != null && flyoutAlertIndex >= 0 && !isRulePreview;

  const { refetch } = useRefetchByScope({ scopeId });

  const onAlertUpdated = useCallback(() => {
    refetch();
    refetchFlyoutData();
  }, [refetch, refetchFlyoutData]);

  const renderStatusCellActions = useCallback<CellActionRenderer>(
    ({ children, field, value }) => (
      <CellActions field={field} value={value as string | string[] | null | undefined}>
        {children}
      </CellActions>
    ),
    []
  );

  const status = useMemo(
    () =>
      isRulePreview ? (
        <FlyoutHeaderBlock
          hasBorder
          title={
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.header.statusTitle"
              defaultMessage="Status"
            />
          }
          data-test-subj={STATUS_TITLE_TEST_ID}
        >
          {getEmptyTagValue()}
        </FlyoutHeaderBlock>
      ) : (
        <Status
          hit={hit}
          renderCellActions={renderStatusCellActions}
          onAlertUpdated={onAlertUpdated}
        />
      ),
    [hit, isRulePreview, onAlertUpdated, renderStatusCellActions]
  );

  return (
    <>
      {showPagination && (
        <>
          <EuiFlexGroup gutterSize="none" justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiPagination
                aria-label={PAGINATION_ARIA_LABEL}
                pageCount={totalAlertCount}
                activePage={flyoutAlertIndex}
                onPageClick={openAlertFlyout}
                compressed
                data-test-subj={FLYOUT_ALERT_PAGINATION_TEST_ID}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
        </>
      )}
      <DocumentSeverity hit={hit}>
        <EuiSpacer size="m" />
      </DocumentSeverity>
      <EuiText size="s">
        <Timestamp hit={hit} />
      </EuiText>
      <EuiSpacer size="xs" />
      <Title hit={hit} hideLink={isRulePreview || !canReadRules} />
      <EuiSpacer size="m" />
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        responsive={false}
        wrap
        data-test-subj={ALERT_SUMMARY_PANEL_TEST_ID}
      >
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>{status}</EuiFlexItem>
            <EuiFlexItem>
              <RiskScore hit={hit} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={flyoutHeaderBlockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Assignees hit={hit} onAlertUpdated={onAlertUpdated} showAssignees={!isRulePreview} />
            </EuiFlexItem>
            <EuiFlexItem>
              <Notes
                documentId={hit.raw._id ?? ''}
                onShowNotes={openNotesTab}
                disabled={isRulePreview}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

AlertHeaderTitle.displayName = 'AlertHeaderTitle';
