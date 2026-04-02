/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { buildDataTableRecord, type EsHitRecord, getFieldValue } from '@kbn/discover-utils';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { ALERT_RULE_UUID, TIMESTAMP } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { useRefetchByScope } from '../../../../flyout_v2/document/hooks/use_refetch_by_scope';
import { useDocumentDetailsContext } from '../../shared/context';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { Assignees } from '../../../../flyout_v2/document/components/assignees';
import { Notes } from '../../../../flyout_v2/shared/components/notes';
import { RiskScore } from '../../../../flyout_v2/document/components/risk_score';
import { DocumentSeverity } from '../../../../flyout_v2/document/components/severity';
import { AlertHeaderBlock } from '../../../../flyout_v2/shared/components/alert_header_block';
import { ALERT_SUMMARY_PANEL_TEST_ID } from '../../../../flyout_v2/shared/components/test_ids';
import { LeftPanelNotesTab } from '../../left';
import { STATUS_TITLE_TEST_ID } from './test_ids';
import { HeaderTitle } from '../../../../flyout_v2/document/components/header_title';
import { HeaderStatus } from '../../../../flyout_v2/document/components/header_status';
import type { CellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { CellActions } from '../../shared/components/cell_actions';

// minWidth for each block, allows to switch for a 1 row 4 blocks to 2 rows with 2 block each
const blockStyles = {
  minWidth: 280,
};

const urlParamOverride = { timeline: { isOpen: false } };

/**
 * Alert details flyout right section header
 */
export const AlertHeaderTitle = memo(() => {
  const { scopeId, isRulePreview, refetchFlyoutData, searchHit } = useDocumentDetailsContext();
  const openNotesTab = useNavigateToLeftPanel({ tab: LeftPanelNotesTab });
  const { closeFlyout } = useExpandableFlyoutApi();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const ruleId = useMemo(() => getFieldValue(hit, ALERT_RULE_UUID) as string, [hit]);
  const href = useRuleDetailsLink({ ruleId: !isRulePreview ? ruleId : null }, urlParamOverride);
  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);

  const { refetch } = useRefetchByScope({ scopeId });

  const onStatusUpdated = useCallback(() => {
    refetch();
    closeFlyout();
  }, [closeFlyout, refetch]);

  const onAssigneesUpdated = useCallback(() => {
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
        <AlertHeaderBlock
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
        </AlertHeaderBlock>
      ) : (
        <HeaderStatus
          hit={hit}
          renderCellActions={renderStatusCellActions}
          onAlertUpdated={onStatusUpdated}
        />
      ),
    [hit, isRulePreview, onStatusUpdated, renderStatusCellActions]
  );

  return (
    <>
      <DocumentSeverity hit={hit} />
      <EuiSpacer size="m" />
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      <HeaderTitle hit={hit} titleHref={href ?? undefined} />
      <EuiSpacer size="m" />
      <EuiFlexGroup
        direction="row"
        gutterSize="s"
        responsive={false}
        wrap
        data-test-subj={ALERT_SUMMARY_PANEL_TEST_ID}
      >
        <EuiFlexItem css={blockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>{status}</EuiFlexItem>
            <EuiFlexItem>
              <RiskScore hit={hit} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={blockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>
              <Assignees
                hit={hit}
                onAssigneesUpdated={onAssigneesUpdated}
                showAssignees={!isRulePreview}
              />
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
