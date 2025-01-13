/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { type GlobalWidgetParameters } from '@kbn/investigate-plugin/public';
import { GetInvestigationResponse, InvestigationItem, Item } from '@kbn/investigation-shared';
import { EcsFieldsResponse } from '@kbn/rule-registry-plugin/common';
import { isEqual } from 'lodash';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAddInvestigationItem } from '../../../hooks/use_add_investigation_item';
import { useDeleteInvestigationItem } from '../../../hooks/use_delete_investigation_item';
import { useFetchAlert } from '../../../hooks/use_fetch_alert';
import { useFetchInvestigation } from '../../../hooks/use_fetch_investigation';
import { useKibana } from '../../../hooks/use_kibana';
import { useUpdateInvestigation } from '../../../hooks/use_update_investigation';

export type RenderedInvestigationItem = InvestigationItem & {
  loading: boolean;
  element: React.ReactNode;
};

interface InvestigationContextProps {
  investigation?: GetInvestigationResponse;
  alert?: EcsFieldsResponse;
  renderableItems: RenderedInvestigationItem[];
  globalParams: GlobalWidgetParameters;
  updateInvestigationParams: (params: GlobalWidgetParameters) => Promise<void>;
  addItem: (item: Item) => Promise<void>;
  deleteItem: (itemId: string) => Promise<void>;
  isAddingItem: boolean;
  isDeletingItem: boolean;
}

export const InvestigationContext = createContext<InvestigationContextProps>({
  renderableItems: [],
  globalParams: { timeRange: { from: '', to: '' } },
  investigation: undefined,
  updateInvestigationParams: async () => {},
  addItem: async () => {},
  deleteItem: async () => {},
  isAddingItem: false,
  isDeletingItem: false,
});

export function useInvestigation() {
  return useContext(InvestigationContext);
}

export function InvestigationProvider({
  initialInvestigation,
  children,
}: {
  initialInvestigation: GetInvestigationResponse;
  children: React.ReactNode;
}) {
  const {
    dependencies: {
      start: { investigate },
    },
  } = useKibana();

  const { data: investigation, refetch } = useFetchInvestigation({
    id: initialInvestigation.id,
    initialInvestigation,
  });
  const { data: alert } = useFetchAlert({ investigation });

  const cache = useRef<
    Record<string, { globalParams: GlobalWidgetParameters; item: RenderedInvestigationItem }>
  >({});

  const { mutateAsync: updateInvestigation } = useUpdateInvestigation();
  const { mutateAsync: addInvestigationItem, isLoading: isAddingItem } = useAddInvestigationItem();
  const { mutateAsync: deleteInvestigationItem, isLoading: isDeletingItem } =
    useDeleteInvestigationItem();

  const [renderableItems, setRenderableItems] = useState<RenderedInvestigationItem[]>([]);
  const [globalParams, setGlobalParams] = useState<GlobalWidgetParameters>({
    timeRange: {
      from: new Date(initialInvestigation.params.timeRange.from).toISOString(),
      to: new Date(initialInvestigation.params.timeRange.to).toISOString(),
    },
  });

  const updateInvestigationParams = async (nextGlobalParams: GlobalWidgetParameters) => {
    const timeRange = {
      from: new Date(nextGlobalParams.timeRange.from).getTime(),
      to: new Date(nextGlobalParams.timeRange.to).getTime(),
    };

    await updateInvestigation({
      investigationId: initialInvestigation.id,
      payload: { params: { timeRange } },
    });
    setGlobalParams(nextGlobalParams);
  };

  const addItem = async (item: Item) => {
    await addInvestigationItem({ investigationId: initialInvestigation.id, item });
    refetch();
  };

  const deleteItem = async (itemId: string) => {
    await deleteInvestigationItem({ investigationId: initialInvestigation.id, itemId });
    refetch();
  };

  useEffect(() => {
    async function renderItems(currItems: InvestigationItem[]) {
      return await Promise.all(
        currItems.map(async (item) => {
          const itemDefinition = investigate.getItemDefinitionByType(item.type);
          if (!itemDefinition) {
            return Promise.resolve({
              ...item,
              loading: false,
              element: (
                <div>
                  {i18n.translate('xpack.investigateApp.renderableItems.div.notFoundLabel', {
                    defaultMessage: 'Not found for type {type}',
                    values: { type: item.type },
                  })}
                </div>
              ),
            });
          }

          const cacheItem = cache.current?.[item.id];
          if (cacheItem && isEqual(cacheItem.globalParams, globalParams)) {
            return cacheItem.item;
          }

          const data = await itemDefinition.generate({
            itemParams: item.params,
            globalParams,
          });

          const renderedItem = {
            ...item,
            loading: false,
            element: itemDefinition.render({
              data,
              globalParams,
              itemParams: item.params,
            }),
          };

          cache.current[item.id] = {
            globalParams,
            item: renderedItem,
          };

          return renderedItem;
        })
      );
    }

    if (investigation?.items) {
      renderItems(investigation.items).then((nextRenderableItems) =>
        setRenderableItems(nextRenderableItems)
      );
    }
  }, [investigation?.items, investigate, globalParams]);

  return (
    <InvestigationContext.Provider
      value={{
        renderableItems,
        updateInvestigationParams,
        investigation,
        alert: alert ?? undefined,
        globalParams,
        addItem,
        deleteItem,
        isAddingItem,
        isDeletingItem,
      }}
    >
      {children}
    </InvestigationContext.Provider>
  );
}
