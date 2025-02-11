/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const PREFIX = 'securitySolutionUsers';

/* Avatars */
export const USER_AVATAR_ITEM_TEST_ID = (userName: string) => `${PREFIX}Avatar-${userName}`;
export const USERS_AVATARS_PANEL_TEST_ID = `${PREFIX}AvatarsPanel`;
export const USERS_AVATARS_COUNT_BADGE_TEST_ID = `${PREFIX}AvatarsCountBadge`;
