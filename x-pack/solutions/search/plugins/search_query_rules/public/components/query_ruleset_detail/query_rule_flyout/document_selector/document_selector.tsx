/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiPanel } from '@elastic/eui';
import { EditableResult } from '@kbn/search-index-documents';
import React from 'react';
import { resultToFieldFromMappingResponse } from '@kbn/search-index-documents/components/result/result_metadata';
import { useFetchDocument } from '../../../../hooks/use_fetch_document';

interface DocumentSelectorProps {
  initialDocId: string;
  index?: string;
  onDeleteDocument?: () => void;
  onIdSelectorChange?: (id: string) => void;
  onIndexSelectorChange?: (index: string) => void;
  indices?: string[];
  hasIndexSelector?: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  initialDocId = '',
  index = '',
  onDeleteDocument = () => {},
  onIdSelectorChange = () => {},
  onIndexSelectorChange = () => {},
  indices = [],
  hasIndexSelector = true,
}) => {
  const { data, error, isError, isLoading } = useFetchDocument(index, initialDocId);
  const { document, mappings } = data || {};

  return (
    <EditableResult
      initialDocId={initialDocId}
      initialIndex={index}
      leftSideItem={
        <EuiPanel color="transparent" paddingSize="s" aria-label="Drag Handle">
          <EuiIcon type="grab" />
        </EuiPanel>
      }
      data-test-subj="searchQueryRulesQueryRuleFlyoutDocumentCount"
      indices={indices}
      hasIndexSelector={hasIndexSelector}
      fields={document && resultToFieldFromMappingResponse(document, mappings)}
      onIdSelectorChange={onIdSelectorChange}
      onIndexSelectorChange={onIndexSelectorChange}
      onDeleteDocument={onDeleteDocument}
      isLoading={Boolean(index && initialDocId && isLoading)}
      error={isError ? error?.body?.message : undefined}
    />
  );
};
