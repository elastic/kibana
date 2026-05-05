/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  CreateExceptionListItemSchema,
  EntriesArray,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsListApiClient } from '../../../services/exceptions_list/exceptions_list_api_client';

export type CreateOrUpdateArtifactsFunction = (
  item: ExceptionListItemSchema | CreateExceptionListItemSchema,
  additionalEntriesGroups: EntriesArray[] | undefined
) => Promise<ExceptionListItemSchema[]>;

/**
 * Hook for adding and/or updating an artifact. It calls multiple create APIs if
 * there are additional entries arrays.
 */
export const useCreateOrUpdateArtifact = (
  apiClient: ExceptionsListApiClient
): {
  isLoading: boolean;
  createOrUpdateArtifact: CreateOrUpdateArtifactsFunction | null;
} => {
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateArtifactRef = useRef<CreateOrUpdateArtifactsFunction | null>(null);

  useEffect(() => {
    const onCreateOrUpdateArtifact: CreateOrUpdateArtifactsFunction = async (
      item,
      additionalEntriesGroups
    ) => {
      try {
        setIsLoading(true);

        const additionalItems: CreateExceptionListItemSchema[] = additionalEntriesGroups
          ? additionalEntriesGroups.map((entries) => ({
              entries,

              name: item.name,
              description: item.description,
              list_id: item.list_id,
              namespace_type: item.namespace_type,
              os_types: item.os_types,
              tags: item.tags,
              type: item.type,
              comments: item.comments,
              expire_time: item.expire_time,
              meta: item.meta,
            }))
          : [];

        const items: (ExceptionListItemSchema | CreateExceptionListItemSchema)[] = [
          item,
          ...additionalItems,
        ];

        const itemsAdded = await Promise.all(
          items.map((_item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
            if ('id' in _item && _item.id != null) {
              return apiClient.update(_item as ExceptionListItemSchema);
            } else {
              return apiClient.create(_item as CreateExceptionListItemSchema);
            }
          })
        );

        setIsLoading(false);

        return itemsAdded;
      } catch (e) {
        setIsLoading(false);
        throw e;
      }
    };

    addOrUpdateArtifactRef.current = onCreateOrUpdateArtifact;

    return (): void => {
      setIsLoading(false);
    };
  }, [apiClient]);

  return { isLoading, createOrUpdateArtifact: addOrUpdateArtifactRef.current };
};
