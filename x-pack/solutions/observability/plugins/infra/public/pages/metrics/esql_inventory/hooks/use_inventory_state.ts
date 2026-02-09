/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import type { AggregateQuery } from '@kbn/es-query';
import type { OnTimeChangeProps } from '@elastic/eui';
import {
  DEFAULT_STATE,
  type EsqlInventoryState,
  type SelectedMetric,
  type LegendConfig,
  type SortConfig,
} from '../types';
import { buildChartQuery, addSortToQuery, addGroupByToQuery } from '../utils/esql_query_builder';

// =============================================================================
// State Types
// =============================================================================

export interface InventoryGridState {
  /** Main inventory state (index, entity, metric, timeRange, legend) */
  inventory: EsqlInventoryState;
  /** Current query in the editor */
  currentQuery: AggregateQuery;
  /** Whether the query has been manually edited */
  isQueryManuallyEdited: boolean;
  /** Timestamp to trigger data reload */
  lastReloadTime: number;
  /** Legend modal open state */
  isLegendModalOpen: boolean;
  /** Save query modal open state */
  isSaveQueryModalOpen: boolean;
  /** ID of metric being edited (null for new) */
  editingMetricId: string | null;
}

// =============================================================================
// Action Types
// =============================================================================

type InventoryAction =
  | { type: 'SET_ENTITY'; entity: string }
  | { type: 'SET_METRIC'; metric: SelectedMetric | null }
  | { type: 'SET_TIME_RANGE'; from: string; to: string }
  | { type: 'SET_LEGEND'; legend: LegendConfig }
  | { type: 'SET_UNIT'; unit: string }
  | { type: 'SET_SORT'; sort: SortConfig }
  | { type: 'SET_GROUP_BY'; groupByFields: string[] }
  | { type: 'SET_QUERY'; query: AggregateQuery }
  | { type: 'RESET_QUERY'; generatedQuery: string }
  | { type: 'SYNC_GENERATED_QUERY'; generatedQuery: string }
  | { type: 'REFRESH' }
  | { type: 'OPEN_LEGEND_MODAL' }
  | { type: 'CLOSE_LEGEND_MODAL' }
  | { type: 'OPEN_SAVE_MODAL'; metricId?: string }
  | { type: 'CLOSE_SAVE_MODAL' };

// =============================================================================
// Reducer
// =============================================================================

const createInitialState = (): InventoryGridState => ({
  inventory: DEFAULT_STATE,
  currentQuery: { esql: '' },
  isQueryManuallyEdited: false,
  lastReloadTime: Date.now(),
  isLegendModalOpen: false,
  isSaveQueryModalOpen: false,
  editingMetricId: null,
});

const inventoryReducer = (
  state: InventoryGridState,
  action: InventoryAction
): InventoryGridState => {
  switch (action.type) {
    case 'SET_ENTITY':
      return {
        ...state,
        inventory: {
          ...state.inventory,
          entityField: action.entity,
          selectedMetric: null, // Clear metric when entity changes
          groupByFields: [], // Clear group by when entity changes
        },
        isQueryManuallyEdited: false,
      };

    case 'SET_METRIC':
      return {
        ...state,
        inventory: {
          ...state.inventory,
          selectedMetric: action.metric,
          // Clear group by when metric changes as available dimensions may differ
          groupByFields: [],
        },
        isQueryManuallyEdited: false,
      };

    case 'SET_TIME_RANGE':
      return {
        ...state,
        inventory: {
          ...state.inventory,
          timeRange: { from: action.from, to: action.to },
        },
      };

    case 'SET_LEGEND':
      return {
        ...state,
        inventory: {
          ...state.inventory,
          legend: action.legend,
        },
      };

    case 'SET_UNIT':
      if (!state.inventory.selectedMetric) return state;
      return {
        ...state,
        inventory: {
          ...state.inventory,
          selectedMetric: {
            ...state.inventory.selectedMetric,
            unit: action.unit || undefined,
          },
        },
      };

    case 'SET_SORT':
      // Changing sort resets the manually edited flag so the query updates
      return {
        ...state,
        inventory: {
          ...state.inventory,
          sort: action.sort,
        },
        isQueryManuallyEdited: false,
      };

    case 'SET_GROUP_BY':
      // Changing group by resets the manually edited flag so the query updates
      return {
        ...state,
        inventory: {
          ...state.inventory,
          groupByFields: action.groupByFields,
        },
        isQueryManuallyEdited: false,
      };

    case 'SET_QUERY':
      return {
        ...state,
        currentQuery: action.query,
        isQueryManuallyEdited: true,
      };

    case 'RESET_QUERY':
      return {
        ...state,
        currentQuery: { esql: action.generatedQuery },
        isQueryManuallyEdited: false,
      };

    case 'SYNC_GENERATED_QUERY':
      // Only sync if not manually edited
      if (state.isQueryManuallyEdited) return state;
      return {
        ...state,
        currentQuery: { esql: action.generatedQuery },
      };

    case 'REFRESH':
      return {
        ...state,
        lastReloadTime: Date.now(),
      };

    case 'OPEN_LEGEND_MODAL':
      return {
        ...state,
        isLegendModalOpen: true,
      };

    case 'CLOSE_LEGEND_MODAL':
      return {
        ...state,
        isLegendModalOpen: false,
      };

    case 'OPEN_SAVE_MODAL':
      return {
        ...state,
        isSaveQueryModalOpen: true,
        editingMetricId: action.metricId ?? null,
      };

    case 'CLOSE_SAVE_MODAL':
      return {
        ...state,
        isSaveQueryModalOpen: false,
        editingMetricId: null,
      };

    default:
      return state;
  }
};

// =============================================================================
// Hook Interface
// =============================================================================

interface UseInventoryStateParams {
  /** Callback to sync entity selection with useAvailableMetrics hook */
  onEntityChange?: (entity: string) => void;
  /** Callback to update custom metric unit in storage */
  onCustomMetricUnitChange?: (metricId: string, unit: string | undefined) => void;
}

export interface UseInventoryStateResult {
  // State
  state: InventoryGridState;
  inventory: EsqlInventoryState;
  currentQuery: AggregateQuery;
  isQueryManuallyEdited: boolean;
  lastReloadTime: number;
  isLegendModalOpen: boolean;
  isSaveQueryModalOpen: boolean;
  editingMetricId: string | null;

  // Derived values
  generatedQuery: string;

  // Handlers
  handleQueryChange: (query: AggregateQuery) => void;
  handleResetQuery: () => void;
  handleEntityChange: (entity: string) => void;
  handleMetricChange: (metric: SelectedMetric | null) => void;
  handleUnitChange: (unit: string) => void;
  handleSortChange: (sort: SortConfig) => void;
  handleGroupByChange: (groupByFields: string[]) => void;
  handleTimeRangeChange: (props: OnTimeChangeProps) => void;
  handleRefresh: () => void;
  handleLegendChange: (legend: LegendConfig) => void;
  openLegendModal: () => void;
  closeLegendModal: () => void;
  openSaveQueryModal: (metricId?: string) => void;
  closeSaveQueryModal: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export const useInventoryState = ({
  onEntityChange,
  onCustomMetricUnitChange,
}: UseInventoryStateParams = {}): UseInventoryStateResult => {
  const [state, dispatch] = useReducer(inventoryReducer, undefined, createInitialState);

  // Destructure for convenience
  const { inventory, currentQuery, isQueryManuallyEdited, lastReloadTime } = state;
  const { isLegendModalOpen, isSaveQueryModalOpen, editingMetricId } = state;

  // Build the auto-generated query from controls
  const generatedQuery = useMemo(() => {
    if (inventory.selectedMetric?.isCustom && inventory.selectedMetric?.customQuery) {
      // Custom query - apply sort and group by using AST manipulation
      let query = inventory.selectedMetric.customQuery;
      query = addGroupByToQuery(query, inventory.groupByFields);
      query = addSortToQuery(query, inventory.sort);
      return query;
    }
    // Auto-generated query - build with sort and groupBy included
    return buildChartQuery(
      inventory.entityField,
      inventory.selectedMetric,
      inventory.index,
      inventory.sort,
      inventory.groupByFields
    );
  }, [
    inventory.entityField,
    inventory.selectedMetric,
    inventory.index,
    inventory.sort,
    inventory.groupByFields,
  ]);

  // Sync editor query when generated query changes (unless manually edited)
  useEffect(() => {
    dispatch({ type: 'SYNC_GENERATED_QUERY', generatedQuery });
  }, [generatedQuery]);

  // =============================================================================
  // Event Handlers
  // =============================================================================

  const handleQueryChange = useCallback((query: AggregateQuery) => {
    dispatch({ type: 'SET_QUERY', query });
  }, []);

  const handleResetQuery = useCallback(() => {
    dispatch({ type: 'RESET_QUERY', generatedQuery });
  }, [generatedQuery]);

  const handleEntityChange = useCallback(
    (entity: string) => {
      dispatch({ type: 'SET_ENTITY', entity });
      onEntityChange?.(entity);
    },
    [onEntityChange]
  );

  const handleMetricChange = useCallback((metric: SelectedMetric | null) => {
    dispatch({ type: 'SET_METRIC', metric });
  }, []);

  const handleUnitChange = useCallback(
    (unit: string) => {
      dispatch({ type: 'SET_UNIT', unit });
      // Also update in storage if custom metric
      if (inventory.selectedMetric?.isCustom && inventory.selectedMetric?.customId) {
        onCustomMetricUnitChange?.(inventory.selectedMetric.customId, unit || undefined);
      }
    },
    [
      inventory.selectedMetric?.isCustom,
      inventory.selectedMetric?.customId,
      onCustomMetricUnitChange,
    ]
  );

  const handleSortChange = useCallback((sort: SortConfig) => {
    dispatch({ type: 'SET_SORT', sort });
  }, []);

  const handleGroupByChange = useCallback((groupByFields: string[]) => {
    dispatch({ type: 'SET_GROUP_BY', groupByFields });
  }, []);

  const handleTimeRangeChange = useCallback(({ start, end }: OnTimeChangeProps) => {
    dispatch({ type: 'SET_TIME_RANGE', from: start, to: end });
  }, []);

  const handleRefresh = useCallback(() => {
    dispatch({ type: 'REFRESH' });
  }, []);

  const handleLegendChange = useCallback((legend: LegendConfig) => {
    dispatch({ type: 'SET_LEGEND', legend });
  }, []);

  const openLegendModal = useCallback(() => {
    dispatch({ type: 'OPEN_LEGEND_MODAL' });
  }, []);

  const closeLegendModal = useCallback(() => {
    dispatch({ type: 'CLOSE_LEGEND_MODAL' });
  }, []);

  const openSaveQueryModal = useCallback((metricId?: string) => {
    dispatch({ type: 'OPEN_SAVE_MODAL', metricId });
  }, []);

  const closeSaveQueryModal = useCallback(() => {
    dispatch({ type: 'CLOSE_SAVE_MODAL' });
  }, []);

  return {
    // State
    state,
    inventory,
    currentQuery,
    isQueryManuallyEdited,
    lastReloadTime,
    isLegendModalOpen,
    isSaveQueryModalOpen,
    editingMetricId,

    // Derived values
    generatedQuery,

    // Handlers
    handleQueryChange,
    handleResetQuery,
    handleEntityChange,
    handleMetricChange,
    handleUnitChange,
    handleSortChange,
    handleGroupByChange,
    handleTimeRangeChange,
    handleRefresh,
    handleLegendChange,
    openLegendModal,
    closeLegendModal,
    openSaveQueryModal,
    closeSaveQueryModal,
  };
};
