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
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CuratedMetricQuery } from '@kbn/unified-chart-section-viewer';
import type { MetricFieldInfo } from '../../hooks/use_available_metrics';
import type { SelectedMetric, MetricInstrument, CustomMetric } from '../../types';

interface MetricSelectorProps {
  metricFields: MetricFieldInfo[];
  customMetrics?: CustomMetric[];
  curatedMetrics?: CuratedMetricQuery[];
  selectedMetric: SelectedMetric | null;
  onChange: (metric: SelectedMetric | null) => void;
  onDeleteCustomMetric?: (id: string) => void;
  isLoading?: boolean;
  isDisabled?: boolean;
}

interface MetricOptionValue {
  name: string;
  type: string;
  instrument?: string;
  unit?: string;
  isCustom?: boolean;
  customQuery?: string;
  customId?: string;
  isManaged?: boolean;
  curatedMetric?: CuratedMetricQuery;
}

type MetricOption = EuiComboBoxOptionOption<MetricOptionValue>;

export const MetricSelector: React.FC<MetricSelectorProps> = ({
  metricFields,
  customMetrics = [],
  curatedMetrics = [],
  selectedMetric,
  onChange,
  onDeleteCustomMetric,
  isLoading = false,
  isDisabled = false,
}) => {
  // Convert metric fields and custom metrics to combo box options with groups
  const options = useMemo<MetricOption[]>(() => {
    const result: MetricOption[] = [];

    // Add managed (curated) metrics group if there are any
    if (curatedMetrics.length > 0) {
      result.push({
        key: 'managed-metrics-group',
        label: i18n.translate('xpack.infra.esqlInventory.metricSelector.managedMetricsGroup', {
          defaultMessage: 'Managed Metrics',
        }),
        options: curatedMetrics.map((cm) => ({
          key: `managed-${cm.id}`,
          label: cm.displayName,
          value: {
            name: cm.displayName,
            type: 'managed',
            instrument: cm.instrument,
            unit: cm.unit,
            isManaged: true,
            curatedMetric: cm,
          },
        })),
      });
    }

    // Add custom metrics group if there are any
    if (customMetrics.length > 0) {
      result.push({
        key: 'custom-metrics-group',
        label: i18n.translate('xpack.infra.esqlInventory.metricSelector.customMetricsGroup', {
          defaultMessage: 'Custom Metrics',
        }),
        options: customMetrics.map((cm) => ({
          key: `custom-${cm.id}`,
          label: cm.name,
          value: {
            name: cm.name,
            type: 'custom',
            isCustom: true,
            customQuery: cm.query,
            customId: cm.id,
            unit: cm.unit,
          },
        })),
      });
    }

    // Add standard metrics group
    if (metricFields.length > 0) {
      result.push({
        key: 'standard-metrics-group',
        label: i18n.translate('xpack.infra.esqlInventory.metricSelector.standardMetricsGroup', {
          defaultMessage: 'Standard Metrics',
        }),
        options: metricFields.map((field) => ({
          key: `standard-${field.name}`,
          label: field.name,
          value: {
            name: field.name,
            type: field.type,
            instrument: field.instrument,
            unit: field.unit,
          },
        })),
      });
    }

    return result;
  }, [metricFields, customMetrics, curatedMetrics]);

  // Flatten options for finding selected option
  const flatOptions = useMemo(() => {
    const flat: MetricOption[] = [];
    for (const group of options) {
      if (group.options) {
        flat.push(...group.options);
      } else {
        flat.push(group);
      }
    }
    return flat;
  }, [options]);

  // Find currently selected option
  const selectedOptions = useMemo<MetricOption[]>(() => {
    if (!selectedMetric) return [];

    const found = flatOptions.find((opt) => {
      if (selectedMetric.isManaged) {
        return (
          opt.value?.isManaged && opt.value?.curatedMetric?.id === selectedMetric.curatedMetric?.id
        );
      }
      if (selectedMetric.isCustom) {
        return opt.value?.isCustom && opt.value?.name === selectedMetric.name;
      }
      return (
        !opt.value?.isCustom && !opt.value?.isManaged && opt.value?.name === selectedMetric.name
      );
    });
    return found ? [found] : [];
  }, [selectedMetric, flatOptions]);

  const handleChange = (selected: MetricOption[]) => {
    if (selected.length === 0 || !selected[0].value) {
      onChange(null);
    } else {
      const value = selected[0].value;
      onChange({
        name: value.name,
        type: value.type,
        instrument: value.instrument as MetricInstrument,
        unit: value.unit,
        isCustom: value.isCustom,
        customQuery: value.customQuery,
        customId: value.customId,
        isManaged: value.isManaged,
        curatedMetric: value.curatedMetric,
      });
    }
  };

  // Custom render for options showing instrument badge or custom/managed badge
  const renderOption = (option: MetricOption) => {
    const value = option.value;
    const isCustom = value?.isCustom;
    const isManaged = value?.isManaged;
    const instrument = value?.instrument;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={true}>
          <span>{option.label}</span>
        </EuiFlexItem>
        {isManaged && (
          <EuiFlexItem grow={false}>
            <EuiBadge color="success">
              {i18n.translate('xpack.infra.esqlInventory.metricSelector.managedBadge', {
                defaultMessage: 'Managed',
              })}
            </EuiBadge>
          </EuiFlexItem>
        )}
        {isCustom && (
          <>
            <EuiFlexItem grow={false}>
              <EuiBadge color="accent">
                {i18n.translate('xpack.infra.esqlInventory.metricSelector.customBadge', {
                  defaultMessage: 'Custom',
                })}
              </EuiBadge>
            </EuiFlexItem>
            {onDeleteCustomMetric && value?.customId && (
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.infra.esqlInventory.metricSelector.deleteCustomMetric',
                    { defaultMessage: 'Delete custom metric' }
                  )}
                >
                  <EuiButtonIcon
                    data-test-subj="infraRenderOptionButton"
                    iconType="trash"
                    color="danger"
                    aria-label={i18n.translate(
                      'xpack.infra.esqlInventory.metricSelector.deleteAriaLabel',
                      { defaultMessage: 'Delete custom metric' }
                    )}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onDeleteCustomMetric(value.customId!);
                    }}
                    size="xs"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            )}
          </>
        )}
        {!isCustom && !isManaged && instrument && (
          <EuiFlexItem grow={false}>
            <EuiBadge color={instrument === 'counter' ? 'primary' : 'hollow'}>
              {instrument}
            </EuiBadge>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.infra.esqlInventory.metricSelector.label', {
        defaultMessage: 'Metric',
      })}
      fullWidth
    >
      <EuiComboBox<MetricOptionValue>
        placeholder={i18n.translate('xpack.infra.esqlInventory.metricSelector.placeholder', {
          defaultMessage: 'Select a metric field',
        })}
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={handleChange}
        isLoading={isLoading}
        isDisabled={isDisabled}
        renderOption={renderOption}
        fullWidth
        compressed
        isClearable
        data-test-subj="esqlInventoryMetricSelector"
      />
    </EuiFormRow>
  );
};
