/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGrid, EuiFlexGroup, EuiFlexItem, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const DescriptionListColumn = ({
  title,
  description,
}: {
  title: React.ReactNode;
  description: React.ReactNode;
}) => {
  return (
    <EuiFlexItem>
      <EuiFlexGroup responsive={false} gutterSize="xs" direction="column" alignItems="flexStart">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs" css={{ textAlign: 'left' }}>
            <h5>{title}</h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s" color="subdued" textAlign="left">
            <p>{description}</p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

export const DescriptionListColumns = () => {
  return (
    <EuiFlexGrid columns={3} direction="row">
      <DescriptionListColumn
        title={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.abTest.title',
          { defaultMessage: 'A/B test LLMs' }
        )}
        description={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.abTest.description',
          {
            defaultMessage: 'Playground allows you to A/B test different LLMs from model providers',
          }
        )}
      />
      <DescriptionListColumn
        title={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.queryRetrievers.title',
          { defaultMessage: 'Experiment with query retrievers' }
        )}
        description={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.queryRetrievers.description',
          {
            defaultMessage:
              "We're helping you simplify query construction with newly introduced query retrievers",
          }
        )}
      />
      <DescriptionListColumn
        title={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.lowCode.title',
          { defaultMessage: 'Low-code interaction' }
        )}
        description={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.lowCode.description',
          { defaultMessage: "Elastic's Playground experience is a low-code interface" }
        )}
      />
    </EuiFlexGrid>
  );
};
