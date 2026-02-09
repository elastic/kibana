/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';

/**
 * Function type for formatting numeric values for display
 */
export type ValueFormatter = (value: number) => string;

/**
 * Metric instrument type determines how the metric should be aggregated:
 * - gauge: Point-in-time values → use AVG
 * - counter: Cumulative values → use RATE then SUM
 */
export type MetricInstrument = 'gauge' | 'counter' | 'histogram' | 'summary' | undefined;

/**
 * Format configuration for metric values - matches Lens ValueFormatConfig
 */
export interface ValueFormatConfig {
  /** Format identifier: 'number', 'percent', 'bytes', 'bits', 'duration', 'string' */
  id: string;
  params?: {
    /** Number of decimal places */
    decimals?: number;
    /** Suffix to append (e.g., '/s') */
    suffix?: string;
    /** Use compact notation (e.g., 1K instead of 1000) */
    compact?: boolean;
    /** Custom numeral.js pattern */
    pattern?: string;
    /** Input unit for duration (e.g., 'milliseconds', 'seconds') */
    fromUnit?: string;
    /** Output format for duration (e.g., 'humanize', 'asSeconds') */
    toUnit?: string;
  };
}

/**
 * Standard metric unit type (matches kbn-unified-metrics-grid MetricUnit)
 */
export type MetricUnit = 'ns' | 'us' | 'ms' | 's' | 'm' | 'h' | 'd' | 'percent' | 'bytes' | 'count';

/**
 * Map raw OTel/ECS units to normalized MetricUnit
 * Based on kbn-unified-metrics-grid/src/common/utils/metric_unit/normalize_unit.ts
 */
const NORMALIZED_UNIT_MAP: Record<string, MetricUnit> = {
  by: 'bytes',
  '%': 'percent',
  '1': 'count',
  byte: 'bytes',
  nanos: 'ns',
  micros: 'us',
};

const RATIO_FIELD_NAME_SUFFIX = 'utilization';

/**
 * Normalizes a unit string to a standard MetricUnit.
 * Handles OTel and ECS unit formats.
 * For ratio fields (containing 'utilization'), defaults to 'percent'.
 * For all other fields without a unit, defaults to 'count'.
 * Based on kbn-unified-metrics-grid normalizeUnit
 */
export const normalizeUnit = ({
  fieldName,
  unit,
}: {
  fieldName: string;
  unit: string | undefined;
}): MetricUnit => {
  const isRatio = fieldName.toLowerCase().includes(RATIO_FIELD_NAME_SUFFIX);

  // If no unit provided
  if (!unit?.trim()) {
    // Ratio fields default to percent, otherwise default to count
    return isRatio ? 'percent' : 'count';
  }

  const normalizedUnit = NORMALIZED_UNIT_MAP[unit.toLowerCase()] ?? unit;

  if (isRatio && (!normalizedUnit || normalizedUnit === 'count')) {
    return 'percent';
  }

  return (normalizedUnit as MetricUnit) || 'count';
};

/**
 * Duration unit names for Lens format configuration
 */
const DURATION_UNIT_NAMES: Record<string, string> = {
  ns: 'nanoseconds',
  us: 'microseconds',
  ms: 'milliseconds',
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
};

const isDurationUnit = (unit: string): boolean => {
  return unit in DURATION_UNIT_NAMES;
};

const isSpecialUnitOfCount = (unit: string): boolean => {
  return /^\{.*\}$/.test(unit);
};

/**
 * Get Lens-compatible format configuration from a normalized MetricUnit.
 * Based on kbn-unified-metrics-grid getLensMetricFormat
 */
export const getLensMetricFormat = (
  unit: MetricUnit | undefined
): ValueFormatConfig | undefined => {
  if (!unit || unit === 'count' || isSpecialUnitOfCount(unit)) {
    return undefined;
  }

  // Map unit to format type
  const formatTypeByUnit: Record<Exclude<MetricUnit, 'count'>, string> = {
    percent: 'percent',
    bytes: 'bytes',
    ns: 'duration',
    us: 'duration',
    ms: 'duration',
    s: 'duration',
    m: 'duration',
    h: 'duration',
    d: 'duration',
  };

  const formatId = formatTypeByUnit[unit];
  if (!formatId) {
    return undefined;
  }

  if (isDurationUnit(unit)) {
    return {
      id: formatId,
      params: {
        fromUnit: DURATION_UNIT_NAMES[unit],
        toUnit: 'humanizePrecise',
        decimals: 0,
      },
    };
  }

  return {
    id: formatId,
    params: {
      decimals: 1,
    },
  };
};

/**
 * Helper to get format config from raw OTel unit string and field name
 */
export const getFormatFromOtelUnit = (
  fieldName: string,
  unit: string | undefined
): ValueFormatConfig | undefined => {
  const normalizedUnit = normalizeUnit({ fieldName, unit });
  return getLensMetricFormat(normalizedUnit);
};

export interface SelectedMetric {
  name: string;
  type: string;
  instrument?: MetricInstrument;
  /** OTel unit string (e.g., 'By', 's', '%') */
  unit?: string;
  /** Format configuration derived from unit */
  format?: ValueFormatConfig;
  /** If true, this is a custom saved metric with a custom ES|QL query */
  isCustom?: boolean;
  /** The custom ES|QL query (only for custom metrics) */
  customQuery?: string;
  /** The ID of the custom metric (only for custom metrics) */
  customId?: string;
  /** If true, this is a managed (curated) metric from entity definitions */
  isManaged?: boolean;
  /** The curated metric definition (only for managed metrics) */
  curatedMetric?: CuratedMetricQuery;
}

// Re-export CuratedMetricQuery for convenience
export type { CuratedMetricQuery } from '@kbn/unified-chart-section-viewer';

/**
 * Available unit options for custom metrics
 */
export const UNIT_OPTIONS = [
  { value: '', label: 'None' },
  { value: 'percent', label: 'Percent (%)' },
  { value: 'bytes', label: 'Bytes' },
  { value: 'count', label: 'Count' },
  { value: 'ns', label: 'Nanoseconds' },
  { value: 'us', label: 'Microseconds' },
  { value: 'ms', label: 'Milliseconds' },
  { value: 's', label: 'Seconds' },
  { value: 'm', label: 'Minutes' },
  { value: 'h', label: 'Hours' },
  { value: 'd', label: 'Days' },
] as const;

/**
 * A custom metric saved by the user
 */
export interface CustomMetric {
  /** Unique identifier */
  id: string;
  /** Display name for the metric */
  name: string;
  /** The ES|QL query for this metric */
  query: string;
  /** The dimension this metric is associated with */
  dimension: string;
  /** The unit for formatting values (e.g., 'percent', 'bytes') */
  unit?: string;
  /** When the metric was created */
  createdAt: number;
}

/**
 * Color palette names available for the legend
 */
export type ColorPaletteName = 'temperature' | 'status' | 'cool' | 'warm' | 'positive' | 'negative';

export const COLOR_PALETTE_NAMES: ColorPaletteName[] = [
  'temperature',
  'status',
  'cool',
  'warm',
  'positive',
  'negative',
];

export const COLOR_PALETTE_LABELS: Record<ColorPaletteName, string> = {
  temperature: 'Temperature',
  status: 'Status',
  cool: 'Cool',
  warm: 'Warm',
  positive: 'Positive',
  negative: 'Negative',
};

/**
 * Legend configuration for color palette
 */
export interface LegendConfig {
  /** Selected color palette */
  palette: ColorPaletteName;
  /** Whether to reverse the color scale */
  reverseColors: boolean;
  /** Number of color steps (2-18) */
  steps: number;
  /** Whether to use automatic bounds based on data */
  autoBounds: boolean;
  /** Manual bounds (used when autoBounds is false) */
  bounds: {
    min: number;
    max: number;
  };
  /** Where to apply the color */
  applyColorTo: 'background' | 'text';
}

export const DEFAULT_LEGEND_CONFIG: LegendConfig = {
  palette: 'status',
  reverseColors: false,
  steps: 10,
  autoBounds: true,
  bounds: { min: 0, max: 100 },
  applyColorTo: 'background',
};

/**
 * A single node in the waffle map representing a dimension value with its metric
 */
export interface EsqlWaffleNode {
  /** Unique identifier (dimension value) */
  id: string;
  /** Display label (dimension value) */
  label: string;
  /** Metric value */
  value: number;
  /** Formatted metric value for display */
  formattedValue: string;
}

/**
 * Bounds for color mapping
 */
export interface WaffleBounds {
  min: number;
  max: number;
}

/**
 * Result of executing an ES|QL query for the waffle map
 */
export interface EsqlWaffleResult {
  nodes: EsqlWaffleNode[];
  bounds: WaffleBounds;
  /** Format configuration for the metric values */
  format?: ValueFormatConfig;
}

/**
 * A single group in the grouped waffle result (supports nested groups)
 */
export interface WaffleGroup {
  /** The group key - single value for one group by field, or combined key for multiple */
  groupKey: string;
  /** Individual group values for each group by field */
  groupValues: string[];
  /** Nodes belonging to this group */
  nodes: EsqlWaffleNode[];
  /** Bounds for this specific group */
  bounds: WaffleBounds;
  /** Nested subgroups (when multiple group by fields are selected) */
  subgroups?: WaffleGroup[];
}

/**
 * Result of executing an ES|QL query with group by for the waffle map
 */
export interface GroupedWaffleResult {
  /** Array of groups, each containing nodes */
  groups: WaffleGroup[];
  /** Global bounds across all groups (for consistent coloring) */
  globalBounds: WaffleBounds;
  /** Format configuration for the metric values */
  format?: ValueFormatConfig;
  /** The field names used for grouping */
  groupByFields: string[];
}

/**
 * Sort configuration for the inventory grid
 */
export type SortField = 'entity' | 'metric';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface EsqlInventoryState {
  // Index pattern to query
  index: string;
  // Entity field to group by (e.g., 'host.name', 'kubernetes.pod.uid')
  entityField: string;
  // Selected metric field and its instrument type
  selectedMetric: SelectedMetric | null;
  // Time range for queries
  timeRange: TimeRange;
  // Legend/color palette configuration
  legend: LegendConfig;
  // Sort configuration
  sort: SortConfig;
  // Secondary grouping fields (e.g., ['cloud.region', 'kubernetes.namespace'])
  groupByFields: string[];
}

export const DEFAULT_INDEX = 'remote_cluster:metrics-*,metrics-*';
export const DEFAULT_ENTITY = 'host.name';

export const DEFAULT_SORT: SortConfig = {
  field: 'metric',
  direction: 'desc',
};

export const DEFAULT_STATE: EsqlInventoryState = {
  index: DEFAULT_INDEX,
  entityField: DEFAULT_ENTITY,
  selectedMetric: null,
  timeRange: { from: 'now-15m', to: 'now' },
  legend: DEFAULT_LEGEND_CONFIG,
  sort: DEFAULT_SORT,
  groupByFields: [],
};
