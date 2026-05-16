/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { Sort } from '@kbn/securitysolution-io-ts-list-types';
import { css } from '@emotion/react';
import { EuiContextMenuPanel, EuiContextMenuItem, EuiIcon } from '@elastic/eui';

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
                iconSide="right"
                iconType={sort.order === 'asc' ? 'sortUp' : 'sortDown'}
                popoverPanelPaddingSize={'s'}
                popoverContent={() => (
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
                          onClick={() =>
                            setSort?.({
                              field: item.field,
                              order: nextSortOrder,
                            })
                          }
                        >
                          <div css={sortMenuItemStyles}>
                            {item.label}{' '}
                            {selectedSortField?.field === item.field && (
                              <EuiIcon
                                css={sortIconStyles}
                                type={sort.order === 'asc' ? 'sortUp' : 'sortDown'}
                                aria-hidden={true}
                              />
                            )}
                          </div>
                        </EuiContextMenuItem>
                      );
                    })}
                  />
                )}
              >
                <div css={sortMenuItemStyles}>
                  {i18n.SORT_BY}{' '}
                  {sortFields?.find((sortField) => sortField.field === sort.field)?.label}
                </div>
              </UtilityBarAction>
            )}
          </UtilityBarGroup>
        </>
      </UtilityBarSection>
    </UtilityBar>
  );
};

const sortMenuItemStyles = css`
  display: flex;
  align-items: center;
`;

const sortIconStyles = css`
  margin-left: 8px;
`;

ExceptionsTableUtilityBar.displayName = 'ExceptionsTableUtilityBar';
