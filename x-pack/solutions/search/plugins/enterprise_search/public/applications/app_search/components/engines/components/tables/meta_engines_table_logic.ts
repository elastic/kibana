/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { recursivelyFetchEngines } from '../../../../utils/recursively_fetch_engines';
import { EngineDetails } from '../../../engine/types';

interface MetaEnginesTableValues {
  expandedRows: { [id: string]: boolean };
  sourceEngines: { [id: string]: EngineDetails[] };
  expandedSourceEngines: { [id: string]: EngineDetails[] };
}

interface MetaEnginesTableActions {
  addSourceEngines(sourceEngines: MetaEnginesTableValues['sourceEngines']): {
    sourceEngines: MetaEnginesTableValues['sourceEngines'];
  };
  displayRow(itemId: string): { itemId: string };
  fetchOrDisplayRow(itemId: string): { itemId: string };
  fetchSourceEngines(engineName: string): { engineName: string };
  hideRow(itemId: string): { itemId: string };
}

export const MetaEnginesTableLogic = kea<
  MakeLogicType<MetaEnginesTableValues, MetaEnginesTableActions>
>({
  path: ['enterprise_search', 'app_search', 'meta_engines_table_logic'],
  actions: () => ({
    addSourceEngines: (sourceEngines) => ({ sourceEngines }),
    displayRow: (itemId) => ({ itemId }),
    hideRow: (itemId) => ({ itemId }),
    fetchOrDisplayRow: (itemId) => ({ itemId }),
    fetchSourceEngines: (engineName) => ({ engineName }),
  }),
  reducers: () => ({
    expandedRows: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        displayRow: (expandedRows, { itemId }) => ({
          ...expandedRows,
          [itemId]: true,
        }),
        // @ts-expect-error upgrade typescript v5.1.6
        hideRow: (expandedRows, { itemId }) => {
          const newRows = { ...expandedRows };
          delete newRows[itemId];
          return newRows;
        },
      },
    ],
    sourceEngines: [
      {},
      {
        // @ts-expect-error upgrade typescript v5.1.6
        addSourceEngines: (currentSourceEngines, { sourceEngines: newSourceEngines }) => ({
          ...currentSourceEngines,
          ...newSourceEngines,
        }),
      },
    ],
  }),
  selectors: {
    expandedSourceEngines: [
      (selectors) => [selectors.sourceEngines, selectors.expandedRows],
      (sourceEngines: MetaEnginesTableValues['sourceEngines'], expandedRows: string[]) => {
        return Object.keys(expandedRows).reduce((expandedRowMap, engineName) => {
          expandedRowMap[engineName] = sourceEngines[engineName];
          return expandedRowMap;
        }, {} as MetaEnginesTableValues['sourceEngines']);
      },
    ],
  },
  listeners: ({ actions, values }) => ({
    fetchOrDisplayRow: ({ itemId }) => {
      const sourceEngines = values.sourceEngines;
      if (sourceEngines[itemId]) {
        actions.displayRow(itemId);
      } else {
        actions.fetchSourceEngines(itemId);
      }
    },
    fetchSourceEngines: ({ engineName }) => {
      recursivelyFetchEngines({
        endpoint: `/internal/app_search/engines/${engineName}/source_engines`,
        onComplete: (sourceEngines) => {
          actions.addSourceEngines({ [engineName]: sourceEngines });
          actions.displayRow(engineName);
        },
      });
    },
  }),
});
