/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseMutationOptions } from '@kbn/react-query';
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { GetEntityStoreStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import type {
  InitEntityStoreRequestBodyInput,
  InitEntityStoreResponse,
} from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import {
  type DeleteEntityEngineResponse,
  type StartEntityEngineResponse,
  type StopEntityEngineResponse,
  type EntityType,
  type StoreStatus,
} from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { EntityEventTypes } from '../../../../common/lib/telemetry';

const ENTITY_STORE_STATUS = ['GET', 'ENTITY_STORE_STATUS'];
const ENTITY_STORE_V2_STATUS = ['GET', 'ENTITY_STORE_V2_STATUS'];

interface ResponseError {
  body: { message: string };
}

interface Options {
  withComponents?: boolean;
  enabled?: boolean;
}

export const useEntityStoreStatus = (opts: Options = {}) => {
  const { getEntityStoreStatus } = useEntityStoreRoutes();

  return useQuery<GetEntityStoreStatusResponse, IHttpFetchError>({
    queryKey: [...ENTITY_STORE_STATUS, opts.withComponents],
    queryFn: () => getEntityStoreStatus(opts.withComponents),
    enabled: opts.enabled !== false,
    refetchInterval: (data) => {
      if (data?.status === 'installing') {
        return 5000;
      }
      return false;
    },
  });
};

export const useEntityStoreStatusV2 = (opts: { enabled?: boolean } = {}) => {
  const { getEntityStoreStatusV2 } = useEntityStoreRoutes();
  const isEnabled = opts.enabled !== false;

  return useQuery<{ status: StoreStatus; engines: unknown[] }, IHttpFetchError>({
    queryKey: ENTITY_STORE_V2_STATUS,
    queryFn: () => getEntityStoreStatusV2(),
    enabled: isEnabled,
    refetchInterval: (data) => {
      if (data?.status === 'installing') {
        return 5000;
      }
      return false;
    },
  });
};

export const ENABLE_STORE_STATUS_KEY = ['POST', 'ENABLE_ENTITY_STORE'];
export const useEnableEntityStoreMutation = (
  options?: UseMutationOptions<
    InitEntityStoreResponse,
    ResponseError,
    InitEntityStoreRequestBodyInput
  >
) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { enableEntityStore } = useEntityStoreRoutes();

  return useMutation<
    InitEntityStoreResponse,
    ResponseError,
    Partial<InitEntityStoreRequestBodyInput>
  >(
    (params) => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return enableEntityStore(params);
    },
    {
      mutationKey: ENABLE_STORE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries(ENTITY_STORE_STATUS),
      ...options,
    }
  );
};

export const START_ENTITY_ENGINE_STATUS_KEY = ['POST', 'START_ENTITY_ENGINE'];
export const useStartEntityEngineMutation = (entityTypes: EntityType[]) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();

  const { startEntityEngine } = useEntityStoreRoutes();
  return useMutation<StartEntityEngineResponse[]>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return Promise.all(entityTypes.map((entityType) => startEntityEngine(entityType)));
    },
    {
      mutationKey: START_ENTITY_ENGINE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
    }
  );
};

export const STOP_ENTITY_ENGINE_STATUS_KEY = ['POST', 'STOP_ENTITY_ENGINE'];
export const useStopEntityEngineMutation = (entityTypes: EntityType[]) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();

  const { stopEntityEngine } = useEntityStoreRoutes();
  return useMutation<StopEntityEngineResponse[]>(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return Promise.all(entityTypes.map((entityType) => stopEntityEngine(entityType)));
    },
    {
      mutationKey: STOP_ENTITY_ENGINE_STATUS_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
    }
  );
};

export const DELETE_ENTITY_ENGINE_STATUS_KEY = ['POST', 'STOP_ENTITY_ENGINE'];
export const useDeleteEntityEngineMutation = ({
  onSuccess,
  entityTypes,
}: {
  onSuccess?: () => void;
  entityTypes: EntityType[];
}) => {
  const queryClient = useQueryClient();
  const { deleteEntityEngine } = useEntityStoreRoutes();

  return useMutation<DeleteEntityEngineResponse[]>(
    () => Promise.all(entityTypes.map((entityType) => deleteEntityEngine(entityType, true))),
    {
      mutationKey: DELETE_ENTITY_ENGINE_STATUS_KEY,
      onSuccess: () => {
        queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS });
        onSuccess?.();
      },
    }
  );
};

export const INSTALL_ENTITY_STORE_V2_KEY = ['POST', 'INSTALL_ENTITY_STORE_V2'];
export const useInstallEntityStoreMutationV2 = () => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { installEntityStoreV2 } = useEntityStoreRoutes();

  return useMutation(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return installEntityStoreV2();
    },
    {
      mutationKey: INSTALL_ENTITY_STORE_V2_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_V2_STATUS }),
    }
  );
};

export const START_ENTITY_STORE_V2_KEY = ['PUT', 'START_ENTITY_STORE_V2'];
export const useStartEntityStoreMutationV2 = () => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { startEntityStoreV2 } = useEntityStoreRoutes();

  return useMutation(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return startEntityStoreV2();
    },
    {
      mutationKey: START_ENTITY_STORE_V2_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_V2_STATUS }),
    }
  );
};

export const STOP_ENTITY_STORE_V2_KEY = ['PUT', 'STOP_ENTITY_STORE_V2'];
export const useStopEntityStoreMutationV2 = () => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { stopEntityStoreV2 } = useEntityStoreRoutes();

  return useMutation(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return stopEntityStoreV2();
    },
    {
      mutationKey: STOP_ENTITY_STORE_V2_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_V2_STATUS }),
    }
  );
};
