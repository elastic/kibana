/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getLoadingMessage } from '.';
import { DEFAULT_END, DEFAULT_START } from '@kbn/elastic-assistant-common';
import {
  AI_IS_CURRENTLY_ANALYZING,
  AI_IS_CURRENTLY_ANALYZING_FROM,
  AI_IS_CURRENTLY_ANALYZING_RANGE,
} from '../../translations';

describe('getLoadingMessage', () => {
  it('returns AI_IS_CURRENTLY_ANALYZING when start and end are the defaults', () => {
    const result = getLoadingMessage({
      alertsCount: 5,
      start: DEFAULT_START, // <-- default
      end: DEFAULT_END, // <-- default
    });

    expect(result).toBe(AI_IS_CURRENTLY_ANALYZING(5));
  });

  it('returns AI_IS_CURRENTLY_ANALYZING_RANGE when NON-default start and end are provided', () => {
    const result = getLoadingMessage({
      alertsCount: 10,
      start: '2025-01-01T00:00:00Z', // <-- non-default
      end: '2025-01-02T00:00:00Z', // <-- non-default
    });

    expect(result).toBe(
      AI_IS_CURRENTLY_ANALYZING_RANGE({
        alertsCount: 10,
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-02T00:00:00Z',
      })
    );
  });

  it('returns AI_IS_CURRENTLY_ANALYZING_FROM when only start is provided', () => {
    const result = getLoadingMessage({
      alertsCount: 15,
      start: '2025-01-01T00:00:00Z', // <-- only start
    });

    expect(result).toBe(
      AI_IS_CURRENTLY_ANALYZING_FROM({
        alertsCount: 15,
        from: '2025-01-01T00:00:00Z',
      })
    );
  });

  it('returns AI_IS_CURRENTLY_ANALYZING when neither start nor end are provided', () => {
    const result = getLoadingMessage({
      alertsCount: 20,
    });

    expect(result).toBe(AI_IS_CURRENTLY_ANALYZING(20));
  });
});
