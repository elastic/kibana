/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import styled from '@emotion/styled';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextColor,
} from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import { fromKueryExpression } from '@kbn/es-query';
import { PageLoader } from '../../../common/components/page_loader';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from '../../translations';
import type { UIAlertFilter } from './common';
import { PageScope } from '../../../data_view_manager/constants';

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

const ClickablePanelContainer = styled.div`
  max-width: 300px;
  cursor: pointer;
`;

const TruncatedTextWrapper = styled.div<{ maxWidth?: string }>`
  max-width: ${({ maxWidth }) => maxWidth || '150px'};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PopoverContentContainer = styled.div`
  padding: ${({ theme }) => theme.euiTheme.size.xs};
  max-height: 280px;
  overflow: auto;
  word-break: break-word;
  white-space: pre-wrap;
`;

const ComboBoxContainer = styled.div`
  min-width: 200px;
`;

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
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);

  const onChange = useCallback(
    (options: ComboBoxOptions[]) => {
      // Prevent deselecting all options - ensure at least one is selected
      if (options.length === 0) {
        return;
      }
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

  // Check if the query contains AND/OR operators (complex query)
  const hasOperators = /(\s+AND\s+|\s+OR\s+)/i.test(filterDisplayString);

  // For complex queries, display the entire query as-is
  // For simple queries, parse into field:value format
  const { fieldName, value } = hasOperators
    ? { fieldName: '', value: filterDisplayString }
    : (() => {
        const colonIndex = filterDisplayString.indexOf(':');
        if (colonIndex === -1) {
          return { fieldName: filterDisplayString, value: '' };
        }
        const parsedFieldName = filterDisplayString.substring(0, colonIndex).trim();
        const parsedValue = filterDisplayString.substring(colonIndex + 1).trim();
        return { fieldName: parsedFieldName, value: parsedValue };
      })();

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" wrap={false} responsive={false}>
      {/* Field-Value pair in its own chip */}
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isTooltipOpen}
          closePopover={() => setIsTooltipOpen(false)}
          button={
            <ClickablePanelContainer onClick={() => setIsTooltipOpen(true)}>
              <EuiPanel hasBorder paddingSize="xs" grow={false}>
                <EuiFlexGroup alignItems="center" gutterSize="xs" wrap={false} responsive={false}>
                  {fieldName ? (
                    <>
                      <EuiFlexItem grow={false}>
                        <TruncatedTextWrapper maxWidth="150px">
                          <EuiText size="s">{`${fieldName}:\u00A0`}</EuiText>
                        </TruncatedTextWrapper>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <TruncatedTextWrapper maxWidth="150px">
                          <EuiText size="s" color="success">
                            {value}
                          </EuiText>
                        </TruncatedTextWrapper>
                      </EuiFlexItem>
                    </>
                  ) : (
                    <EuiFlexItem grow={false}>
                      <TruncatedTextWrapper maxWidth="250px">
                        <EuiText size="s">{value}</EuiText>
                      </TruncatedTextWrapper>
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="cross"
                      color="text"
                      onClick={onRemove}
                      aria-label={i18n.REMOVE_FILTER}
                      size="xs"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiPanel>
            </ClickablePanelContainer>
          }
          panelStyle={{ maxWidth: '500px', maxHeight: '300px' }}
          anchorPosition="upCenter"
        >
          <PopoverContentContainer>
            <EuiText size="s">{filterDisplayString}</EuiText>
          </PopoverContentContainer>
        </EuiPopover>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.APPLIED_TO_RISK_SCORES_OF}
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ComboBoxContainer>
          <EuiComboBox
            options={DEFAULT_OPTIONS}
            selectedOptions={selectedEntities}
            onChange={onChange}
            compressed={true}
            isClearable={false}
            singleSelection={false}
            placeholder="Select entities"
            aria-label="Select entity types for filter application"
            fullWidth={false}
          />
        </ComboBoxContainer>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const AlertFiltersKqlBar: React.FC<AlertFiltersKqlBarProps> = ({
  onQueryChange,
  onFiltersChange,
  filters = [],
  placeholder = i18n.ALERT_FILTERS_PLACEHOLDER,
  'data-test-subj': dataTestSubj = 'alertFiltersKqlBar',
}) => {
  const { dataView, status } = useDataView(PageScope.explore);

  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana().services;

  const [query, setQuery] = useState<Query>({
    query: '',
    language: 'kuery',
  });

  const [validationError, setValidationError] = useState<string | undefined>();

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

  if (status === 'pristine') {
    return <PageLoader />;
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
