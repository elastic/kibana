/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTextBlockTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  GenericBuckets,
  GroupPanelRenderer,
  GroupStatsItem,
  RawBucket,
} from '@kbn/grouping/src';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { getAbbreviatedNumber } from '@kbn/cloud-security-posture-common';
import { CloudProviderIcon, type CloudProvider } from '@kbn/custom-icons';
import type { CriticalityLevelWithUnassigned } from '../../../../../common/entity_analytics/asset_criticality/types';
import { AssetCriticalityBadge } from '../../../../entity_analytics/components/asset_criticality';
import { ASSET_GROUPING_OPTIONS, TEST_SUBJ_GROUPING_COUNTER } from '../../../constants';
import { firstNonNullValue } from './first_non_null_value';
import { NullGroup } from './null_group';
import { LoadingGroup } from './loading_group';
import type { AssetsGroupingAggregation } from '../use_fetch_grouped_data';
import { NULL_GROUPING_MESSAGES, NULL_GROUPING_UNIT } from '../translations';

export const groupPanelRenderer: GroupPanelRenderer<AssetsGroupingAggregation> = (
  selectedGroup: string,
  bucket: RawBucket<AssetsGroupingAggregation>,
  nullGroupMessage: string | undefined,
  isLoading: boolean | undefined
) => {
  if (isLoading) {
    return <LoadingGroup />;
  }

  const cloudProvider = firstNonNullValue(bucket.cloudProvider?.buckets?.[0]?.key) as CloudProvider;

  const renderNullGroup = (title: string) => (
    <NullGroup title={title} field={selectedGroup} unit={NULL_GROUPING_UNIT} />
  );

  const getGroupPanelTitle = (aggregationField?: keyof AssetsGroupingAggregation) => {
    const aggregationFieldValue = aggregationField
      ? (bucket[aggregationField] as { buckets?: GenericBuckets[] })?.buckets?.[0]?.key
      : null;

    if (aggregationFieldValue) {
      return (
        <>
          <strong>{aggregationFieldValue}</strong>
          {' - '}
          {bucket.key_as_string}
        </>
      );
    }

    return <strong>{bucket.key_as_string}</strong>;
  };

  switch (selectedGroup) {
    case ASSET_GROUPING_OPTIONS.ASSET_CRITICALITY:
      const rawCriticalityLevel = firstNonNullValue(bucket.assetCriticality?.buckets?.[0]?.key) as
        | CriticalityLevelWithUnassigned
        | 'deleted';

      const criticalityLevel =
        rawCriticalityLevel === 'deleted' ? 'unassigned' : rawCriticalityLevel;

      return nullGroupMessage ? (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <AssetCriticalityBadge criticalityLevel="unassigned" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <AssetCriticalityBadge criticalityLevel={criticalityLevel} />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ASSET_GROUPING_OPTIONS.ENTITY_TYPE:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.ENTITY_TYPE)
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
                    title={bucket.entityType?.buckets?.[0]?.key as string}
                  >
                    {getGroupPanelTitle()}
                  </EuiTextBlockTruncate>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    case ASSET_GROUPING_OPTIONS.CLOUD_ACCOUNT:
      return nullGroupMessage ? (
        renderNullGroup(NULL_GROUPING_MESSAGES.CLOUD_ACCOUNT)
      ) : (
        <EuiFlexGroup alignItems="center" gutterSize="m">
          {cloudProvider && (
            <EuiFlexItem grow={0}>
              <CloudProviderIcon size="xl" cloudProvider={cloudProvider} />
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="none">
              <EuiFlexItem>
                <EuiText size="s">{getGroupPanelTitle('accountName')}</EuiText>
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
                <EuiText size="s">{getGroupPanelTitle()}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
  }
};

const AssetsCountComponent = ({ bucket }: { bucket: RawBucket<AssetsGroupingAggregation> }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiToolTip content={bucket.doc_count}>
      <EuiBadge
        css={css`
          margin-left: ${euiTheme.size.s};
        `}
        color="hollow"
        data-test-subj={TEST_SUBJ_GROUPING_COUNTER}
      >
        {getAbbreviatedNumber(bucket.doc_count)}
      </EuiBadge>
    </EuiToolTip>
  );
};

const AssetsCount = React.memo(AssetsCountComponent);

export const groupStatsRenderer = (
  _selectedGroup: string,
  bucket: RawBucket<AssetsGroupingAggregation>
): GroupStatsItem[] => [
  {
    title: i18n.translate('xpack.securitySolution.assetInventory.grouping.stats.badges.assets', {
      defaultMessage: 'Assets',
    }),
    component: <AssetsCount bucket={bucket} />,
  },
];
