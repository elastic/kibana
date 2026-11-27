/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { getAgentIcon } from '@kbn/custom-icons';
import type { MobilePlatform } from '../../common/types/applications';
import { PLATFORM_LABELS } from '../labels';

/** The agent name whose icon `@kbn/custom-icons` draws for each platform, as APM's lists do. */
const PLATFORM_AGENT_NAMES: Record<MobilePlatform, string> = {
  android: 'opentelemetry/android',
  ios: 'opentelemetry/swift',
};

/** A badge per platform a mobile application runs on, with the platform's logo. */
export function PlatformBadges({
  platforms,
  'data-test-subj': dataTestSubj,
}: {
  platforms: readonly MobilePlatform[];
  'data-test-subj'?: string;
}) {
  const { colorMode } = useEuiTheme();
  return (
    <EuiFlexGroup
      data-test-subj={dataTestSubj}
      gutterSize="xs"
      alignItems="center"
      responsive={false}
      wrap={false}
    >
      {platforms.map((platform) => (
        <EuiFlexItem grow={false} key={platform}>
          <EuiBadge
            data-test-subj="digitalExperiencePlatformBadge"
            data-platform={platform}
            color="hollow"
            iconType={getAgentIcon(PLATFORM_AGENT_NAMES[platform], colorMode === 'DARK')}
          >
            {PLATFORM_LABELS[platform]}
          </EuiBadge>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
