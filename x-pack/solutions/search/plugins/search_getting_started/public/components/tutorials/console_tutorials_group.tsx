/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useKibana } from '../../hooks/use_kibana';
import { SearchGettingStartedSectionHeading } from '../section_heading';

interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  icon: string;
  buttonRef: React.RefObject<HTMLButtonElement>;
  isNew?: boolean;
}

export const ConsoleTutorialsGroup = () => {
  const { application, console: consolePlugin, share } = useKibana().services;
  const { euiTheme } = useEuiTheme();
  const tutorials: TutorialMetadata[] = useMemo(
    () => [
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.basicsTitle', {
          defaultMessage: 'Search basics',
        }),
        dataTestSubj: 'console_tutorials_search_basics',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.basicsDescription',
          {
            defaultMessage:
              'Learn how to create an index, add documents, and basic search techniques.',
          }
        ),
        request: consoleTutorials.basics,
        icon: 'search',
        buttonRef: React.createRef<HTMLButtonElement>(),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.semanticTitle', {
          defaultMessage: 'Intro to semantic search',
        }),
        dataTestSubj: 'console_tutorials_semantic_search',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.semanticDescription',
          {
            defaultMessage:
              'Learn semantic search techniques to understand intent and deliver more accurate, relevant results.',
          }
        ),
        request: consoleTutorials.semanticSearch,
        icon: 'bullseye',
        buttonRef: React.createRef<HTMLButtonElement>(),
        isNew: true,
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.esqlTitle', {
          defaultMessage: 'ES|QL fundamentals',
        }),
        dataTestSubj: 'console_tutorials_esql',
        description: i18n.translate('xpack.searchGettingStarted.consoleTutorials.esqlDescription', {
          defaultMessage:
            "Learn how to use Elastic's piped query language to simplify data investigations.",
        }),
        request: consoleTutorials.esql,
        icon: 'console',
        buttonRef: React.createRef<HTMLButtonElement>(),
      },
      // TODO:  uncomment below lines when we are ready to show TSDS tutorial. review https://github.com/elastic/kibana/pull/237384#issuecomment-3411670210
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsTitle', {
          defaultMessage: 'Time series data streams',
        }),
        dataTestSubj: 'console_tutorials_tsds',
        description: i18n.translate('xpack.searchHomepage.consoleTutorials.tsdsDescription', {
          defaultMessage:
            'Learn how to use a time series data stream (TSDS) to store timestamped metrics data.',
        }),
        request: consoleTutorials.timeSeriesDataStreams,
        icon: 'clock',
        buttonRef: React.createRef<HTMLButtonElement>(),
      },
    ],
    []
  );

  const tutorialCardStyles = css`
    cursor: pointer;
    .tutorialIcon {
      background-color: ${euiTheme.colors.backgroundBaseSubdued};
      border-radius: ${euiTheme.border.radius.small};
      border: 1px solid transparent;
      padding: ${euiTheme.size.base};
    }
    &:hover {
      color: ${euiTheme.colors.textPrimary};
      .tutorialTitle {
        color: inherit;
      }
      .tutorialDescription {
        color: ${euiTheme.colors.textParagraph};
      }
      .tutorialIcon {
        border: 1px solid ${euiTheme.colors.borderBasePrimary};
        background-color: ${euiTheme.colors.backgroundBasePlain};
        color: inherit;
      }
    }
  `;

  const NewBadge = () => (
    <EuiFlexItem grow={false}>
      <EuiBadge color="accent">
        {i18n.translate('xpack.searchGettingStarted.consoleTutorials.newBadge', {
          defaultMessage: 'New',
        })}
      </EuiBadge>
    </EuiFlexItem>
  );

  return (
    <EuiFlexGroup gutterSize="l" direction="column" justifyContent="spaceBetween">
      <SearchGettingStartedSectionHeading
        title={i18n.translate('xpack.searchGettingStarted.consoleTutorials.label', {
          defaultMessage: 'Learn the API with step-by-step tutorials in Console',
        })}
        icon="commandLine"
      />
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" wrap>
          {tutorials.map((tutorial) => (
            // The card
            <EuiFlexItem key={tutorial.dataTestSubj} grow={true} css={tutorialCardStyles}>
              {/* The card content */}
              <EuiFlexGroup gutterSize="m" alignItems="flexStart" responsive={false}>
                {/* Icon */}
                <EuiFlexItem grow={false} className="tutorialIcon">
                  <EuiIcon type={tutorial.icon} size="l" />
                </EuiFlexItem>
                {/* Title and description */}
                <EuiFlexItem grow>
                  <EuiFlexGroup gutterSize="xs" direction="column" alignItems="flexStart">
                    {/* Badge and Title */}
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                        {tutorial.isNew && <NewBadge />}
                        <EuiFlexItem grow={false}>
                          <EuiTitle size="xs" className="tutorialTitle">
                            <h4>{tutorial.title}</h4>
                          </EuiTitle>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                    {/* Description */}
                    <EuiFlexItem grow={false}>
                      <EuiText size="s" className="tutorialDescription" color="subdued">
                        {tutorial.description}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
              {/* Hidden button for console functionality */}
              <TryInConsoleButton
                type="button"
                request={tutorial.request}
                application={application}
                sharePlugin={share}
                consolePlugin={consolePlugin}
                telemetryId={tutorial.dataTestSubj}
                data-test-subj={`${tutorial.dataTestSubj}-btn`}
                buttonProps={{
                  buttonRef: tutorial.buttonRef,
                  css: css`
                    display: none;
                  `,
                }}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
