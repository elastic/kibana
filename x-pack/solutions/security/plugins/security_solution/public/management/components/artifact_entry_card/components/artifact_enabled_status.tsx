/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge } from '@elastic/eui';
import React, { memo } from 'react';
import { isArtifactDisabled } from '../../../../../common/endpoint/service/artifacts';
import type { ArtifactInfo } from '../types';
import { ARTIFACT_DISABLED_STATUS_LABEL, ARTIFACT_ENABLED_STATUS_LABEL } from './translations';

export interface ArtifactEnabledStatusProps {
  tags: ArtifactInfo['tags'];
  'data-test-subj'?: string;
}

/** Read-only enabled or disabled badge for an artifact that supports the `disabled` tag. */
export const ArtifactEnabledStatus = memo<ArtifactEnabledStatusProps>(
  ({ tags, 'data-test-subj': dataTestSubj }) => {
    const isDisabled = isArtifactDisabled({ tags });

    return isDisabled ? (
      <EuiBadge color="hollow" data-test-subj={dataTestSubj} css={{ width: 'fit-content' }}>
        {ARTIFACT_DISABLED_STATUS_LABEL}
      </EuiBadge>
    ) : (
      <EuiBadge color="success" data-test-subj={dataTestSubj} css={{ width: 'fit-content' }}>
        {ARTIFACT_ENABLED_STATUS_LABEL}
      </EuiBadge>
    );
  }
);
ArtifactEnabledStatus.displayName = 'ArtifactEnabledStatus';
