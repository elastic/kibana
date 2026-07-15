/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import {
  EuiBadge,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useIsWithinMaxBreakpoint,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { orderBy } from 'lodash';
import { useKibana } from '../../hooks/use_kibana';
import { isNew } from '../../common/utils';
import { TutorialCardStyles } from './styles';

interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  publishedAt: Date;
}

export const ConsoleTutorialsGroup = () => {
  const { console: consolePlugin } = useKibana().services;
  const isMediumBreakpoint = useIsWithinMaxBreakpoint('m');
  const isSmallBreakpoint = useIsWithinMaxBreakpoint('s');
  const tutorialColumns = isSmallBreakpoint ? 1 : isMediumBreakpoint ? 2 : 3;

  const openConsole = useCallback(
    (request: string) =>
      consolePlugin?.openEmbeddedConsole && consolePlugin.openEmbeddedConsole(request),
    [consolePlugin]
  );

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
        publishedAt: new Date('2025-10-31'),
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
        publishedAt: new Date('2025-10-31'),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.esqlTitle', {
          defaultMessage: 'ES|QL fundamentals',
        }),
        dataTestSubj: 'console_tutorials_esql',
        description: i18n.translate('xpack.searchGettingStarted.consoleTutorials.esqlDescription', {
          defaultMessage:
            "Learn how to use Elastic's piped query language to simplify and speed up data investigations.",
        }),
        request: consoleTutorials.esql,
        publishedAt: new Date('2025-10-31'),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.agentBuilderTitle', {
          defaultMessage: 'Build a chat tool with Agent Builder',
        }),
        dataTestSubj: 'console_tutorials_agent_builder',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.agentBuilderDescription',
          {
            defaultMessage:
              'Interact with Agent Builder through the API to build and interact with tools.',
          }
        ),
        request: consoleTutorials.agentBuilder,
        publishedAt: new Date('2026-02-18'),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsTitle', {
          defaultMessage: 'Time series data streams',
        }),
        dataTestSubj: 'console_tutorials_tsds',
        description: i18n.translate('xpack.searchGettingStarted.consoleTutorials.tsdsDescription', {
          defaultMessage:
            'Learn how to use a time series data stream (TSDS) to store timestamped metrics data.',
        }),
        request: consoleTutorials.timeSeriesDataStreams,
        publishedAt: new Date('2026-02-04'),
      },
      {
        title: i18n.translate('xpack.searchGettingStarted.consoleTutorials.vectorSearchTitle', {
          defaultMessage: 'Vector Database',
        }),
        dataTestSubj: 'console_tutorials_vector_search',
        description: i18n.translate(
          'xpack.searchGettingStarted.consoleTutorials.vectorSearchDescription',
          {
            defaultMessage:
              'Store and search vectors for semantic search, chatbots, recommenders, and RAG. Generate or bring your own vectors.',
          }
        ),
        request: consoleTutorials.vectorDatabase,
        publishedAt: new Date('2026-04-01'),
      },
    ],
    []
  );

  return (
    <EuiFlexGroup gutterSize="m" direction="column" justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h5>
            {i18n.translate('xpack.searchGettingStarted.consoleTutorials.label', {
              defaultMessage: 'Explore the API',
            })}
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.searchGettingStarted.consoleTutorials.description', {
              defaultMessage:
                'Choose a tutorial and use Console to quickly start interacting with the Elasticsearch API.',
            })}
          </p>
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiFlexGrid columns={tutorialColumns}>
          {orderBy(tutorials, ({ publishedAt }) => publishedAt.getTime(), ['desc']).map(
            (tutorial) => (
              <EuiFlexGroup
                gutterSize="xs"
                direction="column"
                key={tutorial.dataTestSubj}
                css={TutorialCardStyles}
                data-test-subj={tutorial.dataTestSubj}
                data-telemetry-id={tutorial.dataTestSubj}
                onClick={() => openConsole(tutorial.request)}
              >
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                    {isNew(tutorial.publishedAt) && (
                      <EuiFlexItem grow={false}>
                        <EuiBadge color="accent" fill>
                          {i18n.translate('xpack.searchGettingStarted.consoleTutorials.newBadge', {
                            defaultMessage: 'New',
                          })}
                        </EuiBadge>
                      </EuiFlexItem>
                    )}
                    <EuiTitle size="xxs" className="tutorialTitle">
                      <h4>{tutorial.title}</h4>
                    </EuiTitle>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiText size="xs" color="subdued">
                  {tutorial.description}
                </EuiText>
              </EuiFlexGroup>
            )
          )}
        </EuiFlexGrid>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
