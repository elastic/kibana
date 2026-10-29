/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RunQuotaReachedBanner } from '../../components/ui/run_quota_reached_callout';

export const RunLimitsBanner = (): React.ReactElement | null => {
  return <RunQuotaReachedBanner group="detection" />;
};
