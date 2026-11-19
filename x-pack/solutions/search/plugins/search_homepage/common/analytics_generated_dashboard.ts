/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LensApiConfigInput } from '@kbn/lens-embeddable-utils';
import type { AnalyticsGeneratedPanel } from './analytics';

/** A query column name as an axis or metric label: `failure_rate` reads `Failure rate`. */
export const toColumnLabel = (column: string): string => {
  const words = column.replace(/[_.]+/g, ' ').trim();

  return words === '' ? column : `${words.charAt(0).toUpperCase()}${words.slice(1)}`;
};

/** The as-code Lens configuration of a generated panel, as the dashboard locator takes it. */
export const toGeneratedPanelConfig = ({
  title,
  chart,
  esql,
  x,
  y,
  breakdown,
}: Omit<AnalyticsGeneratedPanel, 'grid'>): LensApiConfigInput => {
  if (chart === 'metric' || x === undefined) {
    return {
      type: 'metric',
      title,
      data_source: { type: 'esql', query: esql },
      metrics: [{ type: 'primary', column: y[0], label: toColumnLabel(y[0]) }],
    };
  }

  return {
    type: 'xy',
    title,
    layers: [
      {
        type: chart,
        data_source: { type: 'esql', query: esql },
        x: { column: x },
        y: y.map((column) => ({ column, label: toColumnLabel(column) })),
        ...(breakdown !== undefined && { breakdown_by: { column: breakdown } }),
      },
    ],
    ...(breakdown !== undefined && { legend: { visibility: 'visible', position: 'right' } }),
  };
};
