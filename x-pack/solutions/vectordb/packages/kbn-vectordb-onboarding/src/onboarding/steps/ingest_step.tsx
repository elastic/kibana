/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { useKibana } from '../../services';
import { ApiStep } from '../components/api_step';
import { getStepContent } from '../components/onboarding_data';
import { StepLayout } from '../components/step_layout';
import { pathQuery, useWizardPath } from '../../hooks/use_wizard_path';
import { TUTORIALS_PATH, ONBOARDING_PATH } from '../../routes';

export const IngestStep = () => {
  const history = useHistory();
  const { state } = useLocation<{ from?: string }>();
  const path = useWizardPath();
  const from = state?.from ?? TUTORIALS_PATH;
  const {
    services: { docLinks },
  } = useKibana();

  if (!path) return <Redirect to={ONBOARDING_PATH} />;

  const contentKey = path === 'generate-vectors' ? 'generate' : 'have_vectors';
  const { title, description, docsLabel, docsHref, api, infoPanel } =
    getStepContent(docLinks)[contentKey].ingest;
  const step = 'ingest';

  return (
    <StepLayout
      currentStep={1}
      path={path}
      step={step}
      title={title}
      description={description}
      docsLabel={docsLabel}
      docsHref={docsHref}
      onBack={() => history.push(from)}
      onNext={() =>
        history.push({
          pathname: `${ONBOARDING_PATH}/search`,
          search: pathQuery(path),
          state: { from },
        })
      }
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
