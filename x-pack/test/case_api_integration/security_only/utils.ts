/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  obsOnlySpacesAll,
  obsSecSpacesAll,
  secOnlySpacesAll,
} from '../common/lib/authentication/users';
import { getAuthWithSuperUser } from '../common/lib/utils';

export const secOnlyDefaultSpaceAuth = { user: secOnlySpacesAll, space: null };
export const obsOnlyDefaultSpaceAuth = { user: obsOnlySpacesAll, space: null };
export const obsSecDefaultSpaceAuth = { user: obsSecSpacesAll, space: null };
export const superUserDefaultSpaceAuth = getAuthWithSuperUser(null);
