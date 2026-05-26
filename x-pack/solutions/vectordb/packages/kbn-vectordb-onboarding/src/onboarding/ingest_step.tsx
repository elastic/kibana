/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut, EuiCode, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { Redirect, useHistory } from 'react-router-dom';
import { useKibana } from '../services';
import { ApiStep } from './api_step';
import { getIngestSnippets } from './language_snippets';
import type { VectorPath } from './snippets';
import { getPrompt, getIngestSnippet } from './snippets';
import { StepLayout } from './step_layout';
import { pathQuery, useWizardPath } from './use_wizard_path';

interface IngestStepBaseProps {
  title: string;
  description: string;
  docsHref: string;
  path: VectorPath;
  showDimsCallout: boolean;
  onSkip: () => void;
  onBack: () => void;
  onNext: () => void;
}

const IngestStepBase: React.FC<IngestStepBaseProps> = ({
  title,
  description,
  docsHref,
  path,
  showDimsCallout,
  onSkip,
  onBack,
  onNext,
}) => (
  <StepLayout
    currentStep={2}
    title={title}
    description={description}
    docsLabel={i18n.translate('vectordbOnboarding.ingest.docsLabel', {
      defaultMessage: 'Learn more',
    })}
    docsHref={docsHref}
    onSkip={onSkip}
    onBack={onBack}
    onNext={onNext}
  >
    {showDimsCallout && (
      <>
        <EuiCallOut
          announceOnMount
          color="primary"
          size="s"
          title={
            <EuiText size="xs">
              <FormattedMessage
                id="vectordbOnboarding.ingest.have.callout"
                defaultMessage="Set {dims} to your model's output size and {similarity} to match how it was trained."
                values={{
                  dims: <EuiCode>dims</EuiCode>,
                  similarity: <EuiCode>similarity</EuiCode>,
                }}
              />
            </EuiText>
          }
        />
        <EuiSpacer size="m" />
      </>
    )}

    <ApiStep
      snippets={getIngestSnippets(path)}
      consoleRequest={getIngestSnippet(path)}
      prompt={getPrompt(path)}
    />

    <EuiSpacer size="m" />
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          <FormattedMessage
            id="vectordbOnboarding.ingest.claudeHint"
            defaultMessage="Want this in your codebase? {prompt} helps your coding assistant generate the right code for you."
            values={{
              prompt: (
                <strong>
                  {i18n.translate('vectordbOnboarding.ingest.claudeHint.prompt', {
                    defaultMessage: 'Copy prompt',
                  })}
                </strong>
              ),
            }}
          />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  </StepLayout>
);

const getTitle = (isGenerate: boolean): string =>
  isGenerate
    ? i18n.translate('vectordbOnboarding.ingest.generate.title', {
        defaultMessage: 'Index plain text',
      })
    : i18n.translate('vectordbOnboarding.ingest.have.title', {
        defaultMessage: 'Index your embeddings',
      });

const getDescription = (isGenerate: boolean): string =>
  isGenerate
    ? i18n.translate('vectordbOnboarding.ingest.generate.description', {
        defaultMessage:
          "Create the index, then ingest your data. We use Elastic's state of the art Jina models to generate your vectors.",
      })
    : i18n.translate('vectordbOnboarding.ingest.have.description', {
        defaultMessage:
          'Create the index with the right dimensions, then ingest your vectors. We quantize the vectors for you to save space and speed up search.',
      });

const getDocsHref = (
  isGenerate: boolean,
  { semanticTextField, knnSearch }: { semanticTextField: string; knnSearch: string }
): string => (isGenerate ? semanticTextField : knnSearch);

interface IngestStepProps {
  isGenerate: boolean;
}

export const IngestStep: React.FC<IngestStepProps> = ({ isGenerate }) => {
  const history = useHistory();
  const path: VectorPath = isGenerate ? 'generate-vectors' : 'have-vectors';
  const {
    services: { docLinks },
  } = useKibana();

  return (
    <IngestStepBase
      title={getTitle(isGenerate)}
      description={getDescription(isGenerate)}
      docsHref={getDocsHref(isGenerate, docLinks.links.enterpriseSearch)}
      path={path}
      showDimsCallout={!isGenerate}
      onSkip={() => history.push('/')}
      onBack={() => history.push(`/onboarding${pathQuery(path)}`)}
      onNext={() => history.push(`/onboarding/search${pathQuery(path)}`)}
    />
  );
};

export const IngestStepRoute: React.FC = () => {
  const path = useWizardPath();
  if (!path) return <Redirect to="/onboarding" />;
  return <IngestStep isGenerate={path === 'generate-vectors'} />;
};
