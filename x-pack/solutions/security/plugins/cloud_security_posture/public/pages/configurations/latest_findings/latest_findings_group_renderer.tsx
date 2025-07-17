/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { GroupPanelRenderer, GroupStatsItem, RawBucket } from '@kbn/grouping/src';
import { i18n } from '@kbn/i18n';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { getGroupPanelTitle } from '@kbn/cloud-security-posture';
import type { FindingsGroupingAggregation } from '@kbn/cloud-security-posture';
import { FINDINGS_GROUPING_OPTIONS } from '../../../common/constants';
import {
  firstNonNullValue,
  LoadingGroup,
  NullGroup,
} from '../../../components/cloud_security_grouping';
import { CISBenchmarkIcon } from '../../../components/cis_benchmark_icon';
import { ComplianceScoreBar } from '../../../components/compliance_score_bar';
import { NULL_GROUPING_MESSAGES, NULL_GROUPING_UNIT } from './constants';
import { FINDINGS_GROUPING_COUNTER } from '../test_subjects';

export const groupPanelRenderer: GroupPanelRenderer<FindingsGroupingAggregation> = (
  selectedGroup: string,
  bucket,
  nullGroupMessage: string | undefined,
  isLoading: boolean | undefined
) => {
  if (isLoading) {
    return <LoadingGroup />;
  }
  const benchmarkId = firstNonNullValue(bucket.benchmarkId?.buckets?.[0]?.key);

  const renderNullGroup = (title: string) => (
    <NullGroup title={title} field={selectedGroup} unit={NULL_GROUPING_UNIT} />
  );

  switch (selectedGroup) {
    case FINDINGS_GROUPING_OPTIONS.RESOURCE_ID:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.RESOURCE_NAME)
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem
                css={css`
                  display: inline;
                `}
              >
                <EuiText size="s">
                  <EuiTextBlockTruncate
                    lines={2}
                    css={css`
                      word-break: break-all;
                    `}
                    title={bucket.resourceName?.buckets?.[0]?.key as string}
                  >
                    {getGroupPanelTitle(bucket, 'resourceName')}
                  </EuiTextBlockTruncate>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {bucket.resourceSubType?.buckets?.[0]?.key}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case FINDINGS_GROUPING_OPTIONS.RULE_NAME:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.RULE_NAME)
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s"> {getGroupPanelTitle(bucket)}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}{' '}
                  {firstNonNullValue(bucket.benchmarkVersion?.buckets?.[0]?.key)}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.CLOUD_ACCOUNT_NAME)
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {benchmarkId && (
            <EuiFlexItem grow={0}>
              <CISBenchmarkIcon
                type={benchmarkId}
                name={firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">{getGroupPanelTitle(bucket, 'accountName')}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {bucket.benchmarkName?.buckets?.[0]?.key}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_ID:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.ORCHESTRATOR_CLUSTER_ID)
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {benchmarkId && (
            <EuiFlexItem grow={0}>
              <CISBenchmarkIcon
                type={benchmarkId}
                name={firstNonNullValue(bucket.benchmarkName?.buckets?.[0]?.key)}
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">{getGroupPanelTitle(bucket, 'clusterName')}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {bucket.benchmarkName?.buckets?.[0]?.key}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    default:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.DEFAULT)
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">{getGroupPanelTitle(bucket)}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }
};

const FindingsCountComponent = ({ bucket }: { bucket: RawBucket<FindingsGroupingAggregation> }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiToolTip content={bucket.doc_count}>
      <EuiBadge
        css={css`
          margin-left: ${euiTheme.size.s};
        `}
        color="hollow"
        data-test-subj={FINDINGS_GROUPING_COUNTER}
      >
        {getAbbreviatedNumber(bucket.doc_count)}
      </EuiBadge>
    </EuiToolTip>
  );
};

const FindingsCount = React.memo(FindingsCountComponent);

export const ComplianceBarComponent = ({
  bucket,
}: {
  bucket: RawBucket<FindingsGroupingAggregation>;
}) => {
  const { euiTheme } = useEuiTheme();

  const totalFailed = bucket.failedFindings?.doc_count || 0;
  const totalPassed = bucket.passedFindings?.doc_count || 0;
  return (
    <ComplianceScoreBar
      size="l"
      overrideCss={css`
        width: 104px;
        margin-left: ${euiTheme.size.s};
      `}
      totalFailed={totalFailed}
      totalPassed={totalPassed}
    />
  );
};

const ComplianceBar = React.memo(ComplianceBarComponent);

export const groupStatsRenderer = (
  selectedGroup: string,
  bucket: RawBucket<FindingsGroupingAggregation>
): GroupStatsItem[] => [
  {
    title: i18n.translate('xpack.csp.findings.grouping.stats.badges.findings', {
      defaultMessage: 'Findings',
    }),
    component: <FindingsCount bucket={bucket} />,
  },
  {
    title: i18n.translate('xpack.csp.findings.grouping.stats.badges.compliance', {
      defaultMessage: 'Compliance',
    }),
    component: <ComplianceBar bucket={bucket} />,
  },
];
