/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback, useEffect } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiText,
  EuiButtonIcon,
  EuiPanel,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import type { Query, Filter } from '@kbn/es-query';
import { KqlFieldSuggestions } from './kql_field_suggestions';
import * as i18n from '../../translations';

// Define the types of entities for the combobox
const ENTITY_OPTIONS = [
  { label: 'Users', value: 'users' },
  { label: 'Hosts', value: 'hosts' },
  { label: 'Services', value: 'services' },
];

interface AlertFiltersKqlBarProps {
  onQueryChange?: (query: Query) => void;
  onSave?: (filters: Array<{ id: string; text: string }>) => void;
  placeholder?: string;
  compressed?: boolean;
  'data-test-subj'?: string;
}

// Custom component to render each filter chip with a combobox
interface CustomFilterChipProps {
  filter: Filter;
  onRemove: (filter: Filter) => void;
}

const CustomFilterChip: React.FC<CustomFilterChipProps> = ({ filter, onRemove }) => {
  const [selectedEntities, setSelectedEntities] =
    useState<EuiComboBoxOptionOption<string>[]>(ENTITY_OPTIONS); // Default to all selected

  const onChange = useCallback((options: EuiComboBoxOptionOption<string>[]) => {
    setSelectedEntities(options);
  }, []);

  // Get the display string for the filter
  const filterDisplayString = filter.meta?.alias || filter.meta?.key || 'Filter';

  // Parse the filter string to separate field name and value
  const parseFilterString = (filterStr: string) => {
    const colonIndex = filterStr.indexOf(':');
    if (colonIndex === -1) {
      return { fieldName: filterStr, value: '' };
    }
    const fieldName = filterStr.substring(0, colonIndex).trim();
    const value = filterStr.substring(colonIndex + 1).trim();
    return { fieldName, value };
  };

  const { fieldName, value } = parseFilterString(filterDisplayString);

  return (
    <EuiPanel hasBorder paddingSize="s" color="subdued" grow={false}>
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
        {/* Field-Value pair in its own chip */}
        <EuiFlexItem grow={false}>
          <EuiPanel
            hasBorder
            paddingSize="xs"
            color="primary"
            grow={false}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <EuiText size="xs">
              {fieldName}
              {':'}
            </EuiText>
            <EuiText size="xs" color="success" style={{ marginLeft: '4px' }}>
              {value}
            </EuiText>
          </EuiPanel>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {i18n.APPLIED_TO_RISK_SCORES_OF}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiComboBox
            options={ENTITY_OPTIONS}
            selectedOptions={selectedEntities}
            onChange={onChange}
            compressed
            isClearable={false}
            singleSelection={false}
            placeholder="Select entities"
            aria-label="Select entity types for filter application"
          />
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="cross"
            color="text"
            onClick={() => onRemove(filter)}
            aria-label={i18n.REMOVE_FILTER}
            size="s"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const AlertFiltersKqlBar: React.FC<AlertFiltersKqlBarProps> = ({
  onQueryChange,
  onSave,
  placeholder = i18n.ALERT_FILTERS_PLACEHOLDER,
  compressed = true,
  'data-test-subj': dataTestSubj = 'alertFiltersKqlBar',
}) => {
  const [query, setQuery] = useState<string>('');
  const [filters, setFilters] = useState<Array<{ id: string; text: string }>>([]);

  // Storage key for persisting filters
  const STORAGE_KEY = 'entity-analytics-alert-filters';

  // Load filters from localStorage on component mount
  useEffect(() => {
    try {
      const savedFilters = localStorage.getItem(STORAGE_KEY);
      if (savedFilters) {
        const parsedFilters = JSON.parse(savedFilters);
        setFilters(parsedFilters);
      }
    } catch (error) {
      // Silently handle localStorage errors
    }
  }, []);

  // Save filters to localStorage whenever filters change
  useEffect(() => {
    try {
      if (filters.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      // Silently handle localStorage errors
    }
  }, [filters]);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setQuery(newQuery);
      onQueryChange?.({ query: newQuery, language: 'kuery' });
    },
    [onQueryChange]
  );

  const handleKeyPress = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter' && query.trim()) {
        const newFilter = {
          id: Date.now().toString(),
          text: query.trim(),
        };
        setFilters((prev) => [...prev, newFilter]);
        setQuery('');
      }
    },
    [query]
  );

  const onRemoveFilter = useCallback((filterToRemove: { id: string; text: string }) => {
    setFilters((prev) => prev.filter((f) => f.id !== filterToRemove.id));
  }, []);

  const handleSave = useCallback(() => {
    onSave?.(filters);
    // Clear localStorage after successful save (assuming save was successful)
    // In a real implementation, you might want to wait for the API response
    localStorage.removeItem(STORAGE_KEY);
  }, [filters, onSave, STORAGE_KEY]);

  return (
    <EuiFormRow label={i18n.ALERT_FILTERS_LABEL} display="rowCompressed" fullWidth>
      <div>
        <KqlFieldSuggestions
          value={query}
          onChange={handleQueryChange}
          onKeyPress={handleKeyPress}
          placeholder={placeholder}
          compressed={compressed}
          data-test-subj={dataTestSubj}
        />
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {filters.map((filter) => (
            <EuiFlexItem key={filter.id} grow={false}>
              <CustomFilterChip
                filter={{ meta: { alias: filter.text, key: 'filter' } } as Filter}
                onRemove={() => onRemoveFilter(filter)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        {filters.length > 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="flexEnd">
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  fill
                  iconType="save"
                  onClick={handleSave}
                  data-test-subj="saveAlertFilters"
                >
                  {i18n.SAVE_FILTERS}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </div>
    </EuiFormRow>
  );
};
