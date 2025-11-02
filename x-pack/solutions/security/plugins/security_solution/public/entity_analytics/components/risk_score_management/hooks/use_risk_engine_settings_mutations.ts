/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@kbn/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useConfigureSORiskEngineMutation } from '../../../api/hooks/use_configure_risk_engine_saved_object';
import * as i18n from '../../../translations';
import type { RiskScoreConfiguration } from '../common';
import { useInvalidateRiskEngineSettingsQuery } from './use_risk_engine_settings_query';

export const useRiskEngineSettingsMutations = (
  savedRiskEngineSettings?: RiskScoreConfiguration,
  waitingForSaveRefetch?: React.MutableRefObject<boolean>,
  preSaveFilterCount?: React.MutableRefObject<number>
) => {
  const { addSuccess } = useAppToasts();
  const { mutateAsync: mutateRiskEngineSettingsAsync } = useConfigureSORiskEngineMutation();
  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();

  const saveSelectedSettingsMutation = useMutation(
    async (selectedRiskEngineSettings: RiskScoreConfiguration) => {
      await mutateRiskEngineSettingsAsync(
        {
          includeClosedAlerts: selectedRiskEngineSettings.includeClosedAlerts ?? false,
          range: selectedRiskEngineSettings.range,
          enableResetToZero: selectedRiskEngineSettings.enableResetToZero ?? true,
          filters: selectedRiskEngineSettings.filters,
        },
        {
          onSuccess: () => {
            addSuccess(i18n.RISK_ENGINE_SAVED_OBJECT_CONFIGURATION_SUCCESS, {
              toastLifeTimeMs: 5000,
            });
          },
        }
      );

      // Track pre-save state to detect when refetch completes
      if (preSaveFilterCount) {
        preSaveFilterCount.current = savedRiskEngineSettings?.filters?.length || 0;
      }
      if (waitingForSaveRefetch) {
        waitingForSaveRefetch.current = true;
      }

      // Trigger refetch
      await invalidateRiskEngineSettingsQuery();
    }
  );

  return {
    saveSelectedSettingsMutation,
  };
};
