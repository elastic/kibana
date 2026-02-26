/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import { RiskEngineStatusEnum } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../api/hooks/use_init_risk_engine_mutation';
import { useEnableRiskEngineMutation } from '../api/hooks/use_enable_risk_engine_mutation';
import { useDisableRiskEngineMutation } from '../api/hooks/use_disable_risk_engine_mutation';
import {
  useEnableEntityStoreMutation,
  useEntityStoreStatus,
  useStartEntityEngineMutation,
  useStopEntityEngineMutation,
} from '../components/entity_store/hooks/use_entity_store';
import { useEntityStoreTypes } from './use_enabled_entity_types';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
import { useInvalidateRiskEngineSettingsQuery } from '../components/risk_score_management/hooks/use_risk_engine_settings_query';
import {
  useEntityAnalyticsStatus,
  type EntityAnalyticsStatus,
} from './use_entity_analytics_status';
import { safeErrorMessage } from '../common';

const TEN_SECONDS = 10000;
const TOAST_OPTIONS = { toastLifeTimeMs: 5000 };

interface ToggleOptions {
  selectedSettingsMatchSavedSettings: boolean;
  onSaveSettings: () => Promise<void>;
  isSavingSettings: boolean;
}

interface UseToggleEntityAnalyticsReturn {
  status: EntityAnalyticsStatus;
  isLoading: boolean;
  toggle: () => Promise<void>;
  isEntityStoreFeatureFlagDisabled: boolean;
  errors: EntityAnalyticsErrors;
}

interface EntityAnalyticsErrors {
  riskEngine: string[];
  entityStore: string[];
}

export const useToggleEntityAnalytics = ({
  selectedSettingsMatchSavedSettings,
  onSaveSettings,
  isSavingSettings,
}: ToggleOptions): UseToggleEntityAnalyticsReturn => {
  const { addSuccess } = useAppToasts();
  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');

  const riskEngineStatusQuery = useRiskEngineStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false,
  });
  const entityStoreStatusQuery = useEntityStoreStatus({});
  const entityTypes = useEntityStoreTypes();

  const initRiskEngineMutation = useInitRiskEngineMutation({
    onSuccess: async () => {
      await invalidateRiskEngineSettingsQuery();
    },
  });
  const enableRiskEngineMutation = useEnableRiskEngineMutation();
  const disableRiskEngineMutation = useDisableRiskEngineMutation();
  const enableEntityStoreMutation = useEnableEntityStoreMutation();
  const startEntityEngineMutation = useStartEntityEngineMutation(entityTypes);
  const stopEntityEngineMutation = useStopEntityEngineMutation(entityTypes);

  const [isToggling, setIsToggling] = useState(false);

  const isLoading =
    isToggling ||
    initRiskEngineMutation.isLoading ||
    enableRiskEngineMutation.isLoading ||
    disableRiskEngineMutation.isLoading ||
    enableEntityStoreMutation.isLoading ||
    startEntityEngineMutation.isLoading ||
    stopEntityEngineMutation.isLoading ||
    isSavingSettings;

  const riskEngineStatus = riskEngineStatusQuery.data?.risk_engine_status;
  const entityStoreStatus = entityStoreStatusQuery.data?.status;

  const status = useEntityAnalyticsStatus({
    riskEngineStatus,
    entityStoreStatus,
    isEntityStoreFeatureFlagDisabled,
    isMutationLoading: isLoading,
  });

  const unknownError = 'An unknown error occurred';
  const errors: EntityAnalyticsErrors = {
    riskEngine: [
      ...(initRiskEngineMutation.isError
        ? [safeErrorMessage(initRiskEngineMutation.error, unknownError)]
        : []),
      ...(enableRiskEngineMutation.isError
        ? [safeErrorMessage(enableRiskEngineMutation.error, unknownError)]
        : []),
      ...(disableRiskEngineMutation.isError
        ? [safeErrorMessage(disableRiskEngineMutation.error, unknownError)]
        : []),
    ],
    entityStore: [
      ...(enableEntityStoreMutation.isError
        ? [safeErrorMessage(enableEntityStoreMutation.error, unknownError)]
        : []),
      ...(startEntityEngineMutation.isError
        ? [safeErrorMessage(startEntityEngineMutation.error, unknownError)]
        : []),
      ...(stopEntityEngineMutation.isError
        ? [safeErrorMessage(stopEntityEngineMutation.error, unknownError)]
        : []),
    ],
  };

  const toggle = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsToggling(true);
    try {
      const riskOn = riskEngineStatus === RiskEngineStatusEnum.ENABLED;
      const storeOn = !isEntityStoreFeatureFlagDisabled && entityStoreStatus === 'running';
      const isCurrentlyEnabled = riskOn || storeOn;

      if (isCurrentlyEnabled) {
        const disablePromises: Promise<unknown>[] = [];
        if (riskOn) {
          disablePromises.push(disableRiskEngineMutation.mutateAsync(undefined));
        }
        if (storeOn) {
          disablePromises.push(stopEntityEngineMutation.mutateAsync());
        }
        await Promise.all(disablePromises);
        addSuccess(i18n.RISK_ENGINE_TURNED_OFF, TOAST_OPTIONS);
      } else {
        if (riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED || !riskEngineStatus) {
          if (!selectedSettingsMatchSavedSettings) {
            await onSaveSettings();
          }
          await initRiskEngineMutation.mutateAsync(undefined);
        } else if (riskEngineStatus === RiskEngineStatusEnum.DISABLED) {
          await enableRiskEngineMutation.mutateAsync(undefined);
        }

        if (
          !isEntityStoreFeatureFlagDisabled &&
          entityStoreStatus !== 'running' &&
          entityStoreStatus !== 'installing'
        ) {
          if (entityStoreStatus === 'stopped' || entityStoreStatus === 'error') {
            await startEntityEngineMutation.mutateAsync();
          } else {
            await enableEntityStoreMutation.mutateAsync({});
          }
        }

        addSuccess(i18n.RISK_ENGINE_TURNED_ON, TOAST_OPTIONS);
      }
    } catch {
      // Errors are surfaced via mutation.isError states in the error panel
    } finally {
      setIsToggling(false);
    }
  }, [
    isLoading,
    riskEngineStatus,
    entityStoreStatus,
    isEntityStoreFeatureFlagDisabled,
    selectedSettingsMatchSavedSettings,
    onSaveSettings,
    initRiskEngineMutation,
    enableRiskEngineMutation,
    disableRiskEngineMutation,
    enableEntityStoreMutation,
    startEntityEngineMutation,
    stopEntityEngineMutation,
    addSuccess,
  ]);

  return {
    status,
    isLoading: isLoading || riskEngineStatusQuery.isFetching,
    toggle,
    isEntityStoreFeatureFlagDisabled,
    errors,
  };
};
