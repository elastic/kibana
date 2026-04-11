/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { buildDataTableRecord, type EsHitRecord, getFieldValue } from '@kbn/discover-utils';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer } from '@elastic/eui';
import { ALERT_RULE_UUID, ALERT_WORKFLOW_ASSIGNEE_IDS, TIMESTAMP } from '@kbn/rule-data-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import { Notes } from './notes';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { DocumentStatus } from './status';
import { RiskScore } from './risk_score';
import { useRefetchByScope } from '../hooks/use_refetch_by_scope';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import {
  ALERT_SUMMARY_PANEL_TEST_ID,
  ASSIGNEES_TITLE_TEST_ID,
  RISK_SCORE_TITLE_TEST_ID,
} from './test_ids';
import { Assignees } from './assignees';
import { DocumentSeverity } from '../../../../flyout_v2/document/components/severity';
import { FlyoutTitle } from '../../../../flyout_v2/shared/components/flyout_title';
import { getDocumentTitle } from '../../../../flyout_v2/document/utils/get_header_title';
import { HEADER_TITLE_TEST_ID } from '../../../../flyout_v2/document/components/test_ids';
import { AlertHeaderBlock } from '../../../shared/components/alert_header_block';

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
  const hit = useMemo(() => buildDataTableRecord(searchHit as EsHitRecord), [searchHit]);
  const ruleId = useMemo(() => getFieldValue(hit, ALERT_RULE_UUID) as string, [hit]);
  const href = useRuleDetailsLink({ ruleId: !isRulePreview ? ruleId : null }, urlParamOverride);
  const title = useMemo(() => getDocumentTitle(hit), [hit]);
  const timestamp = useMemo(() => getFieldValue(hit, TIMESTAMP) as string, [hit]);
  const ruleTitle = useMemo(
    () =>
      href ? (
        <EuiLink href={href} target="_blank" external={false}>
          <FlyoutTitle
            title={title}
            iconType={'warning'}
            isLink
            data-test-subj={HEADER_TITLE_TEST_ID}
          />
        </EuiLink>
      ) : (
        <FlyoutTitle title={title} iconType={'warning'} data-test-subj={HEADER_TITLE_TEST_ID} />
      ),
    [title, href]
  );

  const { refetch } = useRefetchByScope({ scopeId });
  const alertAssignees = useMemo(
    () => (getFieldsData(ALERT_WORKFLOW_ASSIGNEE_IDS) as string[]) ?? [],
    [getFieldsData]
  );
  const onAssigneesUpdated = useCallback(() => {
    refetch();
    refetchFlyoutData();
  }, [refetch, refetchFlyoutData]);

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
        <RiskScore getFieldsData={getFieldsData} />
      </AlertHeaderBlock>
    ),
    [getFieldsData]
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
      {ruleTitle}
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
            <EuiFlexItem>
              <DocumentStatus />
            </EuiFlexItem>
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
