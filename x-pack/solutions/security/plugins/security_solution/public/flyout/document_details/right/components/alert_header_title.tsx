/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord } from '@kbn/discover-utils';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { flyoutHeaderBlockStyles } from '../../../../flyout_v2/document/constants/styles';
import { useRefetchByScope } from '../../../../flyout_v2/document/hooks/use_refetch_by_scope';
import { useDocumentDetailsContext } from '../../shared/context';
import { useNavigateToLeftPanel } from '../../shared/hooks/use_navigate_to_left_panel';
import { Assignees } from '../../../../flyout_v2/document/components/assignees';
import { Timestamp } from '../../../../flyout_v2/document/components/timestamp';
import { Notes } from '../../../../flyout_v2/shared/components/notes';
import { RiskScore } from '../../../../flyout_v2/document/components/risk_score';
import { DocumentSeverity } from '../../../../flyout_v2/document/components/severity';
import { AlertHeaderBlock } from '../../../../flyout_v2/shared/components/alert_header_block';
import { ALERT_SUMMARY_PANEL_TEST_ID } from '../../../../flyout_v2/shared/components/test_ids';
import { LeftPanelNotesTab } from '../../left';
import { STATUS_TITLE_TEST_ID } from './test_ids';
import { Title } from '../../../../flyout_v2/document/components/title';
import { Status } from '../../../../flyout_v2/document/components/status';
import type { CellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { getEmptyTagValue } from '../../../../common/components/empty_value';
import { CellActions } from '../../shared/components/cell_actions';

/**
 * Alert details flyout right section header
 */
export const AlertHeaderTitle = memo(() => {
  const { scopeId, isRulePreview, refetchFlyoutData, searchHit } = useDocumentDetailsContext();
  const openNotesTab = useNavigateToLeftPanel({ tab: LeftPanelNotesTab });
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);

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
      <DocumentSeverity hit={hit}>
        <EuiSpacer size="m" />
      </DocumentSeverity>
      <Timestamp hit={hit}>
        <EuiSpacer size="xs" />
      </Timestamp>
      <Title hit={hit} hideLink={isRulePreview} />
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
