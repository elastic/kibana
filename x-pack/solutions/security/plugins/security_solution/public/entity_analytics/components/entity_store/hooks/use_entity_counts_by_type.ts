/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useEntityFilterBarCounts } from '../../home/use_entity_filter_bar_counts';

/** How many entities of each type the store holds, from the same counts the entities page uses. */
export const useEntityCountsByType = () => {
  const spaceId = useSpaceId();
  const { counts, isLoading } = useEntityFilterBarCounts({ spaceId, rowsMode: 'individual' });
  return { counts: counts.entity_types, isLoading };
};
