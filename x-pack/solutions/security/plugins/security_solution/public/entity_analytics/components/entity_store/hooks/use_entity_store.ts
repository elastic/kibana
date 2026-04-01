/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';

import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { GetEntityStoreStatusResponse } from '../../../../../common/api/entity_analytics/entity_store/status.gen';
import type { InitEntityStoreRequestBodyInput } from '../../../../../common/api/entity_analytics/entity_store/enable.gen';
import { useKibana } from '../../../../common/lib/kibana/kibana_react';
import { type EntityType } from '../../../../../common/api/entity_analytics';
import { useEntityStoreRoutes } from '../../../api/entity_store';
import { EntityEventTypes } from '../../../../common/lib/telemetry';

const ENTITY_STORE_STATUS = ['GET', 'ENTITY_STORE_STATUS'];

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

interface ResponseError {
  body?: { message?: string };
}

export const INSTALL_ENTITY_STORE_KEY = ['POST', 'INSTALL_ENTITY_STORE'];
export const useInstallEntityStoreMutation = () => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { installEntityStore } = useEntityStoreRoutes();

  return useMutation<unknown, ResponseError, InitEntityStoreRequestBodyInput | void>(
    (params) => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return installEntityStore(params ?? undefined);
    },
    {
      mutationKey: INSTALL_ENTITY_STORE_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
    }
  );
};

export const START_ENTITY_STORE_KEY = ['POST', 'START_ENTITY_STORE'];
export const useStartEntityStoreMutation = (entityTypes?: EntityType[]) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { startEntityStore } = useEntityStoreRoutes();

  return useMutation(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'start',
      });
      return startEntityStore(entityTypes);
    },
    {
      mutationKey: START_ENTITY_STORE_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
    }
  );
};

export const STOP_ENTITY_STORE_KEY = ['POST', 'STOP_ENTITY_STORE'];
export const useStopEntityStoreMutation = (entityTypes?: EntityType[]) => {
  const { telemetry } = useKibana().services;
  const queryClient = useQueryClient();
  const { stopEntityStore } = useEntityStoreRoutes();

  return useMutation(
    () => {
      telemetry?.reportEvent(EntityEventTypes.EntityStoreEnablementToggleClicked, {
        timestamp: new Date().toISOString(),
        action: 'stop',
      });
      return stopEntityStore(entityTypes);
    },
    {
      mutationKey: STOP_ENTITY_STORE_KEY,
      onSuccess: () => queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS }),
    }
  );
};

export const DELETE_ENTITY_STORE_KEY = ['DELETE', 'DELETE_ENTITY_STORE'];
export const useDeleteEntityStoreMutation = ({
  onSuccess,
  entityTypes,
}: {
  onSuccess?: () => void;
  entityTypes?: EntityType[];
}) => {
  const queryClient = useQueryClient();
  const { deleteEntityStore } = useEntityStoreRoutes();

  return useMutation(() => deleteEntityStore(entityTypes), {
    mutationKey: DELETE_ENTITY_STORE_KEY,
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ENTITY_STORE_STATUS });
      onSuccess?.();
    },
  });
};
