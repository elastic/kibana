/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import type { Sort } from '@kbn/securitysolution-io-ts-list-types';
import styled from '@emotion/styled';
import {
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiIcon,
  EuiScreenReaderLive,
  EuiScreenReaderOnly,
} from '@elastic/eui';

import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
} from '../../../common/components/utility_bar';
import * as i18n from '../../translations';

interface ExceptionsTableUtilityBarProps {
  onRefresh?: () => void;
  totalExceptionLists: number;
  sort?: Sort;
  setSort?: (s: Sort) => void;
  sortFields?: Array<{ field: string; label: string; defaultOrder: 'asc' | 'desc' }>;
}

export const ExceptionsTableUtilityBar: React.FC<ExceptionsTableUtilityBarProps> = ({
  onRefresh,
  totalExceptionLists,
  setSort,
  sort,
  sortFields,
}) => {
  const [sortAnnouncement, setSortAnnouncement] = useState('');
  const selectedSortField = sortFields?.find((sortField) => sortField.field === sort?.field);
  return (
    <UtilityBar border>
      <UtilityBarSection>
        <UtilityBarGroup>
          <UtilityBarText dataTestSubj="showingExceptionLists">
            {i18n.SHOWING_EXCEPTION_LISTS(totalExceptionLists)}
          </UtilityBarText>
        </UtilityBarGroup>
        <UtilityBarGroup>
          <UtilityBarAction
            dataTestSubj="refreshRulesAction"
            iconSide="left"
            iconType="refresh"
            onClick={onRefresh}
          >
            {i18n.REFRESH_EXCEPTIONS_TABLE}
          </UtilityBarAction>
        </UtilityBarGroup>
      </UtilityBarSection>
      <UtilityBarSection>
        <>
          <UtilityBarGroup>
            {sort && (
              <UtilityBarAction
                dataTestSubj="sortExceptions"
                ariaLabel={
                  selectedSortField
                    ? i18n.getSortByAriaLabel(
                        selectedSortField.label,
                        getSortOrderLabel(sort.order)
                      )
                    : undefined
                }
                iconSide="right"
                iconType={sort.order === 'asc' ? 'sortUp' : 'sortDown'}
                popoverPanelPaddingSize={'s'}
                onClick={() => setSortAnnouncement('')}
                popoverContent={() => (
                  <>
                    {/* Must live inside the aria-modal popover panel to be announced while it is open */}
                    <EuiScreenReaderLive>{sortAnnouncement}</EuiScreenReaderLive>
                    <EuiContextMenuPanel
                      items={sortFields?.map((item) => {
                        const isSelectedSortItem = selectedSortField?.field === item.field;
                        let nextSortOrder = item.defaultOrder;
                        if (isSelectedSortItem) {
                          nextSortOrder = sort.order === 'asc' ? 'desc' : 'asc';
                        }
                        return (
                          <EuiContextMenuItem
                            key={item.field}
                            onClick={() => {
                              setSort?.({
                                field: item.field,
                                order: nextSortOrder,
                              });
                              setSortAnnouncement(
                                i18n.getSortChangedAnnouncement(
                                  item.label,
                                  getSortOrderLabel(nextSortOrder)
                                )
                              );
                            }}
                          >
                            <SortMenuItem>
                              {item.label}{' '}
                              {isSelectedSortItem && (
                                <>
                                  <EuiScreenReaderOnly>
                                    <span>
                                      {i18n.getSortMenuItemOrderLabel(
                                        getSortOrderLabel(sort.order)
                                      )}
                                    </span>
                                  </EuiScreenReaderOnly>
                                  <SortIcon type={sort.order === 'asc' ? 'sortUp' : 'sortDown'} />
                                </>
                              )}
                            </SortMenuItem>
                          </EuiContextMenuItem>
                        );
                      })}
                    />
                  </>
                )}
              >
                <SortMenuItem>
                  {i18n.SORT_BY}{' '}
                  {sortFields?.find((sortField) => sortField.field === sort.field)?.label}
                </SortMenuItem>
              </UtilityBarAction>
            )}
          </UtilityBarGroup>
        </>
      </UtilityBarSection>
    </UtilityBar>
  );
};

const getSortOrderLabel = (order: string): string =>
  order === 'asc' ? i18n.SORT_ORDER_ASCENDING : i18n.SORT_ORDER_DESCENDING;

const SortMenuItem = styled('div')`
  display: flex;
  align-items: center;
`;

const SortIcon = styled(EuiIcon)`
  margin-left: 8px;
`;

ExceptionsTableUtilityBar.displayName = 'ExceptionsTableUtilityBar';
