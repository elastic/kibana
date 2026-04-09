/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { PageTemplate } from './template';
import { OnboardingFlowForm } from '../onboarding_flow_form/onboarding_flow_form';
import { useFlowBreadcrumb } from '../shared/use_flow_breadcrumbs';

export const LandingPage = () => {
  useFlowBreadcrumb(null);
  return (
    <PageTemplate>
      <OnboardingFlowForm />
    </PageTemplate>
  );
};
