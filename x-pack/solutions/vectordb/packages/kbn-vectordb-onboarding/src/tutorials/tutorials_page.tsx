/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiBadge,
  EuiButtonGroup,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../services';
import { getTutorialContent, TUTORIAL_TOPICS } from './tutorial_data';
import { ConnectToProject } from '../connection_details/connect_to_project';
import { useOnboardingCredentials } from '../hooks/use_onboarding_credentials';
import { OnboardingPaths } from '../onboarding/components/onboarding_paths';
import { TUTORIALS_PATH } from '../routes';

const ALL_TOPICS_ID = 'all';

export const TutorialsPage = () => {
  const {
    services: { docLinks },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { elasticsearchUrl, apiKey, isLoading: isCredentialsLoading } = useOnboardingCredentials();
  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS_ID);

  const tutorials = getTutorialContent(docLinks);

  const filteredTutorials =
    selectedTopic === ALL_TOPICS_ID
      ? tutorials
      : tutorials.filter((t) => t.topic === selectedTopic);

  const topicOptions = [
    {
      id: ALL_TOPICS_ID,
      label: i18n.translate('vectordbOnboarding.tutorials.filter.all', { defaultMessage: 'All' }),
      'data-telemetry-id': `vectordbOnboarding-tutorials-topicFilter-${ALL_TOPICS_ID}`,
    },
    ...Object.entries(TUTORIAL_TOPICS).map(([topicId, topic]) => ({
      id: topicId,
      label: topic.filter,
      'data-telemetry-id': `vectordbOnboarding-tutorials-topicFilter-${topicId}`,
    })),
  ];

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup gutterSize="l" direction="column">
          <EuiIcon size="xxl" type="logoVectorDB" aria-hidden={true} />
          <EuiFlexGroup gutterSize="m" direction="column">
            <EuiTitle size="l">
              <h1>
                <FormattedMessage
                  id="vectordbOnboarding.tutorials.pageTitle"
                  defaultMessage="Get started with your Elasticsearch Vector Database"
                />
              </h1>
            </EuiTitle>
            <EuiText color="subdued" css={{ maxWidth: euiTheme.base * 36 }}>
              <p>
                <FormattedMessage
                  id="vectordbOnboarding.tutorials.pageSubtitle"
                  defaultMessage="Production-grade defaults, hybrid search, and your choice of generating embeddings or bringing your own."
                />
              </p>
            </EuiText>
            <EuiFlexItem>
              <ConnectToProject
                elasticsearchUrl={elasticsearchUrl}
                apiKey={apiKey}
                isLoading={isCredentialsLoading}
                telemetryPage="gettingStarted"
                apiKeyButtonFill={false}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
          <EuiFlexItem>
            <OnboardingPaths origin={TUTORIALS_PATH} />
          </EuiFlexItem>
          <EuiHorizontalRule margin="xs" />
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem>
              <EuiButtonGroup
                legend={i18n.translate('vectordbOnboarding.tutorials.topicSelect', {
                  defaultMessage: 'Filter resources by topic',
                })}
                options={topicOptions}
                idSelected={selectedTopic}
                onChange={(id) => setSelectedTopic(id)}
                data-test-subj="tutorialsTopicFilter"
              />
            </EuiFlexItem>
          </EuiFlexGroup>

          <EuiFlexGrid columns={3} gutterSize="m">
            {filteredTutorials.map((tutorial) => (
              <EuiCard
                key={tutorial.id}
                data-test-subj={`tutorialCard-${tutorial.id}`}
                data-telemetry-id={`vectordbOnboarding-tutorials-card-${tutorial.id}`}
                href={tutorial.href}
                target="_blank"
                hasBorder
                title={tutorial.title}
                titleSize="xs"
                paddingSize="l"
                textAlign="left"
                description={tutorial.description}
                footer={
                  <EuiBadge iconType={TUTORIAL_TOPICS[tutorial.topic].icon}>
                    {TUTORIAL_TOPICS[tutorial.topic].tag}
                  </EuiBadge>
                }
              />
            ))}
          </EuiFlexGrid>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
