/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import { RiskEngineStatusEnum } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { StoreStatusEnum } from '../../../common/api/entity_analytics/entity_store/common.gen';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../api/hooks/use_init_risk_engine_mutation';
import { useEnableRiskEngineMutation } from '../api/hooks/use_enable_risk_engine_mutation';
import { useDisableRiskEngineMutation } from '../api/hooks/use_disable_risk_engine_mutation';
import {
  useEntityStoreStatus,
  useInstallEntityStoreMutation,
  useStartEntityStoreMutation,
  useStopEntityStoreMutation,
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
const UNKNOWN_ERROR = 'An unknown error occurred';

interface OperationStatus {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

const summarizeOperations = (operations: OperationStatus[]) => ({
  isPending: operations.some((op) => op.isLoading),
  errors: operations.flatMap(({ isError, error }) =>
    isError ? [safeErrorMessage(error, UNKNOWN_ERROR)] : []
  ),
});

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
  const { addSuccess, addError } = useAppToasts();
  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');

  const riskEngineStatusQuery = useRiskEngineStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false,
  });

  const entityStoreStatusQuery = useEntityStoreStatus();
  const entityTypes = useEntityStoreTypes();

  const initRiskEngineMutation = useInitRiskEngineMutation({
    onSuccess: async () => {
      await invalidateRiskEngineSettingsQuery();
    },
  });
  const enableRiskEngineMutation = useEnableRiskEngineMutation();
  const disableRiskEngineMutation = useDisableRiskEngineMutation();

  const installEntityStoreMutation = useInstallEntityStoreMutation();
  const startEntityStoreMutation = useStartEntityStoreMutation(entityTypes);
  const stopEntityStoreMutation = useStopEntityStoreMutation(entityTypes);

  const [isToggling, setIsToggling] = useState(false);

  const riskEngineMutations: OperationStatus[] = [
    initRiskEngineMutation,
    enableRiskEngineMutation,
    disableRiskEngineMutation,
  ];

  const entityStoreMutations: OperationStatus[] = [
    installEntityStoreMutation,
    startEntityStoreMutation,
    stopEntityStoreMutation,
  ];

  const entityStoreStatus = entityStoreStatusQuery.data?.status;
  const riskEngineState = summarizeOperations(riskEngineMutations);
  const entityStoreState = summarizeOperations(entityStoreMutations);

  const isLoading =
    isToggling || riskEngineState.isPending || entityStoreState.isPending || isSavingSettings;

  const riskEngineStatus = riskEngineStatusQuery.data?.risk_engine_status;

  const status = useEntityAnalyticsStatus({
    riskEngineStatus,
    entityStoreStatus,
    isEntityStoreFeatureFlagDisabled,
    isMutationLoading: isLoading,
  });

  const errors: EntityAnalyticsErrors = useMemo(
    () => ({
      riskEngine: riskEngineState.errors,
      entityStore: entityStoreState.errors,
    }),
    [riskEngineState.errors, entityStoreState.errors]
  );

  const stopEntityStore = useCallback(async () => {
    await stopEntityStoreMutation.mutateAsync();
  }, [stopEntityStoreMutation]);

  const enableEntityStore = useCallback(async () => {
    if (entityStoreStatus === StoreStatusEnum.not_installed) {
      await installEntityStoreMutation.mutateAsync();
      await startEntityStoreMutation.mutateAsync();
    } else if (
      entityStoreStatus === StoreStatusEnum.stopped ||
      entityStoreStatus === StoreStatusEnum.error
    ) {
      await startEntityStoreMutation.mutateAsync();
    }
  }, [entityStoreStatus, installEntityStoreMutation, startEntityStoreMutation]);

  const toggle = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsToggling(true);
    try {
      const riskOn = riskEngineStatus === RiskEngineStatusEnum.ENABLED;
      const storeOn =
        !isEntityStoreFeatureFlagDisabled && entityStoreStatus === StoreStatusEnum.running;
      const isCurrentlyEnabled = riskOn || storeOn;

      if (isCurrentlyEnabled) {
        const disablePromises: Promise<unknown>[] = [];
        if (riskOn) {
          disablePromises.push(disableRiskEngineMutation.mutateAsync(undefined));
        }
        if (storeOn) {
          disablePromises.push(stopEntityStore());
        }
        await Promise.all(disablePromises);
        addSuccess(i18n.ENTITY_ANALYTICS_TURNED_OFF, TOAST_OPTIONS);
      } else {
        if (!isEntityStoreFeatureFlagDisabled) {
          await enableEntityStore();
        }

        if (riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED || !riskEngineStatus) {
          if (!selectedSettingsMatchSavedSettings) {
            await onSaveSettings();
          }
          await initRiskEngineMutation.mutateAsync(undefined);
        } else if (riskEngineStatus === RiskEngineStatusEnum.DISABLED) {
          await enableRiskEngineMutation.mutateAsync(undefined);
        }

        addSuccess(i18n.ENTITY_ANALYTICS_TURNED_ON, TOAST_OPTIONS);
      }
    } catch (e) {
      addError(e, { title: i18n.ENTITY_ANALYTICS_TOGGLE_ERROR, ...TOAST_OPTIONS });
    } finally {
      setIsToggling(false);
    }
  }, [
    isLoading,
    riskEngineStatus,
    entityStoreStatus,
    isEntityStoreFeatureFlagDisabled,
    addSuccess,
    addError,
    disableRiskEngineMutation,
    stopEntityStore,
    selectedSettingsMatchSavedSettings,
    initRiskEngineMutation,
    onSaveSettings,
    enableRiskEngineMutation,
    enableEntityStore,
  ]);

  return {
    status,
    isLoading,
    toggle,
    isEntityStoreFeatureFlagDisabled,
    errors,
  };
};
