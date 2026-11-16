/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { summarizeStepCommonDefinition } from '../../../../common/workflows/step_types/summarize/summarize_common';

/** YAML editor schema for native_vuln.summarize (the handler is server-side). */
export const summarizeStepDefinition: PublicStepDefinition = {
  ...summarizeStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/document').then(({ icon }) => ({
      default: icon,
    }))
  ),
};
