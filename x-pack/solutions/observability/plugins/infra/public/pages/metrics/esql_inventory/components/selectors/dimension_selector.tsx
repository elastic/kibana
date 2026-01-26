/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiComboBox,
  EuiFormRow,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DimensionFieldInfo } from '../../hooks/use_available_metrics';

interface DimensionSelectorProps {
  /** Currently selected dimension field */
  value: string;
  /** Callback when dimension changes */
  onChange: (field: string) => void;
  /** Dynamic dimension fields from the index */
  dimensionFields?: DimensionFieldInfo[];
  /** Whether the selector is loading */
  isLoading?: boolean;
  /** Whether the selector is disabled */
  isDisabled?: boolean;
}

interface DimensionOption {
  label: string;
  value: string;
  fieldInfo?: DimensionFieldInfo;
}

export const DimensionSelector: React.FC<DimensionSelectorProps> = ({
  value,
  onChange,
  dimensionFields = [],
  isLoading = false,
  isDisabled = false,
}) => {
  // Convert dimension fields to combo box options
  const options = useMemo<DimensionOption[]>(() => {
    return dimensionFields.map((field) => ({
      label: field.name,
      value: field.name,
      fieldInfo: field,
    }));
  }, [dimensionFields]);

  const selectedOptions = useMemo<DimensionOption[]>(() => {
    const found = options.find((opt) => opt.value === value);
    if (found) {
      return [found];
    }
    // If the current value is not in the options, add it as a custom option
    if (value) {
      return [{ label: value, value }];
    }
    return [];
  }, [options, value]);

  const handleChange = (selected: Array<EuiComboBoxOptionOption<string>>) => {
    if (selected.length > 0 && selected[0].value) {
      onChange(selected[0].value);
    }
  };

  const handleCreate = (searchValue: string) => {
    // Allow users to enter custom field names
    onChange(searchValue);
  };

  // Custom render for options showing TSDS badge
  const renderOption = (option: EuiComboBoxOptionOption<string>) => {
    const fieldInfo = options.find((o) => o.value === option.value)?.fieldInfo;
    const isTimeSeriesDimension = fieldInfo?.isTimeSeriesDimension;
    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={true}>
          <span>{option.label}</span>
        </EuiFlexItem>
        {isTimeSeriesDimension && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.infra.esqlInventory.dimensionSelector.tsdsBadge', {
                defaultMessage: 'TSDS',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  // Convert to EuiComboBox format with unique keys
  const comboBoxOptions: Array<EuiComboBoxOptionOption<string>> = options.map((opt) => ({
    key: opt.value,
    label: opt.label,
    value: opt.value,
  }));

  const comboBoxSelected: Array<EuiComboBoxOptionOption<string>> = selectedOptions.map((opt) => ({
    key: opt.value,
    label: opt.label,
    value: opt.value,
  }));

  return (
    <EuiFormRow
      label={i18n.translate('xpack.infra.esqlInventory.dimensionSelector.label', {
        defaultMessage: 'Dimension',
      })}
      fullWidth
    >
      <EuiComboBox<string>
        singleSelection={{ asPlainText: true }}
        options={comboBoxOptions}
        selectedOptions={comboBoxSelected}
        onChange={handleChange}
        onCreateOption={handleCreate}
        isLoading={isLoading}
        isDisabled={isDisabled}
        renderOption={renderOption}
        placeholder={i18n.translate('xpack.infra.esqlInventory.dimensionSelector.placeholder', {
          defaultMessage: 'Select or type a field name',
        })}
        data-test-subj="esqlInventoryDimensionSelector"
        fullWidth
        compressed
        isClearable
      />
    </EuiFormRow>
  );
};
