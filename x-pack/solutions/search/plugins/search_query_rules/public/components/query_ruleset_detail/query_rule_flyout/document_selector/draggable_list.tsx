/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiDragDropContext, EuiDroppable, EuiDraggable, EuiCallOut } from '@elastic/eui';
import type { FieldArrayWithId, FieldError, FieldErrors } from 'react-hook-form';
import type { QueryRulesQueryRuleType } from '@elastic/elasticsearch/lib/api/types';
import type { OnDragEndResponder } from '@hello-pangea/dnd';
import { isFieldError } from '../../../../utils/field_error_utils';
import { QueryRuleEditorForm } from '../../../../../common/types';
import { DocumentSelector } from './document_selector';

interface DraggableListProps {
  actionFields: Array<FieldArrayWithId<QueryRuleEditorForm, 'actions.docs', 'id'>>;
  actionIdsFields?: string[];
  pinType: QueryRulesQueryRuleType;
  isIdRule?: boolean;
  indexNames?: string[];
  dragEndHandle: OnDragEndResponder<string>;
  onDeleteDocument: (index: number) => void;
  onIndexSelectorChange: (index: number, indexName: string) => void;
  onIdSelectorChange: (index: number, id: string) => void;
  errors?: FieldErrors<QueryRuleEditorForm>;
}
export const DraggableList: React.FC<DraggableListProps> = ({
  actionFields,
  actionIdsFields,
  pinType,
  isIdRule = false,
  indexNames = [],
  onDeleteDocument,
  onIndexSelectorChange,
  onIdSelectorChange,
  dragEndHandle,
  errors,
}) => {
  return (
    <EuiDragDropContext onDragEnd={dragEndHandle}>
      <EuiDroppable droppableId="queryRuleDroppable" spacing="m">
        <>
          {actionFields.length === 0 && actionIdsFields?.length === 0 && (
            <EuiCallOut
              title="At least one document is required"
              color="warning"
              size="s"
              iconType="info"
            />
          )}
          {isIdRule && actionIdsFields
            ? actionIdsFields.map((doc, index) => (
                <EuiDraggable
                  usePortal
                  spacing="m"
                  index={index}
                  hasInteractiveChildren={true}
                  draggableId={'queryRuleDocumentDraggable-' + doc + '-' + index}
                  key={doc + '-' + index}
                  isDragDisabled={pinType === 'exclude'}
                  data-test-subj={`queryRuleDocumentDraggable-id-${doc}-${index}`}
                >
                  {() => {
                    const docError = errors?.actions?.docs?.[index];
                    const fieldError = isFieldError(docError) ? docError : undefined;

                    return (
                      <DocumentSelector
                        initialDocId={doc}
                        indexDoc={index}
                        type={pinType}
                        hasIndexSelector={false}
                        onDeleteDocument={() => {
                          onDeleteDocument(index);
                        }}
                        onIdSelectorChange={(id) => {
                          onIdSelectorChange(index, id);
                        }}
                        error={fieldError}
                      />
                    );
                  }}
                </EuiDraggable>
              ))
            : actionFields.map((doc, index) => (
                <EuiDraggable
                  usePortal
                  spacing="m"
                  index={index}
                  hasInteractiveChildren={true}
                  draggableId={'queryRuleDocumentDraggable-' + doc._id + '-' + index}
                  key={doc._id}
                  isDragDisabled={pinType === 'exclude'}
                  data-test-subj={`queryRuleDocumentDraggable-doc-${doc._id}-${index}`}
                >
                  {() => {
                    const docError = errors?.actions?.docs?.[index];
                    const fieldError =
                      docError?.type && docError.message ? (docError as FieldError) : undefined;
                    return (
                      <DocumentSelector
                        initialDocId={doc._id}
                        indexDoc={index}
                        type={pinType}
                        index={doc._index}
                        onDeleteDocument={() => {
                          onDeleteDocument(index);
                        }}
                        onIndexSelectorChange={(indexName) => {
                          onIndexSelectorChange(index, indexName);
                        }}
                        onIdSelectorChange={(id) => {
                          onIdSelectorChange(index, id);
                        }}
                        indices={indexNames}
                        error={fieldError}
                      />
                    );
                  }}
                </EuiDraggable>
              )) || <></>}
        </>
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
