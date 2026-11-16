/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { fetchFeedStepCommonDefinition } from '../../../../common/workflows/step_types/fetch_feed/fetch_feed_common';

/** YAML editor schema for native_vuln.fetch_feed (the handler is server-side). */
export const fetchFeedStepDefinition: PublicStepDefinition = {
  ...fetchFeedStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/download').then(({ icon }) => ({
      default: icon,
    }))
  ),
};
