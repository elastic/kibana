/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

import { useNewEntityAnalyticsPage } from '../../../../entity_analytics/hooks/use_new_entity_analytics_page';

interface EntitySourceBadgeProps {
  isEntityInStore: boolean;
  hasLastSeenDate: boolean;
  'data-test-subj': string;
  /** Resolution-group size when this entity is the target. Individual records omit it. */
  resolvedFromCount?: number;
}

export const EntitySourceBadge: React.FC<EntitySourceBadgeProps> = ({
  isEntityInStore,
  hasLastSeenDate,
  'data-test-subj': dataTestSubj,
  resolvedFromCount,
}) => {
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();

  if (!isEntityInStore && !hasLastSeenDate) {
    return null;
  }

  // Resolution badge for entities that are resolved from other records
  if (isNewEntityAnalyticsPage && isEntityInStore && (resolvedFromCount ?? 0) > 0) {
    return (
      <EuiBadge data-test-subj={dataTestSubj} color="hollow" iconType="aggregate">
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.resolvedFromRecordsBadge"
          defaultMessage="Resolved from {count, plural, one {# record} other {# records}}"
          values={{ count: resolvedFromCount }}
        />
      </EuiBadge>
    );
  }

  return (
    <EuiBadge data-test-subj={dataTestSubj} color="hollow">
      {isEntityInStore ? (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.entityStoreBadge"
          defaultMessage="Entity Store"
        />
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.entityDetails.observedBadge"
          defaultMessage="Observed"
        />
      )}
    </EuiBadge>
  );
};
