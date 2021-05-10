/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { obsOnly, obsSec, secOnly } from '../common/lib/authentication/users';
import { getAuthWithSuperUser } from '../common/lib/utils';

export const secOnlyNoSpaceAuth = { user: secOnly, space: null };
export const obsOnlyNoSpaceAuth = { user: obsOnly, space: null };
export const obsSecNoSpaceAuth = { user: obsSec, space: null };
export const superUserNoSpaceAuth = getAuthWithSuperUser(null);
