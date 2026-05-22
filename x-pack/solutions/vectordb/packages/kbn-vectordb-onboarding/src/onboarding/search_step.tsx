/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCode, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Redirect, useHistory } from 'react-router-dom';
import { useKibana } from '../services';
import { ONBOARDING_TUTORIAL_ID } from '../tutorials/tutorial_data';
import { markTutorialComplete } from '../tutorials/use_tutorial_progress';
import { ApiStep } from './api_step';
import { getSearchSnippets } from './language_snippets';
import { getSearchSnippet } from './snippets';
import { StepLayout } from './step_layout';
import { pathQuery, useWizardPath } from './use_wizard_path';

export const SearchStep: React.FC = () => {
  const history = useHistory();
  const path = useWizardPath();
  const {
    services: { docLinks },
  } = useKibana();

  if (!path) return <Redirect to="/onboarding" />;

  const isGenerate = path === 'generate-vectors';
  const docsHref = isGenerate
    ? docLinks.links.enterpriseSearch.semanticSearch
    : docLinks.links.enterpriseSearch.knnSearch;

  return (
    <StepLayout
      currentStep={3}
      title={
        isGenerate
          ? i18n.translate('vectordbOnboarding.search.generate.title', {
              defaultMessage: 'Search with natural language',
            })
          : i18n.translate('vectordbOnboarding.search.have.title', {
              defaultMessage: 'Run a kNN query',
            })
      }
      docsLabel={i18n.translate('vectordbOnboarding.search.docsLabel', {
        defaultMessage: 'Search docs',
      })}
      docsHref={docsHref}
      onSkip={() => history.push('/')}
      onBack={() => history.push(`/onboarding/ingest${pathQuery(path)}`)}
      onNext={() => {
        markTutorialComplete(ONBOARDING_TUTORIAL_ID);
        history.push('/');
      }}
      nextLabel={i18n.translate('vectordbOnboarding.search.done', {
        defaultMessage: 'Done',
      })}
    >
      {!isGenerate ? (
        <>
          <EuiCallOut
            announceOnMount
            color="primary"
            size="s"
            title={
              <EuiText size="xs">
                <FormattedMessage
                  id="vectordbOnboarding.search.have.callout"
                  defaultMessage="Tune {numCandidates} to trade off speed against accuracy."
                  values={{
                    numCandidates: (
                      <>
                        <EuiCode>num_candidates</EuiCode>
                      </>
                    ),
                  }}
                />
              </EuiText>
            }
          />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <ApiStep snippets={getSearchSnippets(path)} consoleRequest={getSearchSnippet(path)} />
    </StepLayout>
  );
};
