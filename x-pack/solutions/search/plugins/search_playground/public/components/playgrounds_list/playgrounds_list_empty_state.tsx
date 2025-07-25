/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiImage,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';

import { PLUGIN_NAME } from '../../../common';
import { docLinks } from '../../../common/doc_links';
import { useAssetBasePath } from '../../hooks/use_asset_base_path';

export interface PlaygroundsListEmptyStateProps {
  onNewPlayground: () => void;
}

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

const DescriptionListColumns = () => {
  return (
    <EuiFlexGrid columns={3} direction="row">
      <DescriptionListColumn
        title={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.abTest.title',
          { defaultMessage: 'A/B test LLMs' }
        )}
        description={i18n.translate(
          'xpack.searchPlayground.playgroundsList.emptyPrompt.listItems.abTest.description',
          { defaultMessage: 'Playground allow you to A/B test different LLMs from model providers' }
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
          { defaultMessage: "Elastic's playground experience is a low-code interface" }
        )}
      />
    </EuiFlexGrid>
  );
};

const PlaygroundsListEmptyStateBody = ({ onNewPlayground }: PlaygroundsListEmptyStateProps) => {
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
              defaultMessage="New Playground"
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

const EmptyStateFooter = () => (
  <EuiFlexGroup gutterSize="s" alignItems="flexStart">
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <span>
          <FormattedMessage
            id="xpack.searchPlayground.playgroundsList.emptyPrompt.footer"
            defaultMessage="Questions on how to get started?"
          />
        </span>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiLink
        data-test-subj="searchPlaygroundsEmptyPromptFooterLink"
        href={docLinks.chatPlayground}
        target="_blank"
        external
      >
        <FormattedMessage
          id="xpack.searchPlayground.playgroundsList.emptyPrompt.footerLink"
          defaultMessage="View the documentation"
        />
      </EuiLink>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const PlaygroundsListEmptyState = (props: PlaygroundsListEmptyStateProps) => {
  const assetBasePath = useAssetBasePath();

  return (
    <KibanaPageTemplate.EmptyPrompt
      color="plain"
      icon={<EuiImage size="xxl" src={`${assetBasePath}/search_lake.svg`} alt="" />}
      title={<h2>{PLUGIN_NAME}</h2>}
      body={<PlaygroundsListEmptyStateBody {...props} />}
      footer={<EmptyStateFooter />}
    />
  );
};
