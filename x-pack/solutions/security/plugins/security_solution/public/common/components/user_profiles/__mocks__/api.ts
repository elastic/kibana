/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { mockUserProfiles } from '../mock';

export const suggestUsers = async ({
  searchTerm,
}: {
  searchTerm: string;
}): Promise<UserProfileWithAvatar[]> => Promise.resolve(mockUserProfiles);
