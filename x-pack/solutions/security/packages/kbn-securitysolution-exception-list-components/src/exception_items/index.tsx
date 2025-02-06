/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ElementType } from 'react';
import type { FC } from 'react';
import { EuiCommentProps, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import type {
  CommentsArray,
  ExceptionListItemSchema,
  ExceptionListTypeEnum,
} from '@kbn/securitysolution-io-ts-list-types';

import { EmptyViewerState, ExceptionItemCard, Pagination, PaginationProps } from '../..';

import type {
  RuleReferences,
  ExceptionListItemIdentifiers,
  ViewerStatus,
  GetExceptionItemProps,
} from '../types';

interface ExceptionItemsProps {
  lastUpdated: string | number | null;
  viewerStatus: ViewerStatus;
  isReadOnly: boolean;
  emptyViewerTitle?: string;
  emptyViewerBody?: string;
  emptyViewerButtonText?: string;
  exceptions: ExceptionListItemSchema[];
  listType: ExceptionListTypeEnum;
  ruleReferences: RuleReferences;
  pagination: PaginationProps['pagination'];
  editActionLabel?: string;
  deleteActionLabel?: string;
  dataTestSubj?: string;
  securityLinkAnchorComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  formattedDateComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  exceptionsUtilityComponent: ElementType; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  getFormattedComments: (comments: CommentsArray) => EuiCommentProps[]; // This property needs to be removed to avoid the Prop Drilling, once we move all the common components from x-pack/security-solution/common
  onCreateExceptionListItem?: () => void;
  onDeleteException: (arg: ExceptionListItemIdentifiers) => void;
  onEditExceptionItem: (item: ExceptionListItemSchema) => void;
  onPaginationChange: (arg: GetExceptionItemProps) => void;
  showValueListModal: ElementType;
}

const ExceptionItemsComponent: FC<ExceptionItemsProps> = ({
  lastUpdated,
  viewerStatus,
  isReadOnly,
  exceptions,
  listType,
  ruleReferences,
  emptyViewerTitle,
  emptyViewerBody,
  emptyViewerButtonText,
  pagination,
  dataTestSubj,
  editActionLabel,
  deleteActionLabel,
  securityLinkAnchorComponent,
  exceptionsUtilityComponent,
  formattedDateComponent,
  getFormattedComments,
  onPaginationChange,
  onDeleteException,
  onEditExceptionItem,
  onCreateExceptionListItem,
  showValueListModal,
}) => {
  const ExceptionsUtility = exceptionsUtilityComponent;
  if (!exceptions.length || viewerStatus)
    return (
      <EmptyViewerState
        isReadOnly={isReadOnly}
        title={emptyViewerTitle}
        viewerStatus={viewerStatus}
        buttonText={emptyViewerButtonText}
        body={emptyViewerBody}
        onEmptyButtonStateClick={onCreateExceptionListItem}
      />
    );
  const ShowValueListModal = showValueListModal;
  return (
    <>
      <ExceptionsUtility pagination={pagination} lastUpdated={lastUpdated} />
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            data-test-subj={`${dataTestSubj || ''}exceptionsContainer`}
            direction="column"
            gutterSize="m"
          >
            {exceptions.map((exception) => (
              <EuiFlexItem
                data-test-subj={`${dataTestSubj || ''}exceptionItemContainer`}
                grow={false}
                key={exception.id}
              >
                <ExceptionItemCard
                  key={`${exception.id}exceptionItemCardKey`}
                  dataTestSubj={`${dataTestSubj || ''}exceptionItemCard`}
                  disableActions={isReadOnly}
                  exceptionItem={exception}
                  listType={listType}
                  ruleReferences={
                    Object.keys(ruleReferences).length && ruleReferences[exception.list_id]
                      ? ruleReferences[exception.list_id].referenced_rules
                      : []
                  }
                  editActionLabel={editActionLabel}
                  deleteActionLabel={deleteActionLabel}
                  onDeleteException={onDeleteException}
                  onEditException={onEditExceptionItem}
                  securityLinkAnchorComponent={securityLinkAnchorComponent}
                  formattedDateComponent={formattedDateComponent}
                  getFormattedComments={getFormattedComments}
                  showValueListModal={ShowValueListModal}
                />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
      <Pagination
        dataTestSubj={`${dataTestSubj || ''}pagination`}
        pagination={pagination}
        onPaginationChange={onPaginationChange}
      />
    </>
  );
};

ExceptionItemsComponent.displayName = 'ExceptionItemsComponent';

export const ExceptionItems = React.memo(ExceptionItemsComponent);

ExceptionItems.displayName = 'ExceptionsItems';
