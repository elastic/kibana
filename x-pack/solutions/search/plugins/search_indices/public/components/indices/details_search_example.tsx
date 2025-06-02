/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
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
import { Mappings } from '../../types';

import { CodeBox } from '../code_box/code_box';
import { useSearchCodeExamples } from '../../hooks/use_search_code_examples';

export interface IndexSearchExampleProps {
  indexName: string;
  documents: SearchHit[];
  mappings?: Mappings;
  navigateToPlayground: () => void;
}

export const IndexSearchExample = ({
  indexName,
  mappings,
  navigateToPlayground,
}: IndexSearchExampleProps) => {
  const codeExamples = useSearchCodeExamples(indexName, mappings);

  return (
    <EuiFlexGroup>
      <EuiFlexItem grow={2}>
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
              defaultMessage="A search query finds relevant documents in your Elasticsearch data using exact matches, patterns, or similarity scoring."
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
              defaultMessage="Try out different queries and preview the results."
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
      <EuiFlexItem grow={3}>
        <CodeBox
          data-test-subj="search-example-codebox"
          options={codeExamples.options}
          consoleCode={codeExamples.console}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
