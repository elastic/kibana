/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useEnabledProfilingStatus } from '../../../components/contexts/profiling_status/use_enabled_profiling_status';
import { UniversalProfilingAddDataInstructions } from './universal_profiling_add_data_instructions';
import { UniversalProfilingDeleteDataInstructions } from './universal_profiling_delete_data_instructions';
import { UniversalProfilingSetupPrompt } from './universal_profiling_setup_prompt';

/** Shows the Universal Profiling add data instructions, or what the cluster needs before it can ingest that data. */
export function UniversalProfilingAddData() {
  const {
    data: { universalProfiling },
  } = useEnabledProfilingStatus();

  if (universalProfiling.hasLegacyData) {
    return <UniversalProfilingDeleteDataInstructions />;
  }

  if (!universalProfiling.hasSetup) {
    return <UniversalProfilingSetupPrompt />;
  }

  return <UniversalProfilingAddDataInstructions />;
}
