/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiPanel } from '@elastic/eui';
import { useKibana } from '../../hooks/use_kibana';

import { DEFAULT_PAGE_SIZE } from './constants';

export interface RecentDocsActionMessageProps {
  indexName: string;
}

export const RecentDocsActionMessage: React.FC<RecentDocsActionMessageProps> = ({ indexName }) => {
  const {
    services: { share },
  } = useKibana();

  const discoverLocator = share.url.locators.get('DISCOVER_APP_LOCATOR');

  const onClick = async () => {
    await discoverLocator?.navigate({ dataViewSpec: { title: indexName } });
  };

  return (
    <EuiPanel hasBorder={false} hasShadow={false} color="subdued" borderRadius="none">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiIcon type="calendar" />
        </EuiFlexItem>
        <EuiFlexItem>
          <p>
            {i18n.translate('xpack.searchIndices.indexDocuments.recentDocsActionMessage', {
              defaultMessage:
                'You are viewing the {pageSize} most recently ingested documents in this index. To see all documents, view in',
              values: {
                pageSize: DEFAULT_PAGE_SIZE,
              },
            })}{' '}
            <EuiLink onClick={onClick}>
              {i18n.translate('xpack.searchIndices.indexDocuments.recentDocsActionMessageLink', {
                defaultMessage: 'Discover.',
              })}
            </EuiLink>
          </p>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
