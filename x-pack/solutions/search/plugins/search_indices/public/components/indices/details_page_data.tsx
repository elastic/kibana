/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiHorizontalRule,
} from '@elastic/eui';

import type { UserStartPrivilegesResponse } from '../../../common';
import { useIndexMapping } from '../../hooks/api/use_index_mappings';
import { IndexDocuments as IndexDocumentsType } from '../../hooks/api/use_document_search';
import { IndexDocuments } from '../index_documents/index_documents';
import { IndexSearchExample } from './details_search_example';

interface IndexDetailsDataProps {
  indexName: string;
  indexDocuments?: IndexDocumentsType;
  isInitialLoading: boolean;
  navigateToPlayground: () => void;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const IndexDetailsData = ({
  indexName,
  indexDocuments,
  isInitialLoading,
  navigateToPlayground,
  userPrivileges,
}: IndexDetailsDataProps) => {
  const { data: mappingData } = useIndexMapping(indexName);
  const documents = indexDocuments?.results?.data ?? [];

  if (isInitialLoading) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
        <EuiSpacer />
        <EuiProgress size="xs" color="primary" />
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="none">
      <EuiSpacer />
      <EuiFlexGroup direction="column" gutterSize="s">
        {documents.length > 0 && (
          <>
            <EuiFlexItem>
              <IndexSearchExample
                indexName={indexName}
                documents={documents}
                mappings={mappingData}
                navigateToPlayground={navigateToPlayground}
              />
            </EuiFlexItem>
            <EuiHorizontalRule />
          </>
        )}
        <EuiFlexItem>
          <IndexDocuments
            indexName={indexName}
            documents={documents}
            mappings={mappingData}
            userPrivileges={userPrivileges}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
