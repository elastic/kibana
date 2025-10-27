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
  EuiTextColor,
} from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/public';
import { useSourcererDataView } from '../../../sourcerer/containers';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from '../../translations';
import type { UIAlertFilter } from './common';

const COMBOBOX_LABEL_MAPPING = {
  user: 'Users',
  host: 'Hosts',
  service: 'Services',
} as const;

const DEFAULT_OPTIONS: Array<{
  label: (typeof COMBOBOX_LABEL_MAPPING)[keyof typeof COMBOBOX_LABEL_MAPPING];
  value: keyof typeof COMBOBOX_LABEL_MAPPING;
}> = [
    { label: COMBOBOX_LABEL_MAPPING.user, value: 'user' },
    { label: COMBOBOX_LABEL_MAPPING.host, value: 'host' },
    { label: COMBOBOX_LABEL_MAPPING.service, value: 'service' },
  ];

interface AlertFiltersKqlBarProps {
  onQueryChange?: (query: Query) => void;
  onFiltersChange?: (filters: Array<UIAlertFilter>) => void;
  filters?: Array<UIAlertFilter>;
  placeholder?: string;
  compressed?: boolean;
  'data-test-subj'?: string;
}

// Custom component to render each filter chip with a combobox
interface CustomFilterChipProps {
  filter: UIAlertFilter;
  onRemove: () => void;
  onEntityTypesChange: (entityTypes: UIAlertFilter['entityTypes']) => void;
}

type ComboBoxOptions = EuiComboBoxOptionOption<UIAlertFilter['entityTypes'][number]>;
const CustomFilterChip: React.FC<CustomFilterChipProps> = ({
  filter,
  onRemove,
  onEntityTypesChange,
}) => {
  const [selectedEntities, setSelectedEntities] = useState<ComboBoxOptions[]>(() =>
    filter.entityTypes.map((et) => ({ label: COMBOBOX_LABEL_MAPPING[et], value: et }))
  );

  const onChange = useCallback(
    (options: ComboBoxOptions[]) => {
      setSelectedEntities(options);
      const entityTypes = options
        .map((opt) => opt.value)
        .filter((et): et is NonNullable<typeof et> => et !== undefined);
      onEntityTypesChange(entityTypes);
    },
    [onEntityTypesChange]
  );

  // Get the display string for the filter
  const filterDisplayString = filter.text;

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
            options={DEFAULT_OPTIONS}
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
            onClick={onRemove}
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
  onFiltersChange,
  filters = [],
  placeholder = i18n.ALERT_FILTERS_PLACEHOLDER,
  compressed = true,
  'data-test-subj': dataTestSubj = 'alertFiltersKqlBar',
}) => {
  const { sourcererDataView } = useSourcererDataView(SourcererScopeName.explore);
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
    data,
  } = useKibana().services;

  const [query, setQuery] = useState<Query>({
    query: '',
    language: 'kuery',
  });

  const [dataView, setDataView] = useState<DataView | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>();

  // Create DataView asynchronously to ensure fields are properly populated
  useEffect(() => {
    let dv: DataView;
    const createDataView = async () => {
      if (sourcererDataView) {
        dv = await data.dataViews.create(sourcererDataView);
        setDataView(dv);
      }
    };
    createDataView();

    return () => {
      if (dv?.id) {
        data.dataViews.clearInstanceCache(dv.id);
      }
    };
  }, [data.dataViews, sourcererDataView]);

  const handleQueryChange = useCallback((payload: { query?: Query }) => {
    if (payload.query) {
      setQuery(payload.query);

      // Validate KQL syntax in real-time
      const queryText =
        typeof payload.query.query === 'string' ? payload.query.query : String(payload.query.query);
      if (queryText.trim() && payload.query.language === 'kuery') {
        try {
          fromKueryExpression(queryText);
          setValidationError(undefined);
        } catch (error) {
          setValidationError(error instanceof Error ? error.message : 'Invalid KQL syntax');
        }
      } else {
        setValidationError(undefined);
      }
    }
  }, []);

  const handleQuerySubmit = useCallback(
    (payload: { query?: Query }) => {
      if (payload.query) {
        const queryText =
          typeof payload.query.query === 'string'
            ? payload.query.query
            : String(payload.query.query);

        // Validate before submitting
        if (queryText.trim() && payload.query.language === 'kuery') {
          try {
            fromKueryExpression(queryText);
            setValidationError(undefined);

            // Add the query as a filter with default entity types (all)
            const newFilter: UIAlertFilter = {
              id: Date.now().toString(),
              text: queryText,
              entityTypes: ['user', 'host', 'service'],
            };
            const updatedFilters = [...filters, newFilter];
            onFiltersChange?.(updatedFilters);

            onQueryChange?.(payload.query);

            // Clear the query input
            setQuery({ query: '', language: 'kuery' });
          } catch (error) {
            setValidationError(error instanceof Error ? error.message : 'Invalid KQL syntax');
          }
        }
      }
    },
    [onQueryChange, onFiltersChange, filters]
  );

  const onRemoveFilter = useCallback(
    (filterToRemove: { id: string; text: string; entityTypes: string[] }) => {
      const updatedFilters = filters.filter((f) => f.id !== filterToRemove.id);
      onFiltersChange?.(updatedFilters);
    },
    [filters, onFiltersChange]
  );

  const onEntityTypesChange = useCallback(
    (filterId: string, entityTypes: UIAlertFilter['entityTypes']) => {
      const updatedFilters = filters.map((f) => (f.id === filterId ? { ...f, entityTypes } : f));
      onFiltersChange?.(updatedFilters);
    },
    [filters, onFiltersChange]
  );

  if (!dataView) {
    return null;
  }

  return (
    <EuiFormRow label={i18n.ALERT_FILTERS_LABEL} display="rowCompressed" fullWidth>
      <div>
        <SearchBar
          appName="siem"
          showFilterBar={false}
          showQueryInput={true}
          showDatePicker={false}
          showQueryMenu={false}
          showSubmitButton={false}
          indexPatterns={[dataView]}
          onQueryChange={handleQueryChange}
          onQuerySubmit={handleQuerySubmit}
          query={query}
          placeholder={placeholder}
          dataTestSubj={dataTestSubj}
        />
        {validationError ? (
          <>
            <EuiSpacer size="xs" />
            <EuiTextColor color="danger" data-test-subj="alertFiltersKqlBarError">
              {validationError}
            </EuiTextColor>
          </>
        ) : null}
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="s">
          {filters.map((filter) => (
            <EuiFlexItem key={filter.id} grow={false}>
              <CustomFilterChip
                filter={filter}
                onRemove={() => onRemoveFilter(filter)}
                onEntityTypesChange={(entityTypes) => onEntityTypesChange(filter.id, entityTypes)}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </div>
    </EuiFormRow>
  );
};
