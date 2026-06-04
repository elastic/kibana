/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useHistory } from 'react-router-dom';
import { useKibana } from '../services';
import { ONBOARDING_TUTORIAL_ID } from '../tutorials/tutorial_data';
import { markTutorialComplete } from '../tutorials/use_tutorial_progress';
import { ApiStep } from './api_step';
import { getStepContent } from './step_content';
import { StepLayout } from './step_layout';
import { pathQuery, useWizardPath } from '../hooks/use_wizard_path';

export const SearchStep = () => {
  const history = useHistory();
  const path = useWizardPath();
  const {
    services: { docLinks },
  } = useKibana();

  if (!path) return <Redirect to="/onboarding" />;

  const contentKey = path === 'generate-vectors' ? 'generate' : 'have_vectors';
  const { title, description, docsLabel, docsHref, api, infoPanel } =
    getStepContent(docLinks)[contentKey].search;
  const step = 'search';

  return (
    <StepLayout
      currentStep={2}
      path={path}
      step={step}
      title={title}
      description={description}
      docsLabel={docsLabel}
      docsHref={docsHref}
      onBack={() => history.push(`/onboarding/ingest${pathQuery(path)}`)}
      onComplete={() => {
        markTutorialComplete(ONBOARDING_TUTORIAL_ID);
        history.push('/');
      }}
    >
      <ApiStep
        snippets={api.snippets}
        consoleRequest={api.request}
        consoleComment={api.consoleComment}
        infoPanel={infoPanel}
        step={step}
        path={path}
      />
    </StepLayout>
  );
};
