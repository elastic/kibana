/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { NightshiftHealthy } from './nightshift_healthy';

const MORNING_DESCRIPTION = i18n.translate('xpack.observability.nightshift.morning.description', {
  defaultMessage:
    'We have fixed a few issues in your system, and you can review what happened in the last 8 hours.',
});

/**
 * "Morning" Nightshift page — same layout as {@link NightshiftHealthy} with
 * overnight summary copy. Mounted when the chrome status dropdown is `morning`.
 */
export const NightshiftMorning: React.FC = () => (
  <NightshiftHealthy
    dataTestSubj="nightshiftMorningPage"
    description={MORNING_DESCRIPTION}
    briefMode="morning"
    summarySection="fixedEvents"
  />
);
