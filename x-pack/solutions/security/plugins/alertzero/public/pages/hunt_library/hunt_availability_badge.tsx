/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge } from '@elastic/eui';
import type { HuntAvailability } from '../../../common/hunt_library';
import * as i18n from './translations';

interface HuntAvailabilityBadgeProps {
  availability: HuntAvailability;
  'data-test-subj'?: string;
}

/** The catalog's availability badge: green when runnable, otherwise the first failing check. */
export const HuntAvailabilityBadge: React.FC<HuntAvailabilityBadgeProps> = ({
  availability,
  'data-test-subj': dataTestSubj = 'alertZeroHuntAvailabilityBadge',
}) =>
  availability.available || !availability.firstFailure ? (
    <EuiBadge color="success" data-test-subj={dataTestSubj}>
      {i18n.BADGE_AVAILABLE}
    </EuiBadge>
  ) : (
    <EuiBadge color="warning" data-test-subj={dataTestSubj}>
      {i18n.BADGE_REASONS[availability.firstFailure]}
    </EuiBadge>
  );
