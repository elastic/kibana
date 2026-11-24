/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { useKibana } from '../../../../../common/lib/kibana';
import { RULES_TABLE_STATE_STORAGE_KEY } from '../constants';

/**
 * Session storage key of the rules table state, one per space: rule groups, tags and searches of
 * one space mean nothing in another. The space comes from the URL, so the key is known on the
 * first render, when the table reads its saved state.
 */
export const useRulesTableStorageKey = (): string => {
  const { http } = useKibana().services;
  const { spaceId } = getSpaceIdFromPath(http.basePath.get(), http.basePath.serverBasePath);
  return `${RULES_TABLE_STATE_STORAGE_KEY}.${spaceId}`;
};
