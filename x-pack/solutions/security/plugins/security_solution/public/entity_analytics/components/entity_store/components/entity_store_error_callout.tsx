/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EngineDescriptor } from '../../../../../common/api/entity_analytics/entity_store';

export const EntityStoreErrorCallout: React.FC<{ engine?: EngineDescriptor; size?: 's' | 'm' }> = ({
  engine,
  size = 'm',
}) => {
  if (!engine?.error?.message) {
    return null;
  }

  let title;
  // we only have one action now but this wiill cause a type error if we add more
  // to remind us to update this
  switch (engine.error.action) {
    case 'init':
      title = (
        <FormattedMessage
          id="xpack.securitySolution.entityAnalytics.entityStore.initError.title"
          defaultMessage="An error occurred during {engineType} entity store resource initialization"
          values={{ engineType: engine.type }}
        />
      );
      break;
  }

  return (
    <EuiCallOut title={title} color="danger" iconType="alert" size={size}>
      <p>{engine.error.message}</p>
    </EuiCallOut>
  );
};
