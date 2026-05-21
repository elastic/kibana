/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Thrown when a source-aware `linkEntities` call would overwrite an existing
 * verdict from the same source with a different target. Different sources are
 * allowed to disagree (that's the whole point of parallel resolution); the
 * same source flipping its mind is treated like the legacy
 * `ChainResolutionError` — call `unlinkEntities({ source })` first.
 */
export class MultiSourceConflictError extends Error {
  constructor(entityId: string, source: string, existingTarget: string, requestedTarget: string) {
    super(
      `Entity '${entityId}' already has a '${source}' link to '${existingTarget}'; ` +
        `cannot overwrite with '${requestedTarget}'. Unlink the '${source}' source first.`
    );
    this.name = 'MultiSourceConflictError';
  }
}
