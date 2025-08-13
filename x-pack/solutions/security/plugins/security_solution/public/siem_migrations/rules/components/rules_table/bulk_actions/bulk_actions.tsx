/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

import { EuiContextMenu, type EuiContextMenuPanelDescriptor, type Pagination } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import {
  UtilityBar,
  UtilityBarAction,
  UtilityBarGroup,
  UtilityBarSection,
  UtilityBarText,
  UtilityBarSpacer,
} from '../../../../../common/components/utility_bar';

export interface BulkActionsProps {
  isTableLoading: boolean;
  numberOfFailedRules: number;
  numberOfTranslatedRules: number;
  numberOfSelectedRules: number;
  numberOfTotalRules: number;
  numberOfRulesWithMissingIndex: number;
  setMissingIndexPatternFlyoutOpen?: () => void;
  installTranslatedRule?: () => void;
  installSelectedRule?: () => void;
  reprocessFailedRules?: () => void;
  isSelectAllSelected: boolean;
  userSelectedAll: (userSelected: boolean) => void;
  selectedNumberOfMissingIndexPattern: number;
  selectedNumberOfInstallTranslatedRules: number;
  selectedNumberOfReprocessFailedRules: number;
  pagination: Pagination;
}

/**
 * Collection of buttons to perform bulk actions on migration rules within the SIEM Rules Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = React.memo(
  ({
    isTableLoading,
    numberOfFailedRules,
    numberOfTranslatedRules,
    numberOfSelectedRules,
    numberOfTotalRules,
    numberOfRulesWithMissingIndex,
    installTranslatedRule,
    setMissingIndexPatternFlyoutOpen,
    installSelectedRule,
    reprocessFailedRules,
    isSelectAllSelected,
    userSelectedAll,
    selectedNumberOfMissingIndexPattern,
    selectedNumberOfInstallTranslatedRules,
    // selectedNumberOfReprocessFailedRules,
    pagination = { pageSize: 0, pageIndex: 0 },
  }) => {
    const disableInstallTranslatedRulesButton = isTableLoading || !numberOfTranslatedRules;
    const disableUpdateIndexPatternButton = isTableLoading || !numberOfRulesWithMissingIndex;
    const showInstallSelectedRulesButton = numberOfSelectedRules > 0;
    const showRetryFailedRulesButton = numberOfFailedRules > 0;
    const showSelectAllButton =
      numberOfTotalRules > 0 && !isSelectAllSelected && numberOfSelectedRules > 0;
    const totalSelected = isSelectAllSelected ? numberOfTotalRules : numberOfSelectedRules;

    const bulkActionItems: (closePopover: () => void) => EuiContextMenuPanelDescriptor[] =
      useCallback(
        (closePopover: () => void) => {
          const items: EuiContextMenuPanelDescriptor['items'] = [];

          const missingIndexPatternItems = [
            {
              id: 'updateIndexPatternOfSelectedRules',
              name: i18n.UPDATE_INDEX_PATTERN_ALL_RULES_WITH_MISSING_INDEX_PATTERN(
                numberOfRulesWithMissingIndex
              ),
              onClick: () => {
                setMissingIndexPatternFlyoutOpen?.();
                closePopover();
              },
            },
            {
              id: 'updateIndexPatternOfSelectedRules',
              name: i18n.UPDATE_INDEX_PATTERN_OF_SELECTED_RULES(
                selectedNumberOfMissingIndexPattern
              ),
              onClick: () => {
                setMissingIndexPatternFlyoutOpen?.();
                closePopover();
              },
            },
          ];

          const installTranslatedRulesItems = [
            {
              id: 'installTranslatedRules',
              name: i18n.INSTALL_TRANSLATED_RULES(numberOfTranslatedRules),
              onClick: () => {
                installTranslatedRule?.();
                closePopover();
              },
            },
            {
              id: 'installTranslatedRules',
              name: i18n.INSTALL_SELECTED_RULES(selectedNumberOfInstallTranslatedRules),
              onClick: () => {
                installSelectedRule?.();
                closePopover();
              },
            },
          ];

          const reprocessFailedRulesItems = [
            {
              id: 'reprocessFailedRules',
              name: i18n.REPROCESS_FAILED_RULES(numberOfFailedRules),
              onClick: () => {
                reprocessFailedRules?.();
                closePopover();
              },
            },
          ];

          return [
            {
              id: 0,
              title: 'Bulk actions',
              items: [
                {
                  id: 'updateIndexPatternOfSelectedRules',
                  name: i18n.UPDATE_INDEX_PATTERN,
                  panel: 1,
                  disabled: disableInstallTranslatedRulesButton,
                  'data-test-subj': 'updateIndexPatternOfSelectedRulesButton',
                },
                {
                  id: 'installTranslatedRules',
                  name: i18n.INSTALL_TRANSLATED_RULES(numberOfTranslatedRules),
                  panel: 2,
                  disabled: disableInstallTranslatedRulesButton,
                  'data-test-subj': 'installTranslatedRulesButton',
                },
                {
                  id: 'reprocessFailedRules',
                  name: i18n.REPROCESS_FAILED_RULES_ACTION_LABEL,
                  icon: undefined,
                  panel: 3,
                  disabled: isTableLoading,
                  'data-test-subj': 'reprocessFailedRulesButton',
                },
              ],
            },
            {
              id: 1,
              title: 'Update missing index pattern',
              items: missingIndexPatternItems,
              disabled: disableUpdateIndexPatternButton,
            },
            {
              id: 2,
              title: 'Install translated rules',
              items: installTranslatedRulesItems,
              disabled: disableInstallTranslatedRulesButton,
            },
            {
              id: 3,
              title: 'Reprocess failed rules',
              items: reprocessFailedRulesItems,
              disabled: !showRetryFailedRulesButton,
            },
          ];
        },
        [
          numberOfRulesWithMissingIndex,
          numberOfTranslatedRules,
          showRetryFailedRulesButton,
          numberOfFailedRules,
          disableInstallTranslatedRulesButton,
          isTableLoading,
          setMissingIndexPatternFlyoutOpen,
          installTranslatedRule,
          installSelectedRule,
          reprocessFailedRules,
          selectedNumberOfMissingIndexPattern,
          selectedNumberOfInstallTranslatedRules,
          // selectedNumberOfReprocessFailedRules,
          disableUpdateIndexPatternButton,
        ]
      );

    const handleGetBulkItemsPopoverContent = useCallback(
      (closePopover: () => void): JSX.Element | null => {
        return <EuiContextMenu initialPanelId={0} panels={bulkActionItems(closePopover)} />;
      },
      [bulkActionItems]
    );
    return (
      <>
        <UtilityBar>
          <UtilityBarSection>
            <UtilityBarGroup>
              <UtilityBarText>
                <FormattedMessage
                  id="xpack.securitySolution.siemMigrations.rules.table.showingPageOfTotalLabel"
                  defaultMessage="Showing {pageIndex} - {pageSize} of {total, plural, one {# rule} other {# rules}} {pipe} Selected {selectedRulesAmount, plural, one {# rule} other {# rules}}"
                  values={{
                    pageIndex: pagination.pageIndex * pagination.pageSize + 1,
                    pageSize: (pagination.pageIndex + 1) * pagination.pageSize,
                    total: numberOfTotalRules,
                    selectedRulesAmount: numberOfSelectedRules || 0,
                    pipe: '\u2000|\u2000',
                  }}
                />
              </UtilityBarText>
            </UtilityBarGroup>
            <UtilityBarSpacer />
            <UtilityBarGroup>
              <UtilityBarAction
                disabled={isTableLoading}
                inProgress={isTableLoading}
                dataTestSubj="bulkActions"
                iconSide="right"
                iconType="arrowDown"
                popoverPanelPaddingSize="none"
                popoverContent={handleGetBulkItemsPopoverContent}
              >
                {i18n.BULK_ACTIONS}
              </UtilityBarAction>
            </UtilityBarGroup>
          </UtilityBarSection>
        </UtilityBar>
      </>
    );
  }
);
BulkActions.displayName = 'BulkActions';
