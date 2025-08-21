/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { DescriptionListColumns } from './description_list_columns';
import type { PlaygroundsListEmptyStateProps } from './types';

export const PlaygroundsListEmptyStateBody = ({
  onNewPlayground,
}: PlaygroundsListEmptyStateProps) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.searchPlayground.playgroundsList.emptyPrompt.subTitle"
            defaultMessage="Try out RAG applications with your Elasticsearch data in a low-code environment."
          />
        </p>
      </EuiText>
      <EuiFlexItem grow={false}>
        <span>
          <EuiButton
            data-test-subj="newPlaygroundButton"
            fill
            iconType="plusInCircle"
            fullWidth={false}
            onClick={onNewPlayground}
          >
            <FormattedMessage
              id="xpack.searchPlayground.playgroundsList.emptyPrompt.cta.text"
              defaultMessage="New RAG Playground"
            />
          </EuiButton>
        </span>
      </EuiFlexItem>
      <EuiHorizontalRule />
      <EuiFlexItem>
        <DescriptionListColumns />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
