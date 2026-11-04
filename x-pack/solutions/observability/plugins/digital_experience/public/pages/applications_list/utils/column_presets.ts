/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RIGHT_ALIGNMENT } from '@elastic/eui';
import type { ColumnPreset } from '@kbn/shared-ux-column-presets';

// Every column has a fixed width and a single line, so filtering or longer values never resize
// the table or its rows.

/** A metric column of the Applications list, right-aligned like APM's lists. */
export const metricColumnPreset: ColumnPreset = () => ({
  width: '8.5em',
  minWidth: '8.5em',
  className: 'eui-textNoWrap',
  align: RIGHT_ALIGNMENT,
});

/**
 * The application name, its source badge and the "+ Classic RUM" hint, whether a row has the hint
 * or not; long names are truncated.
 */
export const applicationColumnPreset: ColumnPreset = () => ({
  width: '28em',
  minWidth: '28em',
  className: 'eui-textNoWrap',
});

/** A relative time such as "5 minutes ago". */
export const timeColumnPreset: ColumnPreset = () => ({
  width: '9em',
  minWidth: '9em',
  className: 'eui-textNoWrap',
});
