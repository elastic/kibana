/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDuration } from '@kbn/alerting-plugin/common';
import { secondsToDurationString } from '../../../../../../detections/pages/detection_engine/rules/helpers';

/**
 * Tries to transform rule's `lookback` duration into a human normalized form. Returns `fallback`
 * when transformation fails.
 *
 * `lookback` is expected in duration format `{value: number}(s|m|h)` e.g. `1m`, `50s`
 *
 * Human normaized form represents a the same value with less numbers when possible.
 * A number of seconds equal whole minutes or hours get transformed to the biggest unit.
 */
export function safeHumanizeLookbackDuration(lookbackDuration: string, fallback: string): string {
  try {
    const lookbackSeconds = parseDuration(lookbackDuration) / 1000;

    return secondsToDurationString(lookbackSeconds);
  } catch {
    return fallback;
  }
}
