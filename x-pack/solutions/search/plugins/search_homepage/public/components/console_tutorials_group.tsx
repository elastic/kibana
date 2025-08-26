/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../hooks/use_kibana';

interface TutorialMetadata {
  title: string;
  telemetryId: string;
  i18nID: string;
  description: string;
  request: string;
  duration: number;
}

export const ConsoleTutorialsGroup = () => {
  const { application, share, console: consolePlugin } = useKibana().services;

  const tutorials: TutorialMetadata[] = [
    {
      title: 'Search Basics',
      telemetryId: 'console_tutorials_search_basics',
      i18nID: 'xpack.searchHomepage.consoleTutorials.basicsDescription',
      description: 'Learn how to create an index and execute your first search.',
      request: consoleTutorials.basics,
      duration: 3,
    },
    {
      title: 'Semantic Search',
      telemetryId: 'console_tutorials_semantic_search',
      i18nID: 'xpack.searchHomepage.consoleTutorials.semanticDescription',
      description: 'Make search understand context and meaning.',
      request: consoleTutorials.semanticSearch,
      duration: 3,
    },
    {
      title: 'ES|QL',
      telemetryId: 'console_tutorials_esql',
      i18nID: 'xpack.searchHomepage.consoleTutorials.esqlDescription',
      description: 'Query your data with familiar SQL-like syntax.',
      request: consoleTutorials.esql,
      duration: 4,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="xl" direction={'column'} justifyContent="spaceBetween">
      <EuiFlexItem grow={false}>
        <EuiTitle size="s">
          <span>
            {i18n.translate('xpack.searchHomepage.consoleTutorials.label', {
              defaultMessage: 'Get started with the API',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" wrap justifyContent="spaceEvenly">
          {tutorials.map((tutorial, index) => (
            <EuiFlexItem key={index} grow={false} style={{ minWidth: 300, maxWidth: 300 }}>
              <EuiCard
                paddingSize="l"
                display="plain"
                title={tutorial.title}
                titleSize="xs"
                description={i18n.translate(tutorial.i18nID, {
                  defaultMessage: tutorial.description,
                })}
                betaBadgeProps={{
                  label: `${tutorial.duration} min`,
                  tooltipContent: (
                    <FormattedMessage
                      id="xpack.searchHomepage.consoleTutorials.durationTooltip"
                      defaultMessage="Estimated time to complete tutorial is {duration} minutes"
                      values={{ duration: tutorial.duration }}
                    />
                  ),
                }}
              >
                <TryInConsoleButton
                  request={tutorial.request}
                  application={application}
                  consolePlugin={consolePlugin}
                  sharePlugin={share}
                  content="Run in Console"
                  telemetryId={tutorial.telemetryId}
                />
              </EuiCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
