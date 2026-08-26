/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { fetchSourceStepCommonDefinition } from '../../../../../common/threat_intel/workflows/step_types/fetch_source/fetch_source_common';

/** YAML editor schema for threat_intel.fetch_source (handler is server-side). */
export const fetchSourceStepDefinition: PublicStepDefinition = {
  ...fetchSourceStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/download')
      .then(({ icon }) => ({ default: icon }))
      .catch(() =>
        import('@elastic/eui/es/components/icon/assets/globe').then(({ icon }) => ({
          default: icon,
        }))
      )
  ),
};
