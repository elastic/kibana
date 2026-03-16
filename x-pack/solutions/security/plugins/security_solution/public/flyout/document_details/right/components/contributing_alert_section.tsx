/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { isRight } from 'fp-ts/Either';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { ExpandablePanel } from '../../../../flyout_v2/shared/components/expandable_panel';
import { useDocumentDetailsContext } from '../../shared/context';
import { useContributingAlert } from '../../shared/hooks/use_contributing_alert';
import { getField } from '../../shared/utils';
import { SeverityBadge } from '../../../../common/components/severity_badge';
import {
  CONTRIBUTING_ALERT_TEST_ID,
  CONTRIBUTING_ALERT_RULE_NAME_TEST_ID,
  CONTRIBUTING_ALERT_SEVERITY_TEST_ID,
  CONTRIBUTING_ALERT_RISK_SCORE_TEST_ID,
  CONTRIBUTING_ALERT_REASON_TEST_ID,
  CONTRIBUTING_ALERT_TIMESTAMP_TEST_ID,
  CONTRIBUTING_ALERT_KEY_FIELDS_TEST_ID,
} from './test_ids';

const ORIGINAL_ALERT_UUID_FIELD = 'kibana.alert.original_alert.uuid';

const KEY_FIELDS_TO_DISPLAY = [
  'process.name',
  'source.ip',
  'destination.ip',
  'user.name',
  'host.name',
  'event.action',
] as const;

/**
 * Contributing alert section for correlation building block alerts.
 * Only renders when the alert has a `kibana.alert.original_alert.uuid` field populated.
 */
export const ContributingAlertSection: React.FC = () => {
  const { getFieldsData } = useDocumentDetailsContext();
  const originalAlertUuid = getField(getFieldsData(ORIGINAL_ALERT_UUID_FIELD)) ?? undefined;

  const { loading, contributingAlert } = useContributingAlert({
    originalAlertUuid,
  });

  if (!originalAlertUuid) {
    return null;
  }

  if (loading) {
    return (
      <ExpandablePanel
        header={{
          title: (
            <FormattedMessage
              id="xpack.securitySolution.flyout.right.insights.contributingAlert.title"
              defaultMessage="Contributing Alert"
            />
          ),
        }}
        data-test-subj={CONTRIBUTING_ALERT_TEST_ID}
        content={{ loading: true }}
      >
        <EuiLoadingSpinner size="m" />
      </ExpandablePanel>
    );
  }

  if (!contributingAlert) {
    return null;
  }

  const decodedSeverity = Severity.decode(contributingAlert.severity);
  const keyFieldEntries = KEY_FIELDS_TO_DISPLAY.filter(
    (field) => contributingAlert.fields[field] != null
  ).map((field) => ({
    title: field,
    description: String(contributingAlert.fields[field]),
  }));

  return (
    <ExpandablePanel
      header={{
        title: (
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.insights.contributingAlert.title"
            defaultMessage="Contributing Alert"
          />
        ),
      }}
      data-test-subj={CONTRIBUTING_ALERT_TEST_ID}
    >
      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem data-test-subj={CONTRIBUTING_ALERT_RULE_NAME_TEST_ID}>
          <EuiText size="xs">
            <strong>
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.insights.contributingAlert.ruleNameLabel"
                defaultMessage="Original Rule"
              />
            </strong>
          </EuiText>
          <EuiText size="s">{contributingAlert.ruleName}</EuiText>
        </EuiFlexItem>

        <EuiFlexItem>
          <EuiFlexGroup gutterSize="l">
            <EuiFlexItem grow={false} data-test-subj={CONTRIBUTING_ALERT_SEVERITY_TEST_ID}>
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.insights.contributingAlert.severityLabel"
                    defaultMessage="Severity"
                  />
                </strong>
              </EuiText>
              {isRight(decodedSeverity) ? (
                <SeverityBadge value={decodedSeverity.right} />
              ) : (
                <EuiText size="s">{contributingAlert.severity}</EuiText>
              )}
            </EuiFlexItem>

            <EuiFlexItem grow={false} data-test-subj={CONTRIBUTING_ALERT_RISK_SCORE_TEST_ID}>
              <EuiText size="xs">
                <strong>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.insights.contributingAlert.riskScoreLabel"
                    defaultMessage="Risk Score"
                  />
                </strong>
              </EuiText>
              <EuiText size="s">{contributingAlert.riskScore}</EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        {contributingAlert.reason && (
          <EuiFlexItem data-test-subj={CONTRIBUTING_ALERT_REASON_TEST_ID}>
            <EuiText size="xs">
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.contributingAlert.reasonLabel"
                  defaultMessage="Reason"
                />
              </strong>
            </EuiText>
            <EuiText size="s">{contributingAlert.reason}</EuiText>
          </EuiFlexItem>
        )}

        {contributingAlert.timestamp && (
          <EuiFlexItem data-test-subj={CONTRIBUTING_ALERT_TIMESTAMP_TEST_ID}>
            <EuiText size="xs">
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.contributingAlert.timestampLabel"
                  defaultMessage="Timestamp"
                />
              </strong>
            </EuiText>
            <EuiText size="s">{contributingAlert.timestamp}</EuiText>
          </EuiFlexItem>
        )}

        {keyFieldEntries.length > 0 && (
          <EuiFlexItem data-test-subj={CONTRIBUTING_ALERT_KEY_FIELDS_TEST_ID}>
            <EuiText size="xs">
              <strong>
                <FormattedMessage
                  id="xpack.securitySolution.flyout.right.insights.contributingAlert.keyFieldsLabel"
                  defaultMessage="Key Fields"
                />
              </strong>
            </EuiText>
            <EuiDescriptionList
              type="column"
              compressed
              listItems={keyFieldEntries}
              style={{ maxWidth: '100%' }}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </ExpandablePanel>
  );
};

ContributingAlertSection.displayName = 'ContributingAlertSection';
