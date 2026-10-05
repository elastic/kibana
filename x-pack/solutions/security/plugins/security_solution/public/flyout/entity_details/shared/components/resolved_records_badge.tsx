/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { useActiveFaceliftVersion } from '../../../../entity_analytics/components/home/facelift/active_version';
import { getEntityId } from '../../../../entity_analytics/components/entity_resolution/helpers';
import { useResolutionGroup } from '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group';

interface ResolvedRecordsBadgeProps {
  entityId?: string;
}

/**
 * Number of raw records in the resolution group when `entityId` is the group's
 * target. Aliases share the group but must not show the badge, so they get
 * `undefined`.
 */
export const useResolvedRawRecordCount = (entityId?: string): number | undefined => {
  const { data: group } = useResolutionGroup(entityId ?? '', {
    enabled: Boolean(entityId),
  });

  const targetId = group?.target ? getEntityId(group.target) : undefined;
  const rawRecordCount = group?.aliases.length ?? 0;
  if (!entityId || !targetId || entityId !== targetId || rawRecordCount === 0) {
    return undefined;
  }
  return rawRecordCount;
};

/**
 * Shown only on the resolved (target) entity — not on raw-record aliases that
 * resolve into that group. N is the number of raw records. In facelift v.8 the
 * copy drops "raw" and this badge stands in for the Entity Store badge.
 */
export const ResolvedRecordsBadge: React.FC<ResolvedRecordsBadgeProps> = ({ entityId }) => {
  const rawRecordCount = useResolvedRawRecordCount(entityId);
  const [faceliftVersion] = useActiveFaceliftVersion();

  if (rawRecordCount == null) {
    return null;
  }

  return (
    <EuiBadge
      color="hollow"
      iconType="aggregate"
      iconSide="left"
      data-test-subj="entity-panel-header-resolved-badge"
    >
      {faceliftVersion === 'v8' ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.resolvedFromRecordsBadge"
          defaultMessage="Resolved from {count, plural, one {# record} other {# records}}"
          values={{ count: rawRecordCount }}
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.resolvedRecordsBadge"
          defaultMessage="Resolved: {count, plural, one {# raw record} other {# raw records}}"
          values={{ count: rawRecordCount }}
        />
      )}
    </EuiBadge>
  );
};
