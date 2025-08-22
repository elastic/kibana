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
import { useKibana } from '../hooks/use_kibana';

export const ConsoleTutorialsGroup = () => {
  const { application, share, console: consolePlugin } = useKibana().services;

  const tutorials = [
    {
      title: 'Search Basics',
      telemetryId: 'console_tutorials_search_basics',
      i18nID: 'xpack.searchHomepage.consoleTutorials.basicsDescription',
      description: 'Learn the basics of creating and searching an index.',
      request: consoleTutorials.basics,
    },
    {
      title: 'Semantic Search',
      telemetryId: 'console_tutorials_semantic_search',
      i18nID: 'xpack.searchHomepage.consoleTutorials.semanticDescription',
      description: "Go beyond keyword matching to understand the user's intent.",
      request: consoleTutorials.semanticSearch,
    },
    {
      title: 'ES|QL',
      telemetryId: 'console_tutorials_esql',
      i18nID: 'xpack.searchHomepage.consoleTutorials.esqlDescription',
      description:
        "Leverage the power of Elastic's piped query language for intuitive query building.",
      request: consoleTutorials.esql,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="l" direction={'column'} alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiTitle size="m">
          <span>
            {i18n.translate('xpack.searchHomepage.consoleTutorials.label', {
              defaultMessage: 'Try search quickly in code',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" wrap>
          {tutorials.map((tutorial, index) => (
            <EuiFlexItem key={index} grow={false} style={{ minWidth: 300, maxWidth: 300 }}>
              <EuiCard
                paddingSize="l"
                title={tutorial.title}
                description={i18n.translate(tutorial.i18nID, {
                  defaultMessage: tutorial.description,
                })}
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
