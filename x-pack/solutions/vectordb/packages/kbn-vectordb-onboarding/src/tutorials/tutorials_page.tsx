/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiCard,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageTemplate,
  EuiProgress,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import { useKibana } from '../services';
import { getTutorials, type Tutorial } from './tutorial_data';
import { useTutorialProgress } from './use_tutorial_progress';

const isExternal = (href: string): boolean => /^https?:\/\//.test(href);

export const TutorialsPage: React.FC = () => {
  const history = useHistory();
  const { euiTheme } = useEuiTheme();
  const { completed, markComplete } = useTutorialProgress();
  const {
    services: { docLinks },
  } = useKibana();

  const tutorials = getTutorials(docLinks);
  const total = tutorials.length;
  const doneCount = tutorials.filter((t) => completed.has(t.id)).length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const onTutorialClick = (tutorial: Tutorial) => {
    if (isExternal(tutorial.href)) {
      // Mark complete for external tutorials when the user opens them.
      markComplete(tutorial.id);
      window.open(tutorial.href, '_blank', 'noopener,noreferrer');
    } else {
      // For in-app tutorials (e.g. the wizard), completion happens at the
      // tutorial's own "done" event, not on click.
      history.push(tutorial.href);
    }
  };

  return (
    <EuiPageTemplate restrictWidth="1100px" panelled={false} grow={false}>
      <EuiPageTemplate.Section paddingSize="xl" grow={false}>
        <EuiTitle size="l">
          <h1>
            {i18n.translate('vectordbOnboarding.tutorials.heading', {
              defaultMessage: 'Vector search tutorials',
            })}
          </h1>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText color="subdued" size="s">
          <p>
            {i18n.translate('vectordbOnboarding.tutorials.subheading', {
              defaultMessage:
                'Hands-on guides for building, tuning, and shipping vector search in production.',
            })}
          </p>
        </EuiText>

        <EuiSpacer size="m" />

        <EuiFlexGroup
          alignItems="center"
          gutterSize="m"
          responsive={false}
          data-test-subj="tutorialsCompletionTracker"
        >
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="vectordbOnboarding.tutorials.completionLabel"
                  defaultMessage="{done} of {total} completed"
                  values={{ done: doneCount, total }}
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiProgress
              value={doneCount}
              max={total}
              size="s"
              color={doneCount === total ? 'success' : 'primary'}
              valueText={false}
              aria-label={i18n.translate('vectordbOnboarding.tutorials.completionAria', {
                defaultMessage: 'Tutorial completion',
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
              {percent}%
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>

        <EuiSpacer size="xl" />

        <EuiFlexGrid columns={3} gutterSize="m">
          {tutorials.map((tutorial) => {
            const isDone = completed.has(tutorial.id);
            return (
              <EuiCard
                key={tutorial.id}
                data-test-subj={`tutorialCard-${tutorial.id}`}
                icon={
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    <EuiFlexItem grow={false}>
                      <EuiIcon
                        type={tutorial.icon}
                        size="xl"
                        color={isDone ? 'success' : 'primary'}
                        aria-hidden
                      />
                    </EuiFlexItem>
                    {isDone ? (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="success" iconType="check">
                          {i18n.translate('vectordbOnboarding.tutorials.done', {
                            defaultMessage: 'Done',
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    ) : null}
                  </EuiFlexGroup>
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
                    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="hollow" iconType="clock">
                          {tutorial.duration}
                        </EuiBadge>
                      </EuiFlexItem>
                      {tutorial.tags.map((tag) => (
                        <EuiFlexItem grow={false} key={tag}>
                          <EuiBadge color={euiTheme.colors.lightShade}>{tag}</EuiBadge>
                        </EuiFlexItem>
                      ))}
                    </EuiFlexGroup>
                  </>
                }
                onClick={() => onTutorialClick(tutorial)}
              />
            );
          })}
        </EuiFlexGrid>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
