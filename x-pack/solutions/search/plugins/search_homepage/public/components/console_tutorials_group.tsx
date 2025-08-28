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
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

interface TutorialMetadata {
  title: string;
  telemetryId: string;
  description: string;
  request: string;
  duration: number;
}

export const ConsoleTutorialsGroup = () => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const { euiTheme } = useEuiTheme();

  const tutorials: TutorialMetadata[] = [
    {
      title: i18n.translate('xpack.searchHomepage.consoleTutorials.basicsTitle', {
        defaultMessage: 'Search basics',
      }),
      telemetryId: 'console_tutorials_search_basics',
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
      telemetryId: 'console_tutorials_semantic_search',
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
      telemetryId: 'console_tutorials_esql',
      description: i18n.translate('xpack.searchHomepage.consoleTutorials.esqlDescription', {
        defaultMessage:
          "Learn how to use Elastic's piped query language to simplify data investigations.",
      }),
      request: consoleTutorials.esql,
      duration: 4,
    },
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
                css={{
                  border: euiTheme.border.thin,
                  borderColor: euiTheme.colors.borderBaseFloating,
                  '&:hover': {
                    backgroundColor: 'transparent',
                    borderColor: euiTheme.colors.borderBasePlain,
                  },
                }}
                paddingSize="s"
                display="subdued"
                title={tutorial.title}
                titleSize="xs"
                description={
                  <EuiFlexGroup gutterSize="s" justifyContent="flexStart" alignItems="center" wrap>
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
