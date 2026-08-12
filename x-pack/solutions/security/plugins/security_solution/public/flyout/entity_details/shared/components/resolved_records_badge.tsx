/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { getEntityId } from '../../../../entity_analytics/components/entity_resolution/helpers';
import { useResolutionGroup } from '../../../../entity_analytics/components/entity_resolution/hooks/use_resolution_group';

interface ResolvedRecordsBadgeProps {
  entityId?: string;
}

/**
 * Shown next to the risk badge only on the resolved (target) entity — not on
 * raw-record aliases that resolve into that group. N is the number of raw records.
 */
export const ResolvedRecordsBadge: React.FC<ResolvedRecordsBadgeProps> = ({ entityId }) => {
  const { data: group } = useResolutionGroup(entityId ?? '', {
    enabled: Boolean(entityId),
  });

  const targetId = group?.target ? getEntityId(group.target) : undefined;
  const rawRecordCount = group?.aliases.length ?? 0;
  // Aliases share the group but must not show this badge.
  if (!entityId || !targetId || entityId !== targetId || rawRecordCount === 0) {
    return null;
  }

  return (
    <EuiBadge
      color="hollow"
      iconType="aggregate"
      iconSide="left"
      data-test-subj="entity-panel-header-resolved-badge"
    >
      <FormattedMessage
        id="xpack.securitySolution.flyout.entityDetails.resolvedRecordsBadge"
        defaultMessage="Resolved: {count, plural, one {# raw record} other {# raw records}}"
        values={{ count: rawRecordCount }}
      />
    </EuiBadge>
  );
};
