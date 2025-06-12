/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { SearchHit } from '@kbn/es-types';
import { EuiTitle, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { UserStartPrivilegesResponse } from '../../../common';
import { Mappings } from '../../types';
import { AddDocumentsCodeExample } from './add_documents_code_example';
import { DocumentList } from './document_list';

interface IndexDocumentsProps {
  indexName: string;
  documents: SearchHit[];
  mappings?: Mappings;
  userPrivileges?: UserStartPrivilegesResponse;
}

export const IndexDocuments: React.FC<IndexDocumentsProps> = ({
  indexName,
  documents,
  mappings,
  userPrivileges,
}) => {
  const mappingProperties = mappings?.mappings?.properties ?? {};
  const hasDeleteDocumentsPrivilege: boolean = useMemo(() => {
    return userPrivileges?.privileges.canDeleteDocuments ?? false;
  }, [userPrivileges]);

  if (documents.length === 0) {
    return <AddDocumentsCodeExample indexName={indexName} mappingProperties={mappingProperties} />;
  }
  return (
    <>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.searchIndices.indexDetail.data.preview.title"
            defaultMessage="Data preview"
          />
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      <DocumentList
        indexName={indexName}
        docs={documents}
        mappingProperties={mappingProperties}
        hasDeleteDocumentsPrivilege={hasDeleteDocumentsPrivilege}
      />
    </>
  );
};
