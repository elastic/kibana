/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type { AppHeaderMenu, AppHeaderMetadataItems } from '@kbn/app-header';
import { SecurityAppHeader } from '../../../common/components/app_header';
import { useKibana } from '../../../common/lib/kibana';
import { useLastUpdatedText } from './use_last_updated_text';
import * as i18n from './translations';

type MenuItem = NonNullable<AppHeaderMenu['items']>[number];

interface SharedListsAppHeaderProps {
  canCreate: boolean;
  canImport: boolean;
  isLoading: boolean;
  lastUpdated: number;
  onCreateSharedList: (returnFocus?: () => void) => void;
  onCreateExceptionItem: () => void;
  onImport: () => void;
}

/**
 * App header of the Shared Exception Lists page: title, last updated time, and page actions.
 */
export const SharedListsAppHeader = React.memo<SharedListsAppHeaderProps>(
  ({
    canCreate,
    canImport,
    isLoading,
    lastUpdated,
    onCreateSharedList,
    onCreateExceptionItem,
    onImport,
  }) => {
    const { navigateToApp } = useKibana().services.application;
    const lastUpdatedText = useLastUpdatedText({ isLoading, updatedAt: lastUpdated });

    const goToRules = useCallback(
      () => navigateToApp('security', { openInNewTab: true, path: '/rules' }),
      [navigateToApp]
    );

    const metadata = useMemo<AppHeaderMetadataItems>(
      () => [
        { type: 'text', label: lastUpdatedText, 'data-test-subj': 'sharedListsLastUpdated' },
        {
          type: 'button',
          label: i18n.ALL_EXCEPTIONS_SUBTITLE,
          onClick: goToRules,
          'data-test-subj': 'sharedListsGoToRules',
        },
      ],
      [goToRules, lastUpdatedText]
    );

    const menu = useMemo<AppHeaderMenu>(() => {
      const items: MenuItem[] = canImport
        ? [
            {
              id: 'importExceptionList',
              label: i18n.IMPORT_EXCEPTION_LIST_BUTTON,
              iconType: 'download',
              run: onImport,
              testId: 'importSharedExceptionList',
            },
          ]
        : [];

      if (!canCreate) {
        return { items };
      }

      return {
        items,
        primaryActionItem: {
          id: 'create',
          label: i18n.CREATE_BUTTON,
          iconType: 'plusCircle',
          run: (params) => onCreateSharedList(params?.returnFocus),
          testId: 'manageExceptionListCreateButton',
          splitButtonProps: {
            secondaryButtonAriaLabel: i18n.CREATE_MORE_OPTIONS,
            items: [
              {
                id: 'createExceptionItem',
                label: i18n.CREATE_BUTTON_ITEM_BUTTON,
                run: onCreateExceptionItem,
                testId: 'manageExceptionListCreateExceptionButton',
              },
            ],
          },
        },
      };
    }, [canCreate, canImport, onCreateExceptionItem, onCreateSharedList, onImport]);

    return (
      <SecurityAppHeader
        title={i18n.ALL_EXCEPTIONS}
        metadata={metadata}
        menu={menu}
        spacing="largeBleed"
      />
    );
  }
);

SharedListsAppHeader.displayName = 'SharedListsAppHeader';
