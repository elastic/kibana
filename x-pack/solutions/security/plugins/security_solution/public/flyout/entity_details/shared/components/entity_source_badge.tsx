/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface EntitySourceBadgeProps {
  isEntityInStore: boolean;
  hasLastSeenDate: boolean;
  'data-test-subj': string;
}

export const EntitySourceBadge: React.FC<EntitySourceBadgeProps> = ({
  isEntityInStore,
  hasLastSeenDate,
  'data-test-subj': dataTestSubj,
}) => {
  if (!isEntityInStore && !hasLastSeenDate) {
    return null;
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
