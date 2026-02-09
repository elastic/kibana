/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useKibanaContextForPlugin } from '../../../../hooks/use_kibana';
import { getFormatFromOtelUnit, type ValueFormatConfig, type MetricOption } from '../types';
import type { ValueFormatter } from './use_esql_query';

interface UseValueFormatterOptions {
  selectedMetric: MetricOption | null;
}

interface UseValueFormatterResult {
  formatter: ValueFormatter;
  format: ValueFormatConfig;
}

/**
 * Hook to create a value formatter based on the selected metric's unit.
 * Handles OTel unit mapping and Kibana field formats.
 */
export const useValueFormatter = ({
  selectedMetric,
}: UseValueFormatterOptions): UseValueFormatterResult => {
  const {
    services: { fieldFormats },
  } = useKibanaContextForPlugin();

  const format = useMemo<ValueFormatConfig>(() => {
    // Use explicit format if provided
    if (selectedMetric?.format) {
      return selectedMetric.format;
    }

    // Try to get format from OTel unit mapping
    const metricName = selectedMetric?.name;
    const unit = selectedMetric?.unit;

    if (metricName) {
      const otelFormat = getFormatFromOtelUnit(metricName, unit);
      if (otelFormat) {
        return otelFormat;
      }
    }

    // Default format
    return { id: 'number', params: { decimals: 2 } };
  }, [selectedMetric?.name, selectedMetric?.unit, selectedMetric?.format]);

  const formatter = useMemo<ValueFormatter>(() => {
    try {
      const fieldFormatter = fieldFormats.deserialize({
        id: format.id || 'number',
        params: format.params,
      });
      return (value: number) => fieldFormatter.convert(value);
    } catch {
      return (value: number) => value.toLocaleString();
    }
  }, [fieldFormats, format]);

  return { formatter, format };
};
