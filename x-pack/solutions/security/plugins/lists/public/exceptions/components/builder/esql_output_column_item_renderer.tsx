/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from '@emotion/styled';
import type {
  BuilderEntry,
  ExceptionsBuilderExceptionItem,
} from '@kbn/securitysolution-list-utils';
import { getUpdatedEntriesOnDelete } from '@kbn/securitysolution-list-utils';

import { BuilderAndBadgeComponent } from './and_badge';
import { BuilderEntryDeleteButtonComponent } from './entry_delete_button';
import { BuilderEsqlOutputColumnEntryItem } from './entry_esql_output_column';
import type { EntryFieldError } from './reducer';

const MyOverflowContainer = styled(EuiFlexItem)`
  overflow: hidden;
  width: 100%;
`;

interface BuilderEsqlOutputColumnExceptionItemProps {
  andLogicIncluded: boolean;
  exceptionItem: ExceptionsBuilderExceptionItem;
  exceptionItemIndex: number;
  isDisabled?: boolean;
  isOnlyItem: boolean;
  onChangeExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  onDeleteExceptionItem: (item: ExceptionsBuilderExceptionItem, index: number) => void;
  setErrorsExist: (error: EntryFieldError) => void;
}

/** An exception item that applies to the ES|QL output columns: its entries are typed by hand, and there are no nested entries. */
export const BuilderEsqlOutputColumnExceptionItem =
  React.memo<BuilderEsqlOutputColumnExceptionItemProps>(
    ({
      andLogicIncluded,
      exceptionItem,
      exceptionItemIndex,
      isDisabled = false,
      isOnlyItem,
      onChangeExceptionItem,
      onDeleteExceptionItem,
      setErrorsExist,
    }) => {
      const handleEntryChange = useCallback(
        (entry: BuilderEntry, entryIndex: number): void => {
          onChangeExceptionItem(
            {
              ...exceptionItem,
              entries: [
                ...exceptionItem.entries.slice(0, entryIndex),
                { ...entry },
                ...exceptionItem.entries.slice(entryIndex + 1),
              ],
            },
            exceptionItemIndex
          );
        },
        [onChangeExceptionItem, exceptionItem, exceptionItemIndex]
      );

      const handleDeleteEntry = useCallback(
        (entryIndex: number, parentIndex: number | null): void => {
          onDeleteExceptionItem(
            getUpdatedEntriesOnDelete(exceptionItem, entryIndex, parentIndex),
            exceptionItemIndex
          );
        },
        [exceptionItem, onDeleteExceptionItem, exceptionItemIndex]
      );

      return (
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="s" data-test-subj="exceptionEntriesContainer">
            {andLogicIncluded && (
              <BuilderAndBadgeComponent
                entriesLength={exceptionItem.entries.length}
                exceptionItemIndex={exceptionItemIndex}
              />
            )}
            <MyOverflowContainer grow={6}>
              <EuiFlexGroup gutterSize="s" direction="column">
                {exceptionItem.entries.map((entry, index) => (
                  <EuiFlexItem key={('id' in entry && entry.id) || `${index}`} grow={1}>
                    <EuiFlexGroup gutterSize="xs" direction="row">
                      <MyOverflowContainer grow={1}>
                        <BuilderEsqlOutputColumnEntryItem
                          entry={entry}
                          entryIndex={index}
                          exceptionItemIndex={exceptionItemIndex}
                          isDisabled={isDisabled}
                          onChange={handleEntryChange}
                          setErrorsExist={setErrorsExist}
                          showLabel={exceptionItemIndex === 0 && index === 0}
                        />
                      </MyOverflowContainer>
                      <BuilderEntryDeleteButtonComponent
                        entries={exceptionItem.entries}
                        entryIndex={index}
                        exceptionItemIndex={exceptionItemIndex}
                        isOnlyItem={isOnlyItem}
                        nestedParentIndex={null}
                        onDelete={handleDeleteEntry}
                      />
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </MyOverflowContainer>
          </EuiFlexGroup>
        </EuiFlexItem>
      );
    }
  );

BuilderEsqlOutputColumnExceptionItem.displayName = 'BuilderEsqlOutputColumnExceptionItem';
