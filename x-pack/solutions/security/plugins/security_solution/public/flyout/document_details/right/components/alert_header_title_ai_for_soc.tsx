/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiLink, EuiPanel } from '@elastic/eui';
import { useRuleDetailsLink } from '../../shared/hooks/use_rule_details_link';
import { DocumentSeverity } from './severity_ai_for_soc';
import { RiskScore } from './risk_score';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import { useDocumentDetailsContext } from '../../shared/context';
import { PreferenceFormattedDate } from '../../../../common/components/formatted_date';
import { FLYOUT_ALERT_HEADER_TITLE_TEST_ID, ALERT_SUMMARY_PANEL_TEST_ID } from './test_ids';
import { FlyoutTitle } from '../../../shared/components/flyout_title';
import { getAlertTitle } from '../../shared/utils';
import { Integrations } from './integrations_ai_for_soc';

/**
 * Alert details flyout right section header
 */
export const AlertHeaderTitle = memo(() => {
  const { dataFormattedForFieldBrowser, isPreview } = useDocumentDetailsContext();

  const { ruleName, timestamp, ruleId } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const title = useMemo(() => getAlertTitle({ ruleName }), [ruleName]);
  const href = useRuleDetailsLink({ ruleId: !isPreview ? ruleId : null });
  const ruleTitle = useMemo(
    () =>
      href ? (
        <EuiLink href={href} target="_blank" external={false}>
          <FlyoutTitle
            title={title}
            iconType={'warning'}
            isLink
            data-test-subj={FLYOUT_ALERT_HEADER_TITLE_TEST_ID}
          />
        </EuiLink>
      ) : (
        <FlyoutTitle
          title={title}
          iconType={'warning'}
          data-test-subj={FLYOUT_ALERT_HEADER_TITLE_TEST_ID}
        />
      ),
    [title, href]
  );

  return (
    <>
      {timestamp && <PreferenceFormattedDate value={new Date(timestamp)} />}
      <EuiSpacer size="xs" />
      {ruleTitle}
      <EuiSpacer size="m" />
      <EuiPanel hasShadow={false} hasBorder paddingSize="none">
        <EuiFlexGroup
          direction="row"
          gutterSize="s"
          responsive={false}
          wrap
          data-test-subj={ALERT_SUMMARY_PANEL_TEST_ID}
        >
          <EuiFlexItem>
            <DocumentSeverity />
          </EuiFlexItem>
          <EuiFlexItem>
            <RiskScore hasBorder={false} />
          </EuiFlexItem>
          <EuiFlexItem>
            <Integrations />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
});

AlertHeaderTitle.displayName = 'AlertHeaderTitle';
