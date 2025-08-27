/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { consoleTutorials } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiBadge, EuiCard, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
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
      title: 'Search basics',
      telemetryId: 'console_tutorials_search_basics',
      i18nID: 'xpack.searchHomepage.consoleTutorials.basicsDescription',
      description: 'Learn how to create an index, add documents, and basic search techniques.',
      request: consoleTutorials.basics,
      duration: 3,
    },
    {
      title: 'Semantic search',
      telemetryId: 'console_tutorials_semantic_search',
      i18nID: 'xpack.searchHomepage.consoleTutorials.semanticDescription',
      description:
        'Learn semantic search techniques to understand intent and deliver more accurate, relevant results.',
      request: consoleTutorials.semanticSearch,
      duration: 3,
    },
    {
      title: 'ES|QL',
      telemetryId: 'console_tutorials_esql',
      i18nID: 'xpack.searchHomepage.consoleTutorials.esqlDescription',
      description:
        "Learn how to use Elastic's piped query language to simplify data investigations.",
      request: consoleTutorials.esql,
      duration: 4,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="s" direction={'column'} justifyContent="spaceBetween">
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
        <EuiFlexGroup gutterSize="l" wrap justifyContent="flexStart">
          {tutorials.map((tutorial, index) => (
            <EuiFlexItem key={index} grow={false} style={{ minWidth: 300, maxWidth: 300 }}>
              <EuiCard
                paddingSize="none"
                display="plain"
                title={tutorial.title}
                titleSize="xs"
                description={
                  <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center" wrap>
                    <EuiFlexItem grow={false}>
                      <EuiBadge color="hollow" iconType="clock">
                        {tutorial.duration} min
                      </EuiBadge>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      {i18n.translate(tutorial.i18nID, {
                        defaultMessage: tutorial.description,
                      })}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                }
                textAlign="left"
              >
                <TryInConsoleButton
                  request={tutorial.request}
                  application={application}
                  consolePlugin={consolePlugin}
                  sharePlugin={share}
                />
              </EuiCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
