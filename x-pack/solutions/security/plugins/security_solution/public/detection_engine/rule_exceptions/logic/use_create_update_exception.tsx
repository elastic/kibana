/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef, useState } from 'react';
import type {
  CreateExceptionListItemSchema,
  ExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { useApi } from '@kbn/securitysolution-list-hooks';

import { formatExceptionItemForUpdate } from '../utils/helpers';
import { useKibana } from '../../../common/lib/kibana';

export type CreateOrUpdateExceptionItemsFunc = (
  args: Array<ExceptionListItemSchema | CreateExceptionListItemSchema>
) => Promise<ExceptionListItemSchema[]>;

export type ReturnUseCreateOrUpdateException = [boolean, CreateOrUpdateExceptionItemsFunc | null];

/**
 * Hook for adding and/or updating an exception item
 */
export const useCreateOrUpdateException = (): ReturnUseCreateOrUpdateException => {
  const {
    services: { http },
  } = useKibana();
  const [isLoading, setIsLoading] = useState(false);
  const addOrUpdateExceptionRef = useRef<CreateOrUpdateExceptionItemsFunc | null>(null);
  const { addExceptionListItem, updateExceptionListItem } = useApi(http);

  useEffect(() => {
    const abortCtrl = new AbortController();

    const onCreateOrUpdateExceptionItem: CreateOrUpdateExceptionItemsFunc = async (items) => {
      try {
        setIsLoading(true);
        const itemsAdded = await Promise.all(
          items.map((item: ExceptionListItemSchema | CreateExceptionListItemSchema) => {
            if ('id' in item && item.id != null) {
              const formattedExceptionItem = formatExceptionItemForUpdate(item);
              return updateExceptionListItem({
                listItem: formattedExceptionItem,
              });
            } else {
              return addExceptionListItem({
                listItem: item,
              });
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

    addOrUpdateExceptionRef.current = onCreateOrUpdateExceptionItem;
    return (): void => {
      setIsLoading(false);
      abortCtrl.abort();
    };
  }, [updateExceptionListItem, http, addExceptionListItem]);

  return [isLoading, addOrUpdateExceptionRef.current];
};
