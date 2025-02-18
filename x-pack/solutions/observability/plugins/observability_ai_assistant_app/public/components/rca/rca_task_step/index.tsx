/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { RootCauseAnalysisStepItem } from '../rca_step';

export function RootCauseAnalysisTaskStepItem({
  label,
  status,
}: {
  label: React.ReactNode;
  status: 'pending' | 'completed' | 'failure';
}) {
  let color: React.ComponentProps<typeof RootCauseAnalysisStepItem>['color'];
  let iconType: React.ComponentProps<typeof RootCauseAnalysisStepItem>['iconType'];

  let loading: boolean | undefined;

  if (status === 'failure') {
    color = 'danger';
    iconType = 'alert';
  } else if (status === 'completed') {
    color = 'success';
    iconType = 'checkInCircleFilled';
  } else {
    color = 'primary';
    loading = true;
  }

  return (
    <RootCauseAnalysisStepItem loading={loading} label={label} color={color} iconType={iconType} />
  );
}
