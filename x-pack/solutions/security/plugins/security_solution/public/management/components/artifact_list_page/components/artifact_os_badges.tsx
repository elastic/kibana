/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiBadge, EuiBadgeGroup } from '@elastic/eui';
import type { OperatingSystem } from '@kbn/securitysolution-utils';
import type { ExceptionListItemSchema, OsType } from '@kbn/securitysolution-io-ts-list-types';
import { OS_TITLES } from '../../../common/translations';
import { useTestIdGenerator } from '../../../hooks/use_test_id_generator';

const EMPTY_OS_TYPES: OsType[] = [];

const getOsTitle = (os: OsType): string => OS_TITLES[os as OperatingSystem] ?? os;

export interface ArtifactOperatingSystemBadgesProps {
  osTypes: ExceptionListItemSchema['os_types'];
  'data-test-subj'?: string;
}

export const ArtifactOperatingSystemBadges = memo<ArtifactOperatingSystemBadgesProps>(
  ({ osTypes, 'data-test-subj': dataTestSubj }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

    return (
      <EuiBadgeGroup gutterSize="s" data-test-subj={dataTestSubj}>
        {(osTypes ?? EMPTY_OS_TYPES).map((os) => (
          <EuiBadge key={os} color="hollow" data-test-subj={getTestId(`osBadge-${os}`)}>
            {getOsTitle(os)}
          </EuiBadge>
        ))}
      </EuiBadgeGroup>
    );
  }
);
ArtifactOperatingSystemBadges.displayName = 'ArtifactOperatingSystemBadges';
