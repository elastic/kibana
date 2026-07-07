/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import Boom from '@hapi/boom';
import { decodeVersion } from '@kbn/securitysolution-es-utils';

/**
 * checks if encoded OCC update _version matches actual version of list/item
 * @param updateVersion - version in payload
 * @param existingVersion - version in exiting list/item
 */
export const checkVersionConflict = (
  updateVersion: string | undefined,
  existingVersion: string | undefined
): void => {
  if (updateVersion && existingVersion && updateVersion !== existingVersion) {
    throw Boom.conflict(
      `Conflict: versions mismatch. Provided versions:${JSON.stringify(
        decodeVersion(updateVersion)
      )} does not match ${JSON.stringify(decodeVersion(existingVersion))}`
    );
  }
};
