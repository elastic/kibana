/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NightshiftSource } from '@kbn/nightshift-shared';
import { SourceDisabledError } from '../../lib/errors/source_disabled_error';

/**
 * Blocks routes that would install rules for a source the user disabled: those rules would fire
 * until the next catalog reconcile switched them off.
 */
export function assertSourceEnabled(source: Pick<NightshiftSource, 'id' | 'enabled'>): void {
  if (!source.enabled) {
    throw new SourceDisabledError(source.id);
  }
}
