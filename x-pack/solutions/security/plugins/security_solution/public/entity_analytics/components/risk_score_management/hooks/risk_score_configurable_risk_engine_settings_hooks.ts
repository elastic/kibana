/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useConfigureSORiskEngineMutation } from '../../../api/hooks/use_configure_risk_engine_saved_object';
import * as i18n from '../../../translations';

export interface RiskScoreConfiguration {
  includeClosedAlerts: boolean;
  range: {
    start: string;
    end: string;
  };
}

const settingsAreEqual = (
  first?: Partial<RiskScoreConfiguration>,
  second?: Partial<RiskScoreConfiguration>
) => {
  return (
    first?.includeClosedAlerts === second?.includeClosedAlerts &&
    first?.range?.start === second?.range?.start &&
    first?.range?.end === second?.range?.end
  );
};

const riskEngineSettingsWithDefaults = (riskEngineSettings?: Partial<RiskScoreConfiguration>) => ({
  includeClosedAlerts: riskEngineSettings?.includeClosedAlerts ?? false,
  range: {
    start: riskEngineSettings?.range?.start ?? 'now-30d',
    end: riskEngineSettings?.range?.end ?? 'now',
  },
});

const FETCH_RISK_ENGINE_SETTINGS = ['GET', 'FETCH_RISK_ENGINE_SETTINGS'];

export const useInvalidateRiskEngineSettingsQuery = () => {
  const queryClient = useQueryClient();

  return useCallback(async () => {
    await queryClient.invalidateQueries(FETCH_RISK_ENGINE_SETTINGS, {
      refetchType: 'active',
    });
  }, [queryClient]);
};

export const useConfigurableRiskEngineSettings = () => {
  const { addSuccess } = useAppToasts();

  const { fetchRiskEngineSettings } = useEntityAnalyticsRoutes();

  const [selectedRiskEngineSettings, setSelectedRiskEngineSettings] = useState<
    RiskScoreConfiguration | undefined
  >(undefined);

  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();

  const {
    data: savedRiskEngineSettings,
    isLoading: isLoadingRiskEngineSettings,
    isError,
  } = useQuery(
    FETCH_RISK_ENGINE_SETTINGS,
    async () => {
      const riskEngineSettings = await fetchRiskEngineSettings();
      setSelectedRiskEngineSettings((currentValue) => {
        return currentValue ?? riskEngineSettingsWithDefaults(riskEngineSettings);
      });
      return riskEngineSettings;
    },
    { retry: false, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    // An error case, where we set the selection to default values, is a legitimate and expected part of this flow, particularly when a configuration has never been saved.
    if (isError) {
      setSelectedRiskEngineSettings(riskEngineSettingsWithDefaults());
    }
  }, [isError]);

  const resetSelectedSettings = () => {
    setSelectedRiskEngineSettings(riskEngineSettingsWithDefaults(savedRiskEngineSettings));
  };

  const { mutateAsync: mutateRiskEngineSettingsAsync } = useConfigureSORiskEngineMutation();

  const saveSelectedSettingsMutation = useMutation(async () => {
    if (selectedRiskEngineSettings) {
      await mutateRiskEngineSettingsAsync(
        {
          includeClosedAlerts: selectedRiskEngineSettings.includeClosedAlerts,
          range: {
            start: selectedRiskEngineSettings.range.start,
            end: selectedRiskEngineSettings.range.end,
          },
        },
        {
          onSuccess: () => {
            addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, {
              toastLifeTimeMs: 5000,
            });
          },
        }
      );
      await invalidateRiskEngineSettingsQuery();
    }
  });

  const setSelectedDateSetting = ({ start, end }: { start: string; end: string }) => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, ...{ range: { start, end } } };
    });
  };

  const toggleSelectedClosedAlertsSetting = () => {
    setSelectedRiskEngineSettings((prevState) => {
      if (!prevState) return undefined;
      return { ...prevState, ...{ includeClosedAlerts: !prevState.includeClosedAlerts } };
    });
  };

  const selectedSettingsMatchSavedSettings = settingsAreEqual(
    selectedRiskEngineSettings,
    riskEngineSettingsWithDefaults(savedRiskEngineSettings)
  );

  return {
    savedRiskEngineSettings,
    selectedRiskEngineSettings,
    selectedSettingsMatchSavedSettings,
    resetSelectedSettings,
    setSelectedDateSetting,
    toggleSelectedClosedAlertsSetting,
    saveSelectedSettingsMutation,
    isLoadingRiskEngineSettings,
  };
};
