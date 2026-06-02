/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import { markOnboardingSeen } from '../first_load';
import type { VectorPath } from './snippets';
import { StepLayout } from './step_layout';
import { pathQuery } from './use_wizard_path';

export const PathStep: React.FC = () => {
  const history = useHistory();

  // The user has reached the wizard — don't auto-redirect them back here next time.
  useEffect(() => {
    markOnboardingSeen();
  }, []);

  const choose = (path: VectorPath) => history.push(`/onboarding/ingest${pathQuery(path)}`);

  return (
    <StepLayout currentStep={1} variant="hero" onSkip={() => history.push('/')}>
      <div style={{ textAlign: 'center' }}>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('vectordbOnboarding.path.title', {
              defaultMessage: 'Do you already have vectors?',
            })}
          </h1>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="m" color="subdued">
          <p>
            {i18n.translate('vectordbOnboarding.path.description', {
              defaultMessage: 'Not sure? Let us generate the vectors for you.',
            })}
          </p>
        </EuiText>
      </div>

      <EuiSpacer size="xxl" />

      <EuiFlexGroup gutterSize="xl">
        <EuiFlexItem>
          <EuiCard
            data-test-subj="vectordbPathHave"
            icon={<EuiIcon type="tokenVectorDense" size="xxl" color="primary" aria-hidden />}
            title={i18n.translate('vectordbOnboarding.path.have.label', {
              defaultMessage: 'I already have vectors',
            })}
            paddingSize="l"
            textAlign="center"
            description={
              <FormattedMessage
                id="vectordbOnboarding.path.have.description"
                defaultMessage="Just ingest your vectors and we'll handle the rest, using quantization to optimize storage and search latency."
              />
            }
            onClick={() => choose('have-vectors')}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiCard
            data-test-subj="vectordbPathGenerate"
            icon={<EuiIcon type="tokenSemanticText" size="xxl" color="accent" aria-hidden />}
            title={i18n.translate('vectordbOnboarding.path.generate.label', {
              defaultMessage: 'Generate vectors for me',
            })}
            paddingSize="l"
            textAlign="center"
            onClick={() => choose('generate-vectors')}
            description={
              <FormattedMessage
                id="vectordbOnboarding.path.generate.description"
                defaultMessage="Just ingest your text documents and we'll use our state of the art models to generate the vectors."
              />
            }
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </StepLayout>
  );
};
