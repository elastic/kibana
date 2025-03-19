/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MappingProperty, SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { Result, resultMetaData, resultToField } from '@kbn/search-index-documents';

import { EuiSpacer } from '@elastic/eui';

import { reorderFieldsInImportance } from '@kbn/search-index-documents';
import { RecentDocsActionMessage } from './recent_docs_action_message';
import { useDeleteDocument } from '../../hooks/api/use_delete_document';

export interface DocumentListProps {
  indexName: string;
  docs: SearchHit[];
  mappingProperties: Record<string, MappingProperty>;
  hasDeleteDocumentsPrivilege: boolean;
}

export const DocumentList = ({
  indexName,
  docs,
  mappingProperties,
  hasDeleteDocumentsPrivilege,
}: DocumentListProps) => {
  const { mutate } = useDeleteDocument(indexName);

  return (
    <>
      <RecentDocsActionMessage indexName={indexName} />
      <EuiSpacer size="m" />
      {docs.map((doc) => {
        return (
          <React.Fragment key={doc._id}>
            <Result
              fields={reorderFieldsInImportance(resultToField(doc, mappingProperties))}
              metaData={resultMetaData(doc)}
              onDocumentDelete={() => {
                mutate({ id: doc._id! });
              }}
              compactCard={false}
              hasDeleteDocumentsPrivilege={hasDeleteDocumentsPrivilege}
            />
            <EuiSpacer size="s" />
          </React.Fragment>
        );
      })}
    </>
  );
};
