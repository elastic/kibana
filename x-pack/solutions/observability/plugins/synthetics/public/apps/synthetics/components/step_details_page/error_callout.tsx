/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { JourneyStep } from '../../../../../common/runtime_types';

export const ErrorCallOut = ({ step }: { step?: JourneyStep }) => {
  if (!step || step.synthetics.step?.status !== 'failed') {
    return null;
  }

  const error = step.error?.message ?? '';
  if (!error) {
    return null;
  }

  return (
    <>
      <KbnDangerCallout title={error} />
      <EuiSpacer />
    </>
  );
};
