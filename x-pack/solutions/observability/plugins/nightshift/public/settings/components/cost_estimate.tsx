/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING } from '@kbn/management-settings-ids';
import { useKibana } from '../../hooks/use_kibana';
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

const INSTALL_TOKEN_USAGE_DASHBOARD_URL = '/internal/gen_ai_settings/install_token_usage_dashboard';

export const CostEstimate = () => {
  const quotas = useRunQuotas();
  const [isUpdatingTracking, setIsUpdatingTracking] = useState(false);
  const core = useKibana().services;
  const settingsClient = core.settings.client;
  const tracking$ = useMemo(
    () => settingsClient.get$<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false),
    [settingsClient]
  );
  const trackingEnabled = useObservable(
    tracking$,
    settingsClient.get<boolean>(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, false)
  );
  const canManage = quotas.data?.canManage === true;
  const canSaveAdvancedSettings = core.application.capabilities.advancedSettings?.save === true;
  const cost = useSignificantEventsCost({
    enabled: canManage && !quotas.isError,
  });

  const updateTokenTracking = async (enabled: boolean): Promise<void> => {
    setIsUpdatingTracking(true);
    let updateError: Error | undefined;
    const updateErrorSubscription = settingsClient.getUpdateErrors$().subscribe((error) => {
      updateError = error;
    });

    try {
      const wasSaved = await settingsClient.set(GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING, enabled);
      if (!wasSaved) {
        throw (
          updateError ??
          new Error(
            i18n.translate(
              'xpack.nightshift.settings.costEstimate.enableTrackingFailedErrorMessage',
              { defaultMessage: 'The token tracking setting could not be saved.' }
            )
          )
        );
      }

      if (enabled) {
        try {
          await core.http.post(INSTALL_TOKEN_USAGE_DASHBOARD_URL);
        } catch (error) {
          core.notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.nightshift.settings.costEstimate.installDashboardFailedTitle',
              {
                defaultMessage:
                  'Token tracking was enabled, but the token usage dashboard could not be installed',
              }
            ),
            text: getFormattedError(error).message,
          });
        }
      }
      await cost.refreshCost();
    } catch (error) {
      core.notifications.toasts.addDanger({
        title: enabled
          ? i18n.translate('xpack.nightshift.settings.costEstimate.enableTrackingFailedTitle', {
              defaultMessage: 'Unable to enable token tracking',
            })
          : i18n.translate('xpack.nightshift.settings.costEstimate.disableTrackingFailedTitle', {
              defaultMessage: 'Unable to disable token tracking',
            }),
        text: getFormattedError(error).message,
      });
    } finally {
      updateErrorSubscription.unsubscribe();
      setIsUpdatingTracking(false);
    }
  };

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
        checked={trackingEnabled}
        canSaveAdvancedSettings={canSaveAdvancedSettings}
        isUpdatingTracking={isUpdatingTracking}
        onChange={(enabled) => void updateTokenTracking(enabled)}
      />
      {body && <EuiSpacer size="m" />}
      {body}
    </SettingsSectionRow>
  );
};
