/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiCallOut,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../hooks/use_kibana';
import { DEFAULT_DOCUMENT_PAGE_SIZE } from '../../constants';

export interface RecentDocsActionMessageProps {
  indexName: string;
}

export const RecentDocsActionMessage: React.FC<RecentDocsActionMessageProps> = ({ indexName }) => {
  const {
    services: { share, docLinks },
  } = useKibana();
  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const viewInDiscover = async (useESQL: boolean) => {
    await discoverLocator?.navigate({
      dataViewSpec: { title: indexName },
      query: useESQL
        ? { esql: `from ${indexName} | limit ${DEFAULT_DOCUMENT_PAGE_SIZE}` }
        : { query: '', language: 'kql' },
    });
  };
  const CALLOUT_KEY = 'searchIndices.indexDocuments.recentDocsActionMessage';
  const [showCallOut, setShowCallOut] = useState(sessionStorage.getItem(CALLOUT_KEY) !== 'hidden');

  const onDismiss = () => {
    setShowCallOut(false);
    sessionStorage.setItem(CALLOUT_KEY, 'hidden');
  };

  return (
    <>
      {showCallOut && (
        <EuiCallOut
          title={i18n.translate(
            'xpack.searchIndices.indexDocuments.recentDocsActionMessage.title',
            {
              defaultMessage:
                'You are viewing the {pageSize} most recently ingested documents in this index.',
              values: {
                pageSize: DEFAULT_DOCUMENT_PAGE_SIZE,
              },
            }
          )}
          iconType="iInCircle"
          color="primary"
          size="m"
          onDismiss={onDismiss}
        >
          <p>
            <FormattedMessage
              id="xpack.searchIndices.indexDocuments.recentDocsActionMessage.content"
              defaultMessage="To view all your documents or shorten your time to insights by creating aggregations, visualizations, and alerts try out {esqlInfo} (Elasticsearch Query Language)."
              values={{
                esqlInfo: (
                  <EuiLink
                    data-test-subj="searchIndicesRecentDocsActionMessageLinkText"
                    href={docLinks?.links?.query?.queryESQL}
                    target="_blank"
                  >
                    {i18n.translate(
                      'xpack.searchIndices.indexDocuments.recentDocsActionMessage.linkText',
                      { defaultMessage: 'ES|QL' }
                    )}
                  </EuiLink>
                ),
              }}
            />
          </p>
          <EuiFlexGroup direction="row">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                data-test-subj="searchIndicesRecentDocsActionMessageDiscoverButton"
                onClick={() => viewInDiscover(false)}
              >
                {i18n.translate(
                  'xpack.searchIndices.indexDocuments.recentDocsActionMessage.viewInDiscoverButton',
                  {
                    defaultMessage: 'View in Discover',
                  }
                )}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                data-test-subj="searchIndicesRecentDocsActionMessageDiscoverWithEsqlButton"
                onClick={() => viewInDiscover(true)}
              >
                {i18n.translate(
                  'xpack.searchIndices.indexDocuments.recentDocsActionMessage.viewInDiscoverWithEsQlButton',
                  {
                    defaultMessage: 'View in Discover with ES|QL',
                  }
                )}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiCallOut>
      )}
    </>
  );
};
