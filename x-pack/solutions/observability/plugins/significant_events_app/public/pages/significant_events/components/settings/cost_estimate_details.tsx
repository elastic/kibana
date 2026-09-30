/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  CostCaveat,
  CostResponse,
  TokenTrackingCoverage,
} from '@kbn/significant-events-plugin/common';

type DisplayedCostCaveat = Exclude<CostCaveat, 'usd_assumed'>;

const DEFAULT_DISPLAYED_CAVEATS: readonly DisplayedCostCaveat[] = [
  'eis_pricing_assumed',
  'excludes_embeddings',
  'excludes_failed_calls',
  'excludes_cache_writes',
  'tracking_not_all_spaces',
];

const isDisplayedCostCaveat = (caveat: CostCaveat): caveat is DisplayedCostCaveat =>
  caveat !== 'usd_assumed';

const caveatText = (caveat: DisplayedCostCaveat, tierCrossingCount: number): string => {
  switch (caveat) {
    case 'eis_pricing_assumed':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.eisPricingAssumedDescription',
        {
          defaultMessage: 'Prices are based on Elastic Inference Service list rates.',
        }
      );
    case 'excludes_embeddings':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.excludesEmbeddingsDescription',
        { defaultMessage: 'Embedding and rerank inference is excluded.' }
      );
    case 'excludes_failed_calls':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.excludesFailedCallsDescription',
        {
          defaultMessage: 'Calls that fail before token usage is recorded are excluded.',
        }
      );
    case 'excludes_cache_writes':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.excludesCacheWritesDescription',
        {
          defaultMessage: 'Cache-write tokens are excluded because Kibana does not record them.',
        }
      );
    case 'tracking_not_all_spaces':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.trackingNotAllSpacesDescription',
        {
          defaultMessage:
            'Token tracking is not enabled in every space. Calls made while tracking was disabled are not included.',
        }
      );
    case 'prices_stale':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.pricesStaleDescription',
        {
          defaultMessage: 'Price data is outdated; estimates may not reflect current rates.',
        }
      );
    case 'tier_crossings_detected':
      return i18n.translate(
        'xpack.significantEventsApp.settings.costEstimate.tierCrossingsDetectedDescription',
        {
          defaultMessage:
            'Estimate uses lower-tier pricing; {count, plural, one {# call exceeded} other {# calls exceeded}} the tier threshold.',
          values: { count: tierCrossingCount },
        }
      );
  }
};

const CostDetailsTooltip = ({ data }: { data?: CostResponse }) => {
  const caveats = data ? data.caveats.filter(isDisplayedCostCaveat) : DEFAULT_DISPLAYED_CAVEATS;
  const monthTierCrossings =
    data?.month.groups.reduce((sum, group) => sum + group.tierCrossingCount, 0) ?? 0;
  const ariaLabel = i18n.translate(
    'xpack.significantEventsApp.settings.costEstimate.detailsTooltipAriaLabel',
    { defaultMessage: 'Cost estimate details' }
  );

  return (
    <EuiIconTip
      aria-label={ariaLabel}
      type="info"
      color="subdued"
      size="s"
      anchorProps={{
        'data-test-subj': 'significantEventsCostDetailsTooltip',
      }}
      content={
        <EuiText size="xs">
          <ul data-test-subj="significantEventsCostDetails">
            {caveats.map((caveat) => (
              <li key={caveat}>{caveatText(caveat, monthTierCrossings)}</li>
            ))}
          </ul>
        </EuiText>
      }
    />
  );
};

const CoverageBadge = ({ coverage }: { coverage: TokenTrackingCoverage }) => {
  const label =
    coverage.status === 'unavailable'
      ? i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageUnavailableLabel',
          { defaultMessage: 'Tracking coverage unavailable' }
        )
      : i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageBadgeLabel',
          {
            defaultMessage:
              '{enabled} of {total} {total, plural, one {space} other {spaces}} tracked',
            values: {
              enabled: coverage.enabledSpaceCount,
              total: coverage.totalSpaceCount,
            },
          }
        );

  return (
    <EuiBadge
      color={
        coverage.status === 'full'
          ? 'success'
          : coverage.status === 'partial'
          ? 'warning'
          : 'hollow'
      }
      data-test-subj="significantEventsTokenTrackingCoverage"
    >
      {label}
    </EuiBadge>
  );
};

export const CostHeaderActions = ({ data }: { data?: CostResponse }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <CostDetailsTooltip data={data} />
    </EuiFlexItem>
    {data ? (
      <EuiFlexItem grow={false}>
        <CoverageBadge coverage={data.trackingCoverage} />
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);

export const TrackingCoverageCallout = ({ coverage }: { coverage: TokenTrackingCoverage }) => {
  if (coverage.status === 'full' || coverage.status === 'none') {
    return null;
  }

  const title =
    coverage.status === 'unavailable'
      ? i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageUnavailableTitle',
          { defaultMessage: 'Unable to determine token tracking coverage' }
        )
      : i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoveragePartialTitle',
          {
            defaultMessage:
              'Token tracking is enabled in {enabled} of {total} {total, plural, one {space} other {spaces}}',
            values: {
              enabled: coverage.enabledSpaceCount,
              total: coverage.totalSpaceCount,
            },
          }
        );

  return (
    <EuiCallOut
      color="warning"
      iconType="info"
      title={title}
      data-test-subj="significantEventsTrackingCoverageCallout"
    >
      <p>
        {i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.trackingCoverageDescription',
          {
            defaultMessage:
              'This deployment-wide estimate includes all Significant Events calls recorded during the selected period. Calls made while tracking was disabled are not included.',
          }
        )}
      </p>
    </EuiCallOut>
  );
};

export const EnableTrackingButton = ({
  canSaveAdvancedSettings,
  isEnablingTracking,
  onEnable,
}: {
  canSaveAdvancedSettings: boolean;
  isEnablingTracking: boolean;
  onEnable: () => void;
}) => (
  <EuiToolTip
    content={
      canSaveAdvancedSettings
        ? undefined
        : i18n.translate(
            'xpack.significantEventsApp.settings.costEstimate.enableTrackingPermissionTooltip',
            {
              defaultMessage:
                'You need permission to save Advanced Settings before you can enable token tracking.',
            }
          )
    }
  >
    <span
      tabIndex={canSaveAdvancedSettings ? undefined : 0}
      css={{ display: 'inline-block' }}
      data-test-subj="significantEventsEnableTokenTrackingTooltipAnchor"
    >
      <EuiButton
        fill
        isLoading={isEnablingTracking}
        isDisabled={!canSaveAdvancedSettings}
        onClick={onEnable}
        data-test-subj="significantEventsEnableTokenTrackingButton"
      >
        {i18n.translate(
          'xpack.significantEventsApp.settings.costEstimate.enableTrackingButtonLabel',
          { defaultMessage: 'Enable token tracking in this space' }
        )}
      </EuiButton>
    </span>
  </EuiToolTip>
);

export const RetryCallout = ({
  title,
  body,
  onRetry,
}: {
  title: string;
  body?: string;
  onRetry: () => void;
}) => (
  <EuiCallOut announceOnMount color="danger" iconType="error" title={title}>
    {body ? <p>{body}</p> : null}
    <EuiButton size="s" onClick={onRetry} data-test-subj="significantEventsCostRetryButton">
      {i18n.translate('xpack.significantEventsApp.settings.costEstimate.retryButtonLabel', {
        defaultMessage: 'Retry',
      })}
    </EuiButton>
  </EuiCallOut>
);
