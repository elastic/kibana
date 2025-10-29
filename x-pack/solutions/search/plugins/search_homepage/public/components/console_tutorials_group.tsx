/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

interface TutorialMetadata {
  title: string;
  dataTestSubj: string;
  description: string;
  request: string;
  duration: number;
}

export const ConsoleTutorialsGroup = () => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const [hoveredTutorial, setHoveredTutorial] = React.useState<string | null>(null);

  const tutorials: TutorialMetadata[] = [
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsTitle', {
        defaultMessage: 'Search basics',
      }),
      dataTestSubj: 'console_tutorials_search_basics',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsDescription', {
        defaultMessage: 'Learn how to create an index, add documents, and basic search techniques.',
      }),
      request: consoleTutorials.basics,
      duration: 3,
    },
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.semanticTitle', {
        defaultMessage: 'Semantic search',
      }),
      dataTestSubj: 'console_tutorials_semantic_search',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.semanticDescription', {
        defaultMessage:
          'Learn semantic search techniques to understand intent and deliver more accurate, relevant results.',
      }),
      request: consoleTutorials.semanticSearch,
      duration: 3,
    },
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.esqlTitle', {
        defaultMessage: 'ES|QL',
      }),
      dataTestSubj: 'console_tutorials_esql',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.esqlDescription', {
        defaultMessage:
          "Learn how to use Elastic's piped query language to simplify data investigations.",
      }),
      request: consoleTutorials.esql,
      duration: 4,
    },
    // TODO:  uncomment below lines when we are ready to show TSDS tutorial. review https://github.com/elastic/kibana/pull/237384#issuecomment-3411670210
    // {
    //   title: i18n.translate('xpack.searchHomepage.consoleTutorials.tsdsTitle', {
    //     defaultMessage: 'Time series data streams',
    //   }),
    //   dataTestSubj: 'console_tutorials_tsds',
    //   description: i18n.translate('xpack.searchHomepage.consoleTutorials.tsdsDescription', {
    //     defaultMessage:
    //       'Learn how to use a time series data stream (TSDS) to store timestamped metrics data.',
    //   }),
    //   request: consoleTutorials.timeSeriesDataStreams,
    //   duration: 3,
    // },
  ];

  return (
    <EuiFlexGroup gutterSize="m" direction={'column'} justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <h3>
            {i18n.translate('xpack.searchHomepage.consoleTutorials.label', {
              defaultMessage: 'Get started with the API',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" justifyContent="spaceBetween">
          {tutorials.map((tutorial, index) => (
            <EuiFlexItem key={index}>
              <EuiCard
                hasBorder={hoveredTutorial === tutorial.dataTestSubj}
                display={hoveredTutorial === tutorial.dataTestSubj ? 'plain' : 'subdued'}
                onMouseEnter={() => setHoveredTutorial(tutorial.dataTestSubj)}
                onMouseLeave={() => setHoveredTutorial(null)}
                paddingSize="s"
                title={tutorial.title}
                titleSize="xs"
                textAlign="left"
              >
                <EuiFlexGroup
                  gutterSize="s"
                  direction="column"
                  justifyContent="center"
                  alignItems="flexStart"
                >
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">
                      <EuiText size="relative" color="subdued">
                        ~{tutorial.duration} min
                      </EuiText>
                    </EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText size="relative">{tutorial.description}</EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <TryInConsoleButton
                      request={tutorial.request}
                      application={application}
                      consolePlugin={consolePlugin}
                      sharePlugin={share}
                      telemetryId={tutorial.dataTestSubj}
                      data-test-subj={tutorial.dataTestSubj}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
