/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import type { SavedQuery } from '@kbn/data-plugin/public';
import type { CreateWatchlistRequestBodyInput } from '../../../../../common/api/entity_analytics/watchlists/management/create.gen';
import type { PerTypeState, SourceType, ToggleId } from './rule_based_source_helpers';
import {
  buildEntitySources,
  computeDefaultToggle,
  getToggleButtons,
  splitInitialSources,
  stateFromSource,
  toggleToType,
} from './rule_based_source_helpers';

// Re-export so consumers can keep importing from here
export { ENTITY_FIELD_OPTIONS } from './rule_based_source_helpers';
export type { EntitySourceInput } from './rule_based_source_helpers';

export interface UseRuleBasedSourceStateParams {
  watchlistName: string;
  isEditMode: boolean;
  isManaged: boolean;
  initialEntitySources?: CreateWatchlistRequestBodyInput['entitySources'];
  onFieldChange: <K extends keyof CreateWatchlistRequestBodyInput>(
    key: K,
    value: CreateWatchlistRequestBodyInput[K]
  ) => void;
}

export const useRuleBasedSourceState = ({
  watchlistName,
  isEditMode,
  isManaged,
  initialEntitySources,
  onFieldChange,
}: UseRuleBasedSourceStateParams) => {
  const initialByType = useMemo(
    () => splitInitialSources(isManaged, initialEntitySources),
    [isManaged, initialEntitySources]
  );

  // Both types' state is always maintained — the toggle only picks which to display.
  const [byType, setByType] = useState<Record<SourceType, PerTypeState>>(() => ({
    store: stateFromSource(initialByType.store),
    index: stateFromSource(initialByType.index),
  }));
  const [activeToggle, setActiveToggle] = useState<ToggleId>(() =>
    computeDefaultToggle(initialByType)
  );

  // Hydrate when async data arrives for edit mode
  const [initialized, setInitialized] = useState(
    Boolean(initialByType.store || initialByType.index)
  );

  useEffect(() => {
    if (initialized) return;
    if (!initialByType.store && !initialByType.index) return;
    setByType({
      store: stateFromSource(initialByType.store),
      index: stateFromSource(initialByType.index),
    });
    setActiveToggle(computeDefaultToggle(initialByType));
    setInitialized(true);
  }, [initialized, initialByType]);

  // Derived — which type is currently being viewed / edited.
  const currentType = toggleToType(activeToggle);
  const currentState = byType[currentType];

  // Core updater: patch one type, mark dirty, emit to parent form.
  // Uses the functional updater form of setByType so that rapid calls
  // (e.g. query + index patterns changing in the same React batch)
  // each see the latest state instead of a stale closure value.
  const updateTypeAndEmit = useCallback(
    (type: SourceType, patch: Partial<PerTypeState>) => {
      setByType((prev) => {
        const next: Record<SourceType, PerTypeState> = {
          ...prev,
          [type]: { ...prev[type], ...patch, dirty: true },
        };
        onFieldChange(
          'entitySources',
          buildEntitySources(next, activeToggle, isManaged, watchlistName)
        );
        return next;
      });
    },
    [activeToggle, isManaged, watchlistName, onFieldChange]
  );

  const onToggleChange = useCallback(
    (id: string) => {
      setActiveToggle(id as ToggleId);
      if (!isManaged) {
        onFieldChange(
          'entitySources',
          buildEntitySources(byType, id as ToggleId, isManaged, watchlistName)
        );
      }
    },
    [isManaged, byType, watchlistName, onFieldChange]
  );

  const onQueryChange = useCallback(
    (query: Query) => updateTypeAndEmit(currentType, { filterQuery: query }),
    [currentType, updateTypeAndEmit]
  );

  const onIndexPatternsChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) =>
      updateTypeAndEmit('index', { indexPatterns: selected }),
    [updateTypeAndEmit]
  );

  const onEntityFieldChange = useCallback(
    (value: string) => updateTypeAndEmit('index', { entityField: value }),
    [updateTypeAndEmit]
  );

  const [savedQuery, setSavedQuery] = useState<SavedQuery | undefined>(undefined);

  const toggleButtons = useMemo(
    () =>
      getToggleButtons(isEditMode, isManaged, isManaged ? undefined : initialEntitySources?.[0]),
    [isEditMode, isManaged, initialEntitySources]
  );

  return {
    activeToggle,
    filterQuery: currentState.filterQuery,
    selectedIndexPatterns: currentState.indexPatterns,
    entityField: currentState.entityField,
    isEntityStore: activeToggle === 'entityStore',
    savedQuery,
    toggleButtons,
    onToggleChange,
    onQueryChange,
    onSavedQueryChange: setSavedQuery,
    onIndexPatternsChange,
    onEntityFieldChange,
  };
};
