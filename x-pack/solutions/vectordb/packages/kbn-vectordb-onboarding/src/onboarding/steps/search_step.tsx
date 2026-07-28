/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import { useKibana } from '../../services';
import { ApiStep } from '../components/api_step';
import { getStepContent } from '../components/onboarding_data';
import { StepLayout } from '../components/step_layout';
import { pathQuery, useReturnPath, useWizardPath } from '../../hooks/use_wizard_path';
import { useOnboardingNavigate } from '../../hooks/use_onboarding_navigate';
import { ONBOARDING_PATH } from '../../routes';

export const SearchStep = () => {
  const origin = useReturnPath();
  const navigate = useOnboardingNavigate(origin);
  const path = useWizardPath();
  const {
    services: { docLinks },
  } = useKibana();

  if (!path) return <Redirect to={ONBOARDING_PATH} />;

  const contentKey = path === 'generate-vectors' ? 'generate' : 'have_vectors';
  const { title, description, api, docsPanel, pills } = getStepContent(docLinks)[contentKey].search;
  const step = 'search';

  return (
    <StepLayout
      currentStep={2}
      path={path}
      step={step}
      title={title}
      description={description}
      onBack={() => navigate(`${ONBOARDING_PATH}/ingest${pathQuery(path)}`)}
      onComplete={() => navigate('/')}
    >
      <ApiStep
        tabs={api.tabs}
        consoleComment={api.consoleComment}
        docsPanel={docsPanel}
        pills={pills}
        step={step}
        path={path}
      />
    </StepLayout>
  );
};
