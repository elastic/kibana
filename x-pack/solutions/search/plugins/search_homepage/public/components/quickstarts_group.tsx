/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { quickstartExamples } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiButton, EuiCard, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const QuickstartsGroup = () => {
  const { application, share, console: consolePlugin } = useKibana().services;
  const [showAll, setShowAll] = React.useState(false);

  const quickstarts = [
    {
      title: 'Search Basics',
      description: 'Learn the basics of creating and searching an index.',
      request: quickstartExamples.basics,
    },
    {
      title: 'Query DSL',
      description: 'Learn how to use the Query DSL to build complex queries.',
      request: quickstartExamples.queryDSL,
    },
    {
      title: 'ES|QL',
      description: 'Learn how to use ES|QL to query your data in a SQL-like syntax.',
      request: quickstartExamples.esql,
    },
    {
      title: 'Aggregations',
      description: 'Learn how to use aggregations to analyze and summarize your data.',
      request: quickstartExamples.aggregations,
    },
    {
      title: 'Semantic Search',
      description:
        'Learn how to use semantic search to find relevant documents using natural language queries.',
      request: quickstartExamples.semanticSearch,
    },
    {
      title: 'Hybrid Search',
      description:
        'Learn how to use hybrid search to combine traditional keyword search with semantic search capabilities.',
      request: quickstartExamples.hybridSearch,
    },
    {
      title: 'Vector Search',
      description:
        'Learn how to use vector search to find similar documents based on vector embeddings.',
      request: quickstartExamples.vectorSearch,
    },
  ];

  return (
    <EuiFlexGroup gutterSize="l" direction={'column'} alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiTitle size="m">
          <span>
            {i18n.translate('xpack.searchHomepage.connectToElasticsearch.quickstartLabel', {
              defaultMessage: 'Quickstart with Elasticsearch API',
            })}
          </span>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="l" wrap>
          {quickstarts.slice(0, showAll ? quickstarts.length : 3).map((quickstart, index) => (
            <EuiFlexItem key={index} grow={false} style={{ minWidth: 300, maxWidth: 300 }}>
              <EuiCard
                paddingSize="l"
                title={quickstart.title}
                description={i18n.translate(
                  `xpack.searchHomepage.connectToElasticsearch.quickstart${quickstart.title
                    .split(' ')
                    .join('')}Description`,
                  {
                    defaultMessage: quickstart.description,
                  }
                )}
              >
                <TryInConsoleButton
                  request={quickstart.request}
                  application={application}
                  consolePlugin={consolePlugin}
                  sharePlugin={share}
                  content="Run Quickstart"
                />
              </EuiCard>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton onClick={() => setShowAll(!showAll)} data-test-subj="showMoreQuickstarts">
          {showAll
            ? i18n.translate('xpack.searchHomepage.connectToElasticsearch.showLess', {
                defaultMessage: 'Show Less',
              })
            : i18n.translate('xpack.searchHomepage.connectToElasticsearch.showMore', {
                defaultMessage: 'Show More',
              })}

          {showAll ? <EuiIcon type="arrowUp" size="m" /> : <EuiIcon type="arrowDown" size="m" />}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
