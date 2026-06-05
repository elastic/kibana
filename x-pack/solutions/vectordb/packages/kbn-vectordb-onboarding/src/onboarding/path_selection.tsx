/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useHistory } from 'react-router-dom';
import { markOnboardingSeen } from '../first_load';
import SearchLakeSvg from '../assets/search_lake.svg';
import VectorSearchSvg from '../assets/vector_search.svg';
import { ConnectToProject } from '../connection_details/connect_to_project';
import { FeatureTags, OnboardingPanel } from './onboarding_panel';
import { useOnboardingCredentials } from '../hooks/use_onboarding_credentials';
import { pathQuery } from '../hooks/use_wizard_path';
import type { VectorPath } from './types';

interface CardDescriptionProps {
  text: string;
  tags: string[];
}

const CardDescription = ({ text, tags }: CardDescriptionProps) => (
  <>
    <p>{text}</p>
    <EuiSpacer size="s" />
    <FeatureTags tags={tags} />
  </>
);

export const PathSelection = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { elasticsearchUrl, apiKey, isLoading } = useOnboardingCredentials();

  useEffect(() => {
    markOnboardingSeen();
  }, []);

  const choose = (path: VectorPath) => history.push(`/onboarding/ingest${pathQuery(path)}`);

  const generateTags = [
    i18n.translate('vectordbOnboarding.pathSelection.generate.tag1', {
      defaultMessage: 'Jina models',
    }),
    i18n.translate('vectordbOnboarding.pathSelection.generate.tag2', {
      defaultMessage: 'Semantic search',
    }),
    i18n.translate('vectordbOnboarding.pathSelection.generate.tag3', {
      defaultMessage: 'No config needed',
    }),
  ];

  const storeTags = [
    i18n.translate('vectordbOnboarding.pathSelection.store.tag1', {
      defaultMessage: 'Intelligent mapping',
    }),
    i18n.translate('vectordbOnboarding.pathSelection.store.tag2', {
      defaultMessage: 'Optimized storage settings',
    }),
  ];

  return (
    <EuiPageTemplate panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiSpacer size="xxl" />
        <EuiSpacer size="m" />
        <EuiTitle size="l">
          <h1>
            {i18n.translate('vectordbOnboarding.pathSelection.title', {
              defaultMessage: 'The fastest path to vector search',
            })}
          </h1>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText color="subdued" css={{ maxWidth: euiTheme.base * 36 }}>
          <p>
            {i18n.translate('vectordbOnboarding.pathSelection.description', {
              defaultMessage:
                'Production-grade defaults for vector workloads, hybrid search and two ways to get embeddings.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="l" />

        <ConnectToProject
          elasticsearchUrl={elasticsearchUrl}
          apiKey={apiKey}
          isLoading={isLoading}
        />

        <EuiSpacer size="xl" />

        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem>
            <OnboardingPanel
              dataTestSubj="vectordbPathSelectionGenerate"
              telemetryId="vectordbOnboarding-pathSelection-generateVectors"
              icon={SearchLakeSvg}
              title={i18n.translate('vectordbOnboarding.pathSelection.generate.title', {
                defaultMessage: 'Generate vectors for me',
              })}
              description={
                <CardDescription
                  text={i18n.translate('vectordbOnboarding.pathSelection.generate.description', {
                    defaultMessage:
                      'Bring your content and let Elastic handle the rest with no extra necessary for optimal storage and search latency.',
                  })}
                  tags={generateTags}
                />
              }
              onClick={() => choose('generate-vectors')}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <OnboardingPanel
              dataTestSubj="vectordbPathSelectionStore"
              telemetryId="vectordbOnboarding-pathSelection-haveVectors"
              icon={VectorSearchSvg}
              title={i18n.translate('vectordbOnboarding.pathSelection.store.title', {
                defaultMessage: 'Store and search my vectors',
              })}
              description={
                <CardDescription
                  text={i18n.translate('vectordbOnboarding.pathSelection.store.description', {
                    defaultMessage:
                      'Ingest your vectors into optimized storage and quickly start running your queries.',
                  })}
                  tags={storeTags}
                />
              }
              onClick={() => choose('have-vectors')}
            />
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiButtonEmpty
          flush="left"
          onClick={() => history.push('/')}
          data-test-subj="vectordbPathSelectionSkip"
          data-telemetry-id="vectordbOnboarding-pathSelection-skip"
        >
          {i18n.translate('vectordbOnboarding.pathSelection.skip', {
            defaultMessage: 'Skip the setup guide',
          })}
        </EuiButtonEmpty>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
