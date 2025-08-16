/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { quickstartExamples } from '@kbn/search-code-examples';
import { TryInConsoleButton } from '@kbn/try-in-console';
import { EuiCard, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

export const QuickstartsGroup = () => {
  const { application, share, console: consolePlugin } = useKibana().services;

  const quickstarts = [
    {
      title: 'Search Basics',
      i18nID: 'xpack.searchHomepage.connectToElasticsearch.quickstartBasicsDescription',
      description: 'Learn the basics of creating and searching an index.',
      request: quickstartExamples.basics,
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
          {quickstarts.map((quickstart, index) => (
            <EuiFlexItem key={index} grow={false} style={{ minWidth: 300, maxWidth: 300 }}>
              <EuiCard
                paddingSize="l"
                title={quickstart.title}
                description={i18n.translate(quickstart.i18nID, {
                  defaultMessage: quickstart.description,
                })}
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
    </EuiFlexGroup>
  );
};
