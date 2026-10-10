/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useSignificantEventsCost } from '../hooks/use_significant_events_cost';
import { useRunQuotas } from '../hooks/use_significant_events_run_quotas';
import { getFormattedError } from '../utils/errors';
import { CostData } from './cost_estimate_breakdown';
import {
  CostHeaderActions,
  RetryCallout,
  TokenTrackingSwitch,
  TrackingCoverageCallout,
} from './cost_estimate_details';
import { SettingsSectionRow } from './settings_section';
import type { TokenTrackingForm } from './use_token_tracking_form';

export const CostEstimate = ({ tokenTracking }: { tokenTracking: TokenTrackingForm }) => {
  const quotas = useRunQuotas();
  const canManage = quotas.data?.canManage === true;
  const cost = useSignificantEventsCost({
    enabled: canManage && !quotas.isError,
  });
  const { refreshCost } = cost;
  const previousSavedTracking = useRef(tokenTracking.savedEnabled);

  useEffect(() => {
    if (previousSavedTracking.current === tokenTracking.savedEnabled) {
      return;
    }
    previousSavedTracking.current = tokenTracking.savedEnabled;
    void refreshCost();
  }, [refreshCost, tokenTracking.savedEnabled]);

  if (quotas.isError || quotas.data == null || !canManage) {
    return null;
  }

  const renderBody = () => {
    if (cost.isLoading && !cost.data) {
      return <EuiLoadingSpinner size="m" data-test-subj="nightshiftCostLoading" />;
    }

    if (cost.error && !cost.data) {
      return (
        <RetryCallout
          title={i18n.translate('xpack.nightshift.settings.costEstimate.unavailableErrorTitle', {
            defaultMessage: 'Cost estimate unavailable',
          })}
          body={getFormattedError(cost.error).message}
          onRetry={() => void cost.retryCost()}
        />
      );
    }

    if (cost.data?.unavailableReason === 'pricing') {
      return (
        <RetryCallout
          title={i18n.translate('xpack.nightshift.settings.costEstimate.pricingUnavailableTitle', {
            defaultMessage: 'Unable to fetch pricing data',
          })}
          onRetry={() => void cost.retryCost()}
        />
      );
    }

    if (cost.data?.unavailableReason === 'usage_data') {
      return (
        <RetryCallout
          title={i18n.translate(
            'xpack.nightshift.settings.costEstimate.usageDataUnavailableTitle',
            { defaultMessage: 'Unable to read token usage data' }
          )}
          onRetry={() => void cost.retryCost()}
        />
      );
    }

    if (!cost.data) {
      return null;
    }

    const refreshError = cost.error ? (
      <RetryCallout
        title={i18n.translate('xpack.nightshift.settings.costEstimate.refreshFailedTitle', {
          defaultMessage: 'Unable to refresh cost estimate',
        })}
        body={getFormattedError(cost.error).message}
        onRetry={() => void cost.refreshCost()}
      />
    ) : null;

    if (cost.data.trackingCoverage.status === 'none') {
      return refreshError;
    }

    return (
      <>
        <TrackingCoverageCallout coverage={cost.data.trackingCoverage} />
        {cost.data.trackingCoverage.status === 'partial' ||
        cost.data.trackingCoverage.status === 'unavailable' ? (
          <EuiSpacer size="m" />
        ) : null}
        {refreshError}
        {refreshError ? <EuiSpacer size="m" /> : null}
        <CostData
          data={cost.data}
          isRefreshing={cost.isRefreshing}
          onRefresh={() => void cost.refreshCost()}
        />
      </>
    );
  };

  const body = renderBody();

  return (
    <SettingsSectionRow
      title={
        <span data-test-subj="nightshiftCostHeader">
          {i18n.translate('xpack.nightshift.settings.costEstimate.sectionTitle', {
            defaultMessage: 'Approximate inference cost across all spaces',
          })}
        </span>
      }
      titleAdornment={<CostHeaderActions data={cost.data} />}
      data-test-subj="nightshiftCostSection"
    >
      <TokenTrackingSwitch
        checked={tokenTracking.enabled}
        canSaveAdvancedSettings={tokenTracking.canEdit}
        isUpdatingTracking={tokenTracking.isSaving}
        onChange={tokenTracking.updateEnabled}
      />
      {body && <EuiSpacer size="m" />}
      {body}
    </SettingsSectionRow>
  );
};
