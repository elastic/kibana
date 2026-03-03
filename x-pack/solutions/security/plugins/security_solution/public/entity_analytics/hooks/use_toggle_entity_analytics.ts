/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import { FF_ENABLE_ENTITY_STORE_V2 } from '@kbn/entity-store/public';

import { RiskEngineStatusEnum } from '../../../common/api/entity_analytics/risk_engine/engine_status_route.gen';
import { StoreStatusEnum } from '../../../common/api/entity_analytics/entity_store/common.gen';
import { useRiskEngineStatus } from '../api/hooks/use_risk_engine_status';
import { useInitRiskEngineMutation } from '../api/hooks/use_init_risk_engine_mutation';
import { useEnableRiskEngineMutation } from '../api/hooks/use_enable_risk_engine_mutation';
import { useDisableRiskEngineMutation } from '../api/hooks/use_disable_risk_engine_mutation';
import {
  useEnableEntityStoreMutation,
  useEntityStoreStatus,
  useEntityStoreStatusV2,
  useStartEntityEngineMutation,
  useStopEntityEngineMutation,
  useInstallEntityStoreMutationV2,
  useStartEntityStoreMutationV2,
  useStopEntityStoreMutationV2,
} from '../components/entity_store/hooks/use_entity_store';
import { useEntityStoreTypes } from './use_enabled_entity_types';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';
import { useKibana } from '../../common/lib/kibana';
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

interface MutationStatus {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
}

const deriveMutationState = (mutations: MutationStatus[]) => ({
  isMutating: mutations.some((m) => m.isLoading),
  errors: mutations.flatMap(({ isError, error }) =>
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
  const { uiSettings } = useKibana().services;
  const invalidateRiskEngineSettingsQuery = useInvalidateRiskEngineSettingsQuery();
  const isEntityStoreFeatureFlagDisabled = useIsExperimentalFeatureEnabled('entityStoreDisabled');
  const isEntityStoreV2Enabled = uiSettings.get<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);

  const riskEngineStatusQuery = useRiskEngineStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false,
  });

  // Only the active version's query runs; the other is disabled via the `enabled` option.
  const v1StoreStatusQuery = useEntityStoreStatus({ enabled: !isEntityStoreV2Enabled });
  const v2StoreStatusQuery = useEntityStoreStatusV2({ enabled: isEntityStoreV2Enabled });
  const entityTypes = useEntityStoreTypes();

  const initRiskEngineMutation = useInitRiskEngineMutation({
    onSuccess: async () => {
      await invalidateRiskEngineSettingsQuery();
    },
  });
  const enableRiskEngineMutation = useEnableRiskEngineMutation();
  const disableRiskEngineMutation = useDisableRiskEngineMutation();

  // All mutation hooks must be called unconditionally (React rules of hooks).
  // Only the active version's mutations are actually invoked at runtime.
  const enableEntityStoreMutation = useEnableEntityStoreMutation();
  const startEntityEngineMutation = useStartEntityEngineMutation(entityTypes);
  const stopEntityEngineMutation = useStopEntityEngineMutation(entityTypes);

  const installEntityStoreMutationV2 = useInstallEntityStoreMutationV2();
  const startEntityStoreMutationV2 = useStartEntityStoreMutationV2();
  const stopEntityStoreMutationV2 = useStopEntityStoreMutationV2();

  const [isToggling, setIsToggling] = useState(false);

  const riskEngineMutations: MutationStatus[] = [
    initRiskEngineMutation,
    enableRiskEngineMutation,
    disableRiskEngineMutation,
  ];

  const v1StoreMutations: MutationStatus[] = [
    enableEntityStoreMutation,
    startEntityEngineMutation,
    stopEntityEngineMutation,
  ];

  const v2StoreMutations: MutationStatus[] = [
    installEntityStoreMutationV2,
    startEntityStoreMutationV2,
    stopEntityStoreMutationV2,
  ];

  const v1Store = {
    status: v1StoreStatusQuery.data?.status,
    ...deriveMutationState(v1StoreMutations),
  };

  const v2Store = {
    status: v2StoreStatusQuery.data?.status,
    ...deriveMutationState(v2StoreMutations),
  };

  const entityStore = isEntityStoreV2Enabled ? v2Store : v1Store;
  const { status: entityStoreStatus } = entityStore;
  const riskEngineState = deriveMutationState(riskEngineMutations);

  const isLoading =
    isToggling || riskEngineState.isMutating || entityStore.isMutating || isSavingSettings;

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
      entityStore: entityStore.errors,
    }),
    [riskEngineState.errors, entityStore.errors]
  );

  const stopEntityStore = useCallback(async () => {
    if (isEntityStoreV2Enabled) {
      await stopEntityStoreMutationV2.mutateAsync();
    } else {
      await stopEntityEngineMutation.mutateAsync();
    }
  }, [isEntityStoreV2Enabled, stopEntityStoreMutationV2, stopEntityEngineMutation]);

  const enableEntityStore = useCallback(async () => {
    if (isEntityStoreV2Enabled) {
      if (entityStoreStatus === StoreStatusEnum.not_installed) {
        await installEntityStoreMutationV2.mutateAsync();
        await startEntityStoreMutationV2.mutateAsync();
      } else if (
        entityStoreStatus === StoreStatusEnum.stopped ||
        entityStoreStatus === StoreStatusEnum.error
      ) {
        await startEntityStoreMutationV2.mutateAsync();
      }
    } else {
      if (
        entityStoreStatus === StoreStatusEnum.stopped ||
        entityStoreStatus === StoreStatusEnum.error
      ) {
        await startEntityEngineMutation.mutateAsync();
      } else if (
        entityStoreStatus !== StoreStatusEnum.running &&
        entityStoreStatus !== StoreStatusEnum.installing
      ) {
        await enableEntityStoreMutation.mutateAsync({});
      }
    }
  }, [
    isEntityStoreV2Enabled,
    entityStoreStatus,
    installEntityStoreMutationV2,
    startEntityStoreMutationV2,
    startEntityEngineMutation,
    enableEntityStoreMutation,
  ]);

  const toggle = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsToggling(true);
    try {
      const riskOn = riskEngineStatus === RiskEngineStatusEnum.ENABLED;
      const storeOn =
        !isEntityStoreFeatureFlagDisabled && entityStoreStatus === StoreStatusEnum.running;
      // When partially_enabled (only one subsystem running), toggle disables whatever is on.
      // The user must toggle again to enable both subsystems together.
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
        if (riskEngineStatus === RiskEngineStatusEnum.NOT_INSTALLED || !riskEngineStatus) {
          if (!selectedSettingsMatchSavedSettings) {
            await onSaveSettings();
          }
          await initRiskEngineMutation.mutateAsync(undefined);
        } else if (riskEngineStatus === RiskEngineStatusEnum.DISABLED) {
          await enableRiskEngineMutation.mutateAsync(undefined);
        }

        if (!isEntityStoreFeatureFlagDisabled) {
          await enableEntityStore();
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
