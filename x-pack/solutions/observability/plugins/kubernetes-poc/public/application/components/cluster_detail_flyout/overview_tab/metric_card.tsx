/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type MetricValueFormatter = 'bytes' | 'number';

interface MetricCardProps {
  title: string;
  value: number | null;
  isLoading?: boolean;
  formatter?: MetricValueFormatter;
  valueColor?: string;
  height?: number;
}

/**
 * Formats bytes to human-readable format (e.g., "157.16 GB", "7.65 GB")
 */
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  // Format to 2 decimal places, but remove trailing zeros
  const formatted = value.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} ${sizes[i]}`;
};

/**
 * Formats a number value
 */
const formatNumber = (value: number): string => {
  return value.toLocaleString('en-US');
};

/**
 * Reusable metric card component matching Figma design.
 * Displays a title, "Total" label, and a large formatted value.
 */
export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  isLoading = false,
  formatter = 'number',
  valueColor,
  height = 100,
}) => {
  const { euiTheme } = useEuiTheme();

  const formattedValue = React.useMemo(() => {
    if (value === null || value === undefined) return '—';

    switch (formatter) {
      case 'bytes':
        return formatBytes(value);
      case 'number':
        return formatNumber(value);
      default:
        return String(value);
    }
  }, [value, formatter]);

  const displayColor = valueColor || euiTheme.colors.text;

  return (
    <div
      style={{
        padding: '12px',
        height: `${height}px`,
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid ${euiTheme.border.color}`,
        borderRadius: euiTheme.border.radius.medium,
        backgroundColor: euiTheme.colors.emptyShade,
      }}
    >
      {/* Title */}
      <EuiText
        size="m"
        style={{
          fontWeight: 700,
          color: euiTheme.colors.text,
          marginBottom: '4px',
        }}
      >
        {title}
      </EuiText>

      {/* "Total" label */}
      <EuiText
        size="xs"
        color="subdued"
        style={{
          marginBottom: '8px',
        }}
      >
        {i18n.translate('xpack.kubernetesPoc.clusterDetailFlyout.totalLabel', {
          defaultMessage: 'Total',
        })}
      </EuiText>

      {/* Value */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end' }}>
        {isLoading ? (
          <EuiLoadingSpinner size="m" />
        ) : (
          <EuiText
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: displayColor,
              lineHeight: '1.2',
              textAlign: 'right',
            }}
          >
            {formattedValue}
          </EuiText>
        )}
      </div>
    </div>
  );
};
