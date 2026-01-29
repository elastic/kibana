/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext, useMemo, useCallback, useEffect, useRef } from 'react';
import type { DurationRange } from '@elastic/eui/src/components/date_picker/types';
import type { OnTimeChangeProps } from '@elastic/eui';
import { UI_SETTINGS } from '@kbn/data-plugin/public';
import {
  findEntityByAttribute,
  findAvailableCuratedMetrics,
  type CuratedMetricQuery,
} from '@kbn/unified-chart-section-viewer';
import { useKibanaUiSetting } from '../../../../hooks/use_kibana_ui_setting';
import { mapKibanaQuickRangesToDatePickerRanges } from '../../../../utils/map_timepicker_quickranges_to_datepicker_ranges';
import {
  useAvailableMetrics,
  type EntityFieldInfo,
  type MetricFieldInfo,
} from '../hooks/use_available_metrics';
import { useCustomMetrics } from '../hooks/use_custom_metrics';
import { useInventoryState, type UseInventoryStateResult } from '../hooks/use_inventory_state';
import { parseEsqlQuery } from '../hooks/use_esql_query_info';
import { addFilterToQuery } from '../utils/esql_query_builder';
import type { CustomMetric, SelectedMetric } from '../types';

export type FilterAction = 'include' | 'exclude';

// ============================================================================
// Types
// ============================================================================

/**
 * Core inventory state and query info
 */
interface InventoryStateContext {
  inventory: UseInventoryStateResult['inventory'];
  currentQuery: UseInventoryStateResult['currentQuery'];
  isQueryManuallyEdited: boolean;
}

/**
 * Modal visibility states
 */
interface ModalStateContext {
  isLegendModalOpen: boolean;
  isSaveQueryModalOpen: boolean;
  editingMetricId: string | null;
}

/**
 * Available field options for selectors
 */
interface FieldOptionsContext {
  entityFields: EntityFieldInfo[];
  metricsForSelectedEntity: MetricFieldInfo[];
  fieldsForGroupBy: EntityFieldInfo[];
  customMetricsForEntity: CustomMetric[];
  curatedMetricsForEntity: CuratedMetricQuery[];
  commonlyUsedRanges: DurationRange[];
}

/**
 * Loading and error states
 */
interface LoadingStateContext {
  isLoadingFields: boolean;
  isLoadingMetrics: boolean;
  isLoadingGroupByFields: boolean;
  fieldsError: Error | null;
}

/**
 * All action handlers from useInventoryState
 */
type InventoryHandlers = Pick<
  UseInventoryStateResult,
  | 'handleQueryChange'
  | 'handleResetQuery'
  | 'handleEntityChange'
  | 'handleUnitChange'
  | 'handleSortChange'
  | 'handleGroupByChange'
  | 'handleTimeRangeChange'
  | 'handleRefresh'
  | 'handleLegendChange'
  | 'openLegendModal'
  | 'closeLegendModal'
  | 'openSaveQueryModal'
  | 'closeSaveQueryModal'
>;

/**
 * Custom metric operations
 */
interface CustomMetricOperations {
  saveCustomMetric: (name: string, query: string, entity: string, unit?: string) => void;
  deleteCustomMetric: (id: string) => void;
  updateCustomMetric: (id: string, updates: Partial<CustomMetric>) => void;
  getCustomMetricById: (id: string) => CustomMetric | undefined;
}

/**
 * Combined context value
 */
interface InventoryContextValue
  extends InventoryStateContext,
    ModalStateContext,
    FieldOptionsContext,
    LoadingStateContext,
    InventoryHandlers,
    CustomMetricOperations {
  // Wrapped metric change handler with sync logic
  handleMetricChange: (metric: SelectedMetric | null) => void;
  // Register refetch callback from useEsqlQuery
  setRefetchCallback: (refetch: () => void) => void;
  // Filter handler for adding WHERE clauses to the query
  handleFilter: (field: string, value: string, action: FilterAction) => void;
}

const InventoryContext = createContext<InventoryContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface InventoryProviderProps {
  children: React.ReactNode;
}

export const InventoryProvider: React.FC<InventoryProviderProps> = ({ children }) => {
  const [timepickerQuickRanges] = useKibanaUiSetting(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);
  const commonlyUsedRanges = mapKibanaQuickRangesToDatePickerRanges(timepickerQuickRanges);

  // Stable default time range
  const defaultTimeRange = useRef({ from: 'now-15m', to: 'now' });

  // Ref to store the refetch callback from useEsqlQuery
  const refetchCallbackRef = useRef<(() => void) | null>(null);

  const setRefetchCallback = useCallback((refetch: () => void) => {
    refetchCallbackRef.current = refetch;
  }, []);

  // Helper to execute refetch
  const executeRefetch = useCallback(() => {
    // Use setTimeout to ensure state updates are processed first
    setTimeout(() => {
      refetchCallbackRef.current?.();
    }, 0);
  }, []);

  // Inventory state (initialize first to get entityField)
  const inventoryState = useInventoryState({});

  // Destructure for easier access
  const { inventory, handleMetricChange: baseHandleMetricChange } = inventoryState;

  // Available metrics and entities
  const {
    entityFields,
    metricsForSelectedEntity,
    fieldsForGroupBy,
    setSelectedEntity,
    setSelectedMetric,
    isLoading: isLoadingFields,
    isLoadingMetrics,
    isLoadingGroupByFields,
    error: fieldsError,
  } = useAvailableMetrics({
    index: 'remote_cluster:metrics-*,metrics-*',
    timeRange: defaultTimeRange.current,
  });

  // Custom metrics - use the current entity from inventory state
  const customMetrics = useCustomMetrics({
    selectedEntity: inventory.entityField,
  });

  // Curated metrics for the selected entity
  const curatedMetricsForEntity = useMemo<CuratedMetricQuery[]>(() => {
    if (!inventory.entityField) return [];

    // Find the entity definition by its identifying attribute
    const entity = findEntityByAttribute(inventory.entityField);
    if (!entity) return [];

    // Get available field names from the metrics for this entity
    const availableFields = metricsForSelectedEntity.map((m) => m.name);

    // Find curated metrics that are available based on the fields in the data
    return findAvailableCuratedMetrics(entity.id, availableFields);
  }, [inventory.entityField, metricsForSelectedEntity]);

  // Sync entity changes to useAvailableMetrics
  useEffect(() => {
    if (inventory.entityField) {
      setSelectedEntity(inventory.entityField);
    }
  }, [inventory.entityField, setSelectedEntity]);

  // Metric change with sync and refetch
  const handleMetricChange = useCallback(
    (metric: SelectedMetric | null) => {
      baseHandleMetricChange(metric);

      if (metric?.isCustom && metric?.customQuery) {
        const queryInfo = parseEsqlQuery(metric.customQuery);
        setSelectedMetric(queryInfo.actualMetricField ?? null);
      } else {
        setSelectedMetric(metric?.name ?? null);
      }

      // Only refetch if both entity and metric are selected
      if (inventory.entityField && metric) {
        executeRefetch();
      }
    },
    [baseHandleMetricChange, setSelectedMetric, inventory.entityField, executeRefetch]
  );

  // Wrapped handlers that call refetch after state update
  const handleEntityChangeWithRefetch = useCallback(
    (entity: string) => {
      inventoryState.handleEntityChange(entity);
      // Don't refetch on entity change alone - wait for metric selection
    },
    [inventoryState]
  );

  const handleSortChangeWithRefetch = useCallback(
    (sort: { field: 'entity' | 'metric'; direction: 'asc' | 'desc' }) => {
      inventoryState.handleSortChange(sort);
      executeRefetch();
    },
    [inventoryState, executeRefetch]
  );

  const handleGroupByChangeWithRefetch = useCallback(
    (groupByFields: string[]) => {
      inventoryState.handleGroupByChange(groupByFields);
      executeRefetch();
    },
    [inventoryState, executeRefetch]
  );

  const handleTimeRangeChangeWithRefetch = useCallback(
    (props: OnTimeChangeProps) => {
      inventoryState.handleTimeRangeChange(props);
      executeRefetch();
    },
    [inventoryState, executeRefetch]
  );

  const handleRefreshWithRefetch = useCallback(() => {
    inventoryState.handleRefresh();
    executeRefetch();
  }, [inventoryState, executeRefetch]);

  const handleResetQueryWithRefetch = useCallback(() => {
    inventoryState.handleResetQuery();
    executeRefetch();
  }, [inventoryState, executeRefetch]);

  // Filter handler - adds WHERE clause to the query
  const handleFilter = useCallback(
    (field: string, value: string, action: FilterAction) => {
      const operator = action === 'include' ? '==' : '!=';
      const currentEsql = inventoryState.currentQuery.esql;
      const newEsql = addFilterToQuery(currentEsql, field, value, operator);
      inventoryState.handleQueryChange({ esql: newEsql });
      executeRefetch();
    },
    [inventoryState, executeRefetch]
  );

  const value = useMemo<InventoryContextValue>(
    () => ({
      // State
      inventory: inventoryState.inventory,
      currentQuery: inventoryState.currentQuery,
      isQueryManuallyEdited: inventoryState.isQueryManuallyEdited,

      // Modal states
      isLegendModalOpen: inventoryState.isLegendModalOpen,
      isSaveQueryModalOpen: inventoryState.isSaveQueryModalOpen,
      editingMetricId: inventoryState.editingMetricId,

      // Field options
      entityFields,
      metricsForSelectedEntity,
      fieldsForGroupBy,
      customMetricsForEntity: customMetrics.customMetricsForEntity,
      curatedMetricsForEntity,
      commonlyUsedRanges,

      // Loading states
      isLoadingFields,
      isLoadingMetrics,
      isLoadingGroupByFields,
      fieldsError,

      // Handlers - use wrapped versions that call refetch
      handleQueryChange: inventoryState.handleQueryChange,
      handleResetQuery: handleResetQueryWithRefetch,
      handleEntityChange: handleEntityChangeWithRefetch,
      handleMetricChange,
      handleUnitChange: inventoryState.handleUnitChange,
      handleSortChange: handleSortChangeWithRefetch,
      handleGroupByChange: handleGroupByChangeWithRefetch,
      handleTimeRangeChange: handleTimeRangeChangeWithRefetch,
      handleRefresh: handleRefreshWithRefetch,
      handleLegendChange: inventoryState.handleLegendChange,
      openLegendModal: inventoryState.openLegendModal,
      closeLegendModal: inventoryState.closeLegendModal,
      openSaveQueryModal: inventoryState.openSaveQueryModal,
      closeSaveQueryModal: inventoryState.closeSaveQueryModal,

      // Custom metrics
      saveCustomMetric: customMetrics.saveCustomMetric,
      deleteCustomMetric: customMetrics.deleteCustomMetric,
      updateCustomMetric: customMetrics.updateCustomMetric,
      getCustomMetricById: customMetrics.getCustomMetricById,

      // Refetch registration
      setRefetchCallback,

      // Filter handler
      handleFilter,
    }),
    [
      inventoryState,
      entityFields,
      metricsForSelectedEntity,
      fieldsForGroupBy,
      customMetrics,
      curatedMetricsForEntity,
      commonlyUsedRanges,
      isLoadingFields,
      isLoadingMetrics,
      isLoadingGroupByFields,
      fieldsError,
      handleMetricChange,
      handleEntityChangeWithRefetch,
      handleResetQueryWithRefetch,
      handleSortChangeWithRefetch,
      handleGroupByChangeWithRefetch,
      handleTimeRangeChangeWithRefetch,
      handleRefreshWithRefetch,
      setRefetchCallback,
      handleFilter,
    ]
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useInventoryContext = (): InventoryContextValue => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventoryContext must be used within an InventoryProvider');
  }
  return context;
};
