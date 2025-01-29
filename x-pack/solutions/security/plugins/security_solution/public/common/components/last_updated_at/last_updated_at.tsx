/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';

interface LastUpdatedAtProps {
  updatedAt: number;
  isUpdating: boolean;
}

const UPDATING = i18n.translate('xpack.securitySolution.detectionResponse.updating', {
  defaultMessage: 'Updating...',
});

const UPDATED = i18n.translate('xpack.securitySolution.detectionResponse.updated', {
  defaultMessage: 'Updated',
});

export const LastUpdatedAt: React.FC<LastUpdatedAtProps> = ({ isUpdating, updatedAt }) => (
  <EuiFlexGroup>
    {isUpdating ? (
      <EuiFlexItem grow={false}>{UPDATING}</EuiFlexItem>
    ) : (
      <EuiFlexItem grow={false}>
        <>{UPDATED} </>
        <FormattedRelative data-test-subj="last-updated-at-date" value={new Date(updatedAt)} />
      </EuiFlexItem>
    )}
  </EuiFlexGroup>
);
