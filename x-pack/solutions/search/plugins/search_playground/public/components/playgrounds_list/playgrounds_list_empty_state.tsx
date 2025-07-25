/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiText,
} from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export interface PlaygroundsListEmptyStateProps {
  onNewPlayground: () => void;
}

const PlaygroundListItems = [
  {
    title: i18n.translate(
      'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.abTest.title',
      { defaultMessage: 'A/B test LLMs' }
    ),
    description: i18n.translate(
      'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.abTest.description',
      { defaultMessage: 'Playground allow you to A/B test different LLMs from model providers' }
    ),
  },
  {
    title: i18n.translate(
      'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.queryRetrievers.title',
      { defaultMessage: 'Experiment with query retrievers' }
    ),
    description: i18n.translate(
      'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.queryRetrievers.description',
      {
        defaultMessage:
          "We're helping you simplify query construction with newly introduced query retrievers",
      }
    ),
  },
  {
    title: i18n.translate(
      'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.lowCode.title',
      { defaultMessage: 'Low-code interaction' }
    ),
    description: i18n.translate(
      'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.lowCode.description',
      { defaultMessage: "Elastic's playground experience is a low-code interface" }
    ),
  },
];

const PlaygroundsListEmptyStateBody = ({ onNewPlayground }: PlaygroundsListEmptyStateProps) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="l">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.searchPlayground.playgroundsList.emptyPrompt.subTitle"
            defaultMessage="Experiment with RAG applications with Elasticsearch in minutes"
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
              defaultMessage="New Playground"
            />
          </EuiButton>
        </span>
      </EuiFlexItem>
      <EuiDescriptionList listItems={PlaygroundListItems} rowGutterSize="m" />
    </EuiFlexGroup>
  );
};

export const PlaygroundsListEmptyState = (props: PlaygroundsListEmptyStateProps) => {
  const assetBasePath = useAssetBasePath();
  return (
    <KibanaPageTemplate.EmptyPrompt
      alignment="center"
      icon={
        <EuiImage
          size="fullWidth"
          src={`${assetBasePath}/placeholder_playground_hero.png`}
          alt=""
        />
      }
      title={
        <h2>
          <FormattedMessage
            id="xpack.searchPlayground.playgroundsList.emptyPrompt.title"
            defaultMessage="Playground"
          />
        </h2>
      }
      layout="horizontal"
      color="plain"
      body={<PlaygroundsListEmptyStateBody {...props} />}
    />
  );
};
