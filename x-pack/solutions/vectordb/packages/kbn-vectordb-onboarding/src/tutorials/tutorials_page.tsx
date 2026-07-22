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
  EuiPageTemplate,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../services';
import { getTutorialContent } from './tutorial_data';
import { useTutorialProgress } from './use_tutorial_progress';
import { ConnectToProject } from '../connection_details/connect_to_project';
import { useOnboardingCredentials } from '../hooks/use_onboarding_credentials';
import { OnboardingPaths } from '../onboarding/components/onboarding_paths';
import { TUTORIALS_PATH } from '../routes';

const ALL_TOPICS_ID = 'all';

export const TutorialsPage = () => {
  const {
    services: { docLinks },
  } = useKibana();
  const { elasticsearchUrl, apiKey, isLoading: isCredentialsLoading } = useOnboardingCredentials();
  const { completed, markComplete } = useTutorialProgress();
  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS_ID);

  const tutorials = getTutorialContent(docLinks);
  const total = tutorials.length;
  const doneCount = tutorials.filter((t) => completed.has(t.id)).length;

  const filteredTutorials =
    selectedTopic === ALL_TOPICS_ID
      ? tutorials
      : tutorials.filter((t) => t.topic === selectedTopic);

  const topicOptions = [
    {
      id: ALL_TOPICS_ID,
      label: i18n.translate('vectordbOnboarding.tutorials.filter.all', { defaultMessage: 'All' }),
    },
    ...Array.from(new Set(tutorials.map((t) => t.topic)), (topic) => ({
      id: topic,
      label: topic,
    })),
  ];

  return (
    <EuiPageTemplate restrictWidth panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiTitle size="m">
              <h1>
                <FormattedMessage
                  id="vectordbOnboarding.tutorials.pageTitle"
                  defaultMessage="Getting started"
                />
              </h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ConnectToProject
              elasticsearchUrl={elasticsearchUrl}
              apiKey={apiKey}
              isLoading={isCredentialsLoading}
              showLabel={false}
              isCompact
              telemetryPage="gettingStarted"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="l" />
        <OnboardingPaths origin={TUTORIALS_PATH} />
        <EuiHorizontalRule margin="xl" />
        <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiButtonGroup
              legend={i18n.translate('vectordbOnboarding.tutorials.topicSelect', {
                defaultMessage: 'Filter documentation by topic',
              })}
              options={topicOptions}
              idSelected={selectedTopic}
              onChange={(id) => setSelectedTopic(id)}
              data-test-subj="tutorialsTopicFilter"
              data-telemetry-id="vectordbOnboarding-tutorials-topicFilter"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="vectordbOnboarding.tutorials.completionLabel"
                defaultMessage="{done} of {total} total completed"
                values={{ done: doneCount, total }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="l" />

        <EuiFlexGrid columns={3} gutterSize="m">
          {filteredTutorials.map((tutorial) => {
            const isDone = completed.has(tutorial.id);
            return (
              <EuiCard
                key={tutorial.id}
                data-test-subj={`tutorialCard-${tutorial.id}`}
                data-telemetry-id={`vectordbOnboarding-tutorials-card-${tutorial.id}`}
                href={tutorial.href}
                target={tutorial.target}
                onClick={() => markComplete(tutorial.id)}
                icon={
                  <EuiBadge color="hollow" iconType={tutorial.icon}>
                    {tutorial.topic}
                  </EuiBadge>
                }
                title={tutorial.title}
                titleSize="xs"
                paddingSize="l"
                textAlign="left"
                description={
                  <>
                    <EuiText size="s" color="subdued">
                      <p>{tutorial.description}</p>
                    </EuiText>
                    <EuiSpacer size="s" />
                    {isDone ? (
                      <EuiBadge color="success" iconType="check">
                        {i18n.translate('vectordbOnboarding.tutorials.complete', {
                          defaultMessage: 'Complete',
                        })}
                      </EuiBadge>
                    ) : (
                      <EuiBadge color="hollow">
                        {i18n.translate('vectordbOnboarding.tutorials.unread', {
                          defaultMessage: 'Unread',
                        })}
                      </EuiBadge>
                    )}
                  </>
                }
              />
            );
          })}
        </EuiFlexGrid>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
