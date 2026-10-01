/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useProfilingStatus } from '../../components/contexts/profiling_status/use_profiling_status';
import { AddDataInstructions } from './add_data_instructions';
import { DeleteDataInstructions } from './delete_data_instructions';
import { UniversalProfilingSetupPrompt } from './universal_profiling_setup_prompt';

export function AddDataView() {
  const { data } = useProfilingStatus();

  if (data?.universalProfiling.hasLegacyData) {
    return <DeleteDataInstructions />;
  }

  if (!data?.universalProfiling.hasSetup) {
    return <UniversalProfilingSetupPrompt />;
  }

  return <AddDataInstructions />;
}
