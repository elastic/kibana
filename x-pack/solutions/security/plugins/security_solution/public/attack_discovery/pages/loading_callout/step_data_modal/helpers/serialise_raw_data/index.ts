/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepDataType } from '../..';

/**
 * Serialises items to a display string for the raw view.
 *
 * Alert strings are joined with blank lines so that each entry is visually
 * separated, matching the layout used in the actual Attack Discovery prompt.
 * Other items are pretty-printed as JSON.
 */
export const serialiseRawData = (items: unknown[], dataType: StepDataType): string => {
  if (dataType === 'alerts') {
    return items.map((item) => String(item)).join('\n\n');
  }

  return JSON.stringify(items, null, 2);
};
