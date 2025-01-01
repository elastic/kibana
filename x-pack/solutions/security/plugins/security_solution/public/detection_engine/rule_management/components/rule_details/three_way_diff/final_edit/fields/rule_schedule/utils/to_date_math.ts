/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeDuration } from '@kbn/securitysolution-utils/time_duration';
import { toSigned } from './to_signed';

export function toDateMath(timeDuration: TimeDuration): string {
  if (timeDuration.value === 0) {
    return 'now';
  }

  return `now${toSigned(timeDuration.value)}${timeDuration.unit}`;
}
