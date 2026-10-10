/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useHasEntityResolutionLicense } from '../../../../common/hooks/use_has_entity_resolution_license';
import { useNewEntityAnalyticsPage } from '../../../../entity_analytics/hooks/use_new_entity_analytics_page';
import { getEntityId } from '../../../../entity_analytics/components/entity_resolution/helpers';
import { useResolutionGroup } from '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group';
import type { ResolutionGroup } from '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group';

/** Record count for the resolution target, or undefined for an individual or ungrouped record. */
export const getResolvedFromRecordCount = (
  entityId: string | undefined,
  group: Pick<ResolutionGroup, 'target' | 'group_size'> | undefined
): number | undefined => {
  if (!entityId || !group || group.group_size <= 1) {
    return undefined;
  }

  if (getEntityId(group.target) !== entityId) {
    return undefined;
  }

  return group.group_size;
};

/** Resolution-group size when this entity is the target */
export const useResolvedFromRecordCount = (entityId?: string): number | undefined => {
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();
  const hasEntityResolutionLicense = useHasEntityResolutionLicense();
  const { data } = useResolutionGroup(entityId ?? '', {
    enabled: isNewEntityAnalyticsPage && hasEntityResolutionLicense && !!entityId,
  });

  if (!isNewEntityAnalyticsPage) {
    return undefined;
  }

  return getResolvedFromRecordCount(entityId, data);
};
