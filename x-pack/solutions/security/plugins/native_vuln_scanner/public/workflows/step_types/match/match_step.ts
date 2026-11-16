/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { matchStepCommonDefinition } from '../../../../common/workflows/step_types/match/match_common';

/** YAML editor schema for native_vuln.match (the handler is server-side). */
export const matchStepDefinition: PublicStepDefinition = {
  ...matchStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/bug').then(({ icon }) => ({
      default: icon,
    }))
  ),
};
