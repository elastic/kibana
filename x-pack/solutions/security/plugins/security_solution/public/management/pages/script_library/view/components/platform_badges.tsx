/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { OS_TITLES } from '../../../../common/translations';
import type { SupportedHostOsType } from '../../../../../../common/endpoint/constants';

export interface ScriptTablePlatformBadgesProps {
  platforms?: SupportedHostOsType[];
  'data-test-subj'?: string;
}
export const ScriptTablePlatformBadges = memo<ScriptTablePlatformBadgesProps>(
  ({ platforms, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiFlexGroup gutterSize="s" wrap responsive={false} data-test-subj={dataTestSubj}>
        {platforms?.sort().map((platform) => (
          <EuiFlexItem grow={false} key={platform}>
            <EuiBadge color="hollow">{OS_TITLES[platform]}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);

ScriptTablePlatformBadges.displayName = 'ScriptTablePlatformBadges';
