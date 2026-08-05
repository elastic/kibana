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

export const IngestStep = () => {
  const origin = useReturnPath();
  const navigate = useOnboardingNavigate(origin);
  const path = useWizardPath();
  const {
    services: { docLinks },
  } = useKibana();

  if (!path) return <Redirect to={ONBOARDING_PATH} />;

  const contentKey = path === 'generate-vectors' ? 'generate' : 'have_vectors';
  const { title, description, api, docsPanel, pills } = getStepContent(docLinks)[contentKey].ingest;
  const step = 'ingest';

  return (
    <StepLayout
      currentStep={1}
      path={path}
      step={step}
      title={title}
      description={description}
      onBack={() => navigate(origin)}
      onNext={() => navigate(`${ONBOARDING_PATH}/search${pathQuery(path)}`)}
    >
      <ApiStep
        snippets={api.snippets}
        consoleRequest={api.request}
        consoleComment={api.consoleComment}
        docsPanel={docsPanel}
        pills={pills}
        step={step}
        path={path}
      />
    </StepLayout>
  );
};
