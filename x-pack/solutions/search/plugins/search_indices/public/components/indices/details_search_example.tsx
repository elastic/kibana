/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { SearchHit } from '@kbn/es-types';

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../common/doc_links';
import { useKibana } from '../../hooks/use_kibana';
import { Mappings } from '../../types';

import { CodeBox } from '../code_box/code_box';

export interface IndexSearchExampleProps {
  indexName: string;
  documents: SearchHit[];
  mappings?: Mappings;
}

export const IndexSearchExample = ({ indexName }: IndexSearchExampleProps) => {
  const { share } = useKibana().services;
  const navigateToPlayground = useCallback(async () => {
    const playgroundLocator = share.url.locators.get('PLAYGROUND_LOCATOR_ID');
    if (playgroundLocator && indexName) {
      await playgroundLocator.navigate({ 'default-index': indexName });
    }
  }, [share, indexName]);
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.searchIndices.indexDetail.searchExample.title"
              defaultMessage="Search your data"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.searchIndices.indexDetail.searchExample.description"
              defaultMessage="A search query is a request for information about data in Elasticsearch indices or datastreams."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiLink href={docLinks.searchAPIReference} data-test-subj="" target="_blank">
          <FormattedMessage
            id="xpack.searchIndices.indexDetail.searchExample.apiReferenceLink"
            defaultMessage="Explore the Search API"
          />
        </EuiLink>
        <EuiHorizontalRule />
        <EuiTitle size="xxs">
          <h5>
            <FormattedMessage
              id="xpack.searchIndices.indexDetail.searchExample.playground.title"
              defaultMessage="Playground"
            />
          </h5>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.searchIndices.indexDetail.searchExample.playground.description"
              defaultMessage="Try several query options and preview the results."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <div>
          <EuiButton
            data-test-subj="search-in-playground-btn"
            onClick={navigateToPlayground}
            fullWidth={false}
          >
            <FormattedMessage
              id="xpack.searchIndices.indexDetail.searchExample.playground.cta"
              defaultMessage="Search in Playground"
            />
          </EuiButton>
        </div>
      </EuiFlexItem>
      <EuiFlexItem>
        <CodeBox
          data-test-subj="search-example-codebox"
          options={[
            {
              language: {
                id: 'python',
                title: 'Python',
                iconType: 'python.svg',
              },
              code: 'TODO',
            },
            {
              language: {
                id: 'javascript',
                title: 'Javascript',
                iconType: 'javascript.svg',
              },
              code: 'TODO',
            },
          ]}
          consoleCode={`POST /${indexName}/_search`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
