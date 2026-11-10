/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  isNightshiftSupportedSpace,
  NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE,
} from '@kbn/nightshift-shared';

/**
 * Refuses work in a space Nightshift does not run in. Nightshift lives in the default space only:
 * its service accounts, bound workflows and agents are deployment-wide identities, so setting a
 * second space up would rebind them and take Nightshift away from the space already using it.
 */
export const assertNightshiftSpace = (spaceId: string): void => {
  if (!isNightshiftSupportedSpace(spaceId)) {
    throw Boom.badRequest(NIGHTSHIFT_UNSUPPORTED_SPACE_MESSAGE);
  }
};
