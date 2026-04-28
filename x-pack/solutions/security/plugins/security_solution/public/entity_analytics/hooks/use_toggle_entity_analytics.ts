/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';

import { StoreStatusEnum } from '../../../common/api/entity_analytics/entity_store/common.gen';
import {
  useEntityStoreStatus,
  useInstallEntityStoreMutation,
  useStartEntityStoreMutation,
  useStopEntityStoreMutation,
} from '../components/entity_store/hooks/use_entity_store';
import { useEntityStoreTypes } from './use_enabled_entity_types';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import * as i18n from '../translations';
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

interface UseToggleEntityAnalyticsReturn {
  status: EntityAnalyticsStatus;
  isLoading: boolean;
  toggle: () => Promise<void>;
  errors: EntityAnalyticsErrors;
}

interface EntityAnalyticsErrors {
  entityStore: string[];
}

export const useToggleEntityAnalytics = (): UseToggleEntityAnalyticsReturn => {
  const { addSuccess, addError } = useAppToasts();

  const entityStoreStatusQuery = useEntityStoreStatus({
    refetchInterval: TEN_SECONDS,
    structuralSharing: false,
  });
  const entityTypes = useEntityStoreTypes();

  const installEntityStoreMutation = useInstallEntityStoreMutation();
  const startEntityStoreMutation = useStartEntityStoreMutation(entityTypes);
  const stopEntityStoreMutation = useStopEntityStoreMutation(entityTypes);

  const [isToggling, setIsToggling] = useState(false);

  const entityStoreMutations: OperationStatus[] = [
    installEntityStoreMutation,
    startEntityStoreMutation,
    stopEntityStoreMutation,
  ];

  const entityStoreStatus = entityStoreStatusQuery.data?.status;
  const entityStoreState = summarizeOperations(entityStoreMutations);

  const isLoading = isToggling || entityStoreState.isPending;

  const status = useEntityAnalyticsStatus({
    entityStoreStatus,
    isMutationLoading: isLoading,
  });

  const errors: EntityAnalyticsErrors = useMemo(
    () => ({
      entityStore: entityStoreState.errors,
    }),
    [entityStoreState.errors]
  );

  const stopEntityStore = useCallback(async () => {
    await stopEntityStoreMutation.mutateAsync();
  }, [stopEntityStoreMutation]);

  const enableEntityStore = useCallback(async () => {
    if (entityStoreStatus === StoreStatusEnum.not_installed) {
      // install triggers server-side asyncSetup which starts the engine automatically
      await installEntityStoreMutation.mutateAsync();
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
      const storeOn = entityStoreStatus === StoreStatusEnum.running;
      if (storeOn) {
        await stopEntityStore();
        addSuccess(i18n.ENTITY_ANALYTICS_TURNED_OFF, TOAST_OPTIONS);
      } else {
        await enableEntityStore();
        addSuccess(i18n.ENTITY_ANALYTICS_TURNED_ON, TOAST_OPTIONS);
      }
    } catch (e) {
      addError(e, { title: i18n.ENTITY_ANALYTICS_TOGGLE_ERROR, ...TOAST_OPTIONS });
    } finally {
      setIsToggling(false);
    }
  }, [
    isLoading,
    entityStoreStatus,
    addSuccess,
    addError,
    stopEntityStore,
    enableEntityStore,
  ]);

  return {
    status,
    isLoading,
    toggle,
    errors,
  };
};
