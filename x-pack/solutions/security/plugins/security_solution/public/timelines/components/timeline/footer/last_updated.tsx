/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { getLastUpdated } from '@kbn/securitysolution-timeline-components';

interface FixedWidthLastUpdatedContainerProps {
  updatedAt: number;
}

export const LastUpdatedContainer = React.memo<FixedWidthLastUpdatedContainerProps>(
  ({ updatedAt }) => {
    return updatedAt > 0 ? (
      <span data-test-subj="last-updated-container">{getLastUpdated({ updatedAt })}</span>
    ) : null;
  }
);

LastUpdatedContainer.displayName = 'LastUpdatedContainer';
