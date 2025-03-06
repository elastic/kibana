/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import styled from 'styled-components';
import type { DataViewBase } from '@kbn/es-query';
import { ListItemComponent } from './list_item';
import { AndOrBadge } from '../and_or_badge';
import { LogicButtons } from './logic_buttons';
import type { ThreatMapEntries } from './types';
import { createAndNewEntryItem, createOrNewEntryItem } from './helpers';

const MyInvisibleAndBadge = styled(EuiFlexItem)`
  visibility: hidden;
`;

const MyAndBadge = styled(AndOrBadge)`
  & > .euiFlexItem {
    margin: 0;
  }
`;

const MyButtonsContainer = styled(EuiFlexItem)`
  margin: 16px 0;
`;

interface ThreatMatchComponentProps {
  mappingEntries: ThreatMapEntries[];
  indexPatterns: DataViewBase;
  threatIndexPatterns: DataViewBase;
  'id-aria'?: string;
  'data-test-subj'?: string;
  onMappingEntriesChange: (newValue: ThreatMapEntries[]) => void;
}

export const ThreatMatchComponent = ({
  mappingEntries,
  indexPatterns,
  threatIndexPatterns,
  'id-aria': idAria,
  'data-test-subj': dataTestSubj,
  onMappingEntriesChange,
}: ThreatMatchComponentProps) => {
  const handleEntryItemChange = useCallback(
    (item: ThreatMapEntries, index: number): void => {
      const updatedEntries = mappingEntries.slice();

      updatedEntries.splice(index, 1, item);

      onMappingEntriesChange(updatedEntries);
    },
    [mappingEntries, onMappingEntriesChange]
  );

  const handleDeleteEntryItem = useCallback(
    (item: ThreatMapEntries, index: number): void => {
      if (item.entries.length === 0) {
        const updatedEntries = mappingEntries.slice();

        updatedEntries.splice(index, 1);

        onMappingEntriesChange(updatedEntries);
      } else {
        handleEntryItemChange(item, index);
      }
    },
    [mappingEntries, onMappingEntriesChange, handleEntryItemChange]
  );

  const handleOrClick = useCallback((): void => {
    // There is a case where there are numerous list items, all with
    // empty `entries` array.

    onMappingEntriesChange([...mappingEntries, createOrNewEntryItem()]);
  }, [mappingEntries, onMappingEntriesChange]);

  const handleAndClick = useCallback((): void => {
    const lastEntry = mappingEntries.at(-1);

    if (!lastEntry) {
      onMappingEntriesChange([createOrNewEntryItem()]);
      return;
    }

    const { entries: innerEntries } = lastEntry;
    const updatedEntry: ThreatMapEntries = {
      ...lastEntry,
      entries: [...innerEntries, createAndNewEntryItem()],
    };

    onMappingEntriesChange([...mappingEntries.slice(0, -1), updatedEntry]);
  }, [mappingEntries, onMappingEntriesChange]);

  const andLogicIncluded = useMemo(
    () => mappingEntries.some(({ entries }) => entries.length > 1),
    [mappingEntries]
  );

  return (
    <EuiFlexGroup gutterSize="s" direction="column" id-aria={idAria} data-test-subj={dataTestSubj}>
      {mappingEntries.map((entryListItem, index) => {
        const key = (entryListItem as typeof entryListItem & { id?: string }).id ?? `${index}`;
        return (
          <EuiFlexItem grow={1} key={key}>
            <EuiFlexGroup gutterSize="s" direction="column">
              {index !== 0 &&
                (andLogicIncluded ? (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="none" direction="row">
                      <MyInvisibleAndBadge grow={false}>
                        <MyAndBadge includeAntennas type="and" />
                      </MyInvisibleAndBadge>
                      <EuiFlexItem grow={false}>
                        <MyAndBadge type="or" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                ) : (
                  <EuiFlexItem grow={false}>
                    <MyAndBadge type="or" />
                  </EuiFlexItem>
                ))}
              <EuiFlexItem grow={false}>
                <ListItemComponent
                  key={key}
                  listItem={entryListItem}
                  indexPattern={indexPatterns}
                  threatIndexPatterns={threatIndexPatterns}
                  listItemIndex={index}
                  andLogicIncluded={andLogicIncluded}
                  isOnlyItem={mappingEntries.length === 1}
                  onDeleteEntryItem={handleDeleteEntryItem}
                  onChangeEntryItem={handleEntryItemChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}

      <MyButtonsContainer data-test-subj="andOrOperatorButtons">
        <EuiFlexGroup gutterSize="s">
          {andLogicIncluded && (
            <MyInvisibleAndBadge grow={false}>
              <AndOrBadge includeAntennas type="and" />
            </MyInvisibleAndBadge>
          )}
          <EuiFlexItem grow={1}>
            <LogicButtons
              isOrDisabled={false}
              isAndDisabled={false}
              onOrClicked={handleOrClick}
              onAndClicked={handleAndClick}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </MyButtonsContainer>
    </EuiFlexGroup>
  );
};

ThreatMatchComponent.displayName = 'ThreatMatch';
