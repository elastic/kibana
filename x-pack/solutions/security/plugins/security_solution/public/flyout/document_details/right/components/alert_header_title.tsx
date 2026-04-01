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
import { ALERT_RULE_UUID, ALERT_WORKFLOW_ASSIGNEE_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { Notes } from './notes';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { useRefetchByScope } from '../../../../flyout_v2/document/hooks/use_refetch_by_scope';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { Assignees } from './assignees';
import {
  ALERT_SUMMARY_PANEL_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
  RISK_SCORE_TITLE_TEST_ID,
} from '../../../../flyout_v2/shared/components/test_ids';
import { STATUS_TITLE_TEST_ID } from './test_ids';
import { HeaderTitle } from '../../../../flyout_v2/document/components/header_title';
import { HeaderStatus } from '../../../../flyout_v2/document/components/header_status';
import { RiskScore } from '../../../../flyout_v2/document/components/risk_score';
import { DocumentSeverity } from '../../../../flyout_v2/document/components/severity';
import type { CellActionRenderer } from '../../../../flyout_v2/shared/components/cell_actions';
import { AlertHeaderBlock } from '../../../../flyout_v2/shared/components/alert_header_block';
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
  const { eventId, scopeId, isRulePreview, refetchFlyoutData, getFieldsData, searchHit } =
    useDocumentDetailsContext();
  const { closeFlyout } = useExpandableFlyoutApi();
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const ruleId = useMemo(() => getFieldValue(hit, ALERT_RULE_UUID) as string, [hit]);
  const href = useRuleDetailsLink({ ruleId: !isRulePreview ? ruleId : null }, urlParamOverride);
  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);

  const { refetch } = useRefetchByScope({ scopeId });
  const alertAssignees = useMemo(
    () => (getFieldsData(ALERT_WORKFLOW_ASSIGNEE_IDS) as string[]) ?? [],
    [getFieldsData]
  );
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

  const riskScore = useMemo(
    () => (
      <AlertHeaderBlock
        hasBorder
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.header.riskScoreTitle"
            defaultMessage="Risk score"
          />
        }
        data-test-subj={RISK_SCORE_TITLE_TEST_ID}
      >
        <RiskScore hit={hit} />
      </AlertHeaderBlock>
    ),
    [hit]
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

  const assignees = useMemo(
    () => (
      <AlertHeaderBlock
        hasBorder
        title={
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.header.assignedTitle"
            defaultMessage="Assignees"
          />
        }
        data-test-subj={ASSIGNEES_TITLE_TEST_ID}
      >
        <Assignees
          eventId={eventId}
          assignedUserIds={alertAssignees}
          onAssigneesUpdated={onAssigneesUpdated}
          showAssignees={!isRulePreview}
        />
      </AlertHeaderBlock>
    ),
    [alertAssignees, eventId, isRulePreview, onAssigneesUpdated]
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
            <EuiFlexItem>{riskScore}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem css={blockStyles}>
          <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
            <EuiFlexItem>{assignees}</EuiFlexItem>
            <EuiFlexItem>
              <Notes />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
});

AlertHeaderTitle.displayName = 'AlertHeaderTitle';
