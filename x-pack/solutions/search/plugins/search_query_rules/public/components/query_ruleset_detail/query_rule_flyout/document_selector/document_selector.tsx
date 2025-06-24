/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiNotificationBadge, EuiPanel } from '@elastic/eui';
import { EditableResult } from '@kbn/search-index-documents';
import React from 'react';
import { resultToFieldFromMappingResponse } from '@kbn/search-index-documents/components/result/result_metadata';
import { useFetchDocument } from '../../../../hooks/use_fetch_document';

interface DocumentSelectorProps {
  initialDocId: string;
  index?: string;
  indexDoc?: number;
  type?: 'exclude' | 'pinned';
  onDeleteDocument?: () => void;
  onIdSelectorChange?: (id: string) => void;
  onIndexSelectorChange?: (index: string) => void;
  indices?: string[];
  hasIndexSelector?: boolean;
}

export const DocumentSelector: React.FC<DocumentSelectorProps> = ({
  initialDocId = '',
  index = '',
  indexDoc = undefined,
  type = undefined,
  onDeleteDocument = () => {},
  onIdSelectorChange = () => {},
  onIndexSelectorChange = () => {},
  indices = [],
  hasIndexSelector = true,
}) => {
  const { data, error, isError, isLoading } = useFetchDocument(index, initialDocId);
  const { document, mappings } = data || {};
  // Otherwise it will show loading until first document is fetched
  const showLoading = Boolean(isLoading && index && initialDocId);

  return (
    <EditableResult
      initialDocId={initialDocId}
      initialIndex={index}
      leftSideItem={
        <>
          {type === 'pinned' && (
            <EuiPanel color="transparent" paddingSize="s" aria-label="Drag Handle">
              <EuiFlexGroup alignItems="center" gutterSize="s" direction="row" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiIcon type="grab" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiNotificationBadge color="subdued">{(indexDoc ?? 0) + 1}</EuiNotificationBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          )}
        </>
      }
      data-test-subj="searchQueryRulesQueryRuleFlyoutDocumentCount"
      indices={indices}
      hasIndexSelector={hasIndexSelector}
      fields={document && resultToFieldFromMappingResponse(document, mappings)}
      onIdSelectorChange={onIdSelectorChange}
      onIndexSelectorChange={onIndexSelectorChange}
      onDeleteDocument={onDeleteDocument}
      isLoading={showLoading}
      error={isError ? error?.body?.message : undefined}
    />
  );
};
