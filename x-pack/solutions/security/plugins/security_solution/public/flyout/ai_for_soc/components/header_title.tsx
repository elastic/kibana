/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { IntegrationIcon } from './integration_icon';
import { DocumentSeverity } from '../../document_details/right/components/severity';
import { useBasicDataFromDetailsData } from '../../document_details/shared/hooks/use_basic_data_from_details_data';
import { FlyoutTitle } from '../../shared/components/flyout_title';
import { PreferenceFormattedDate } from '../../../common/components/formatted_date';
import { getAlertTitle } from '../../document_details/shared/utils';
import { RiskScore } from '../../document_details/right/components/risk_score';
import { useAIForSOCDetailsContext } from '../context';
import { AlertHeaderBlock } from '../../shared/components/alert_header_block';

export const HEADER_TITLE_TEST_ID = 'ai-for-soc-alert-flyout-header-title';
export const HEADER_SUMMARY_TEST_ID = 'ai-for-soc-alert-flyout-header-summary';
export const HEADER_SEVERITY_TITLE_TEST_ID = 'ai-for-soc-alert-flyout-header-severity';
export const HEADER_RISK_SCORE_TITLE_TEST_ID = 'ai-for-soc-alert-flyout-header-risk-score';
export const HEADER_INTEGRATION_TITLE_TEST_ID = 'ai-for-soc-alert-flyout-header-integration';

/**
 * Header data for the AI for SOC for the alert summary flyout
 */
export const HeaderTitle = memo(() => {
  const { dataFormattedForFieldBrowser, getFieldsData } = useAIForSOCDetailsContext();
  const { ruleId, ruleName, timestamp } = useBasicDataFromDetailsData(dataFormattedForFieldBrowser);
  const title = useMemo(() => getAlertTitle({ ruleName }), [ruleName]);

  const date = useMemo(() => new Date(timestamp), [timestamp]);

  return (
    <>
      {timestamp && <PreferenceFormattedDate value={date} />}
      <EuiSpacer size="xs" />
      <FlyoutTitle data-test-subj={HEADER_TITLE_TEST_ID} title={title} iconType={'warning'} />
      <EuiSpacer size="m" />
      <EuiPanel
        data-test-subj={HEADER_SUMMARY_TEST_ID}
        hasBorder={true}
        hasShadow={false}
        paddingSize="s"
      >
        <EuiFlexGroup direction="row" gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <AlertHeaderBlock
              data-test-subj={HEADER_SEVERITY_TITLE_TEST_ID}
              title={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.aiForSOC.header.severityTitle"
                  defaultMessage="Severity"
                />
              }
            >
              <DocumentSeverity getFieldsData={getFieldsData} />
            </AlertHeaderBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertHeaderBlock
              data-test-subj={HEADER_RISK_SCORE_TITLE_TEST_ID}
              title={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.aiForSOC.header.riskScoreTitle"
                  defaultMessage="Risk score"
                />
              }
            >
              <RiskScore getFieldsData={getFieldsData} />
            </AlertHeaderBlock>
          </EuiFlexItem>
          <EuiFlexItem>
            <AlertHeaderBlock
              data-test-subj={HEADER_INTEGRATION_TITLE_TEST_ID}
              title={
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.header.integrationTitle"
                  defaultMessage="Integration"
                />
              }
            >
              <IntegrationIcon ruleId={ruleId} />
            </AlertHeaderBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
});

HeaderTitle.displayName = 'HeaderTitle';
