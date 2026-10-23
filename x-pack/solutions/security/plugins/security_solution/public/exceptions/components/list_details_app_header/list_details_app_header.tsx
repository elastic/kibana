/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { AppHeaderMenu, AppHeaderMetadataItems } from '@kbn/app-header';
import { EditModal } from '@kbn/securitysolution-exception-list-components';
import type { ListDetails, Rule } from '@kbn/securitysolution-exception-list-components';
import { SecurityPageName } from '../../../../common/constants';
import { SecurityAppHeader } from '../../../common/components/app_header';
import { getRuleDetailsUrl, useGetSecuritySolutionUrl } from '../../../common/components/link_to';
import * as i18n from './translations';

type MenuItem = NonNullable<AppHeaderMenu['items']>[number];

const TEST_SUBJ_PREFIX = 'exceptionListManagement';
const LINKED_RULES_POPOVER_WIDTH = 320;

interface ListDetailsAppHeaderProps {
  name: string;
  description?: string;
  listId: string;
  linkedRules: Rule[];
  isReadOnly: boolean;
  canUserEditList: boolean;
  /** Resolves when the update succeeded; rejects when it failed. */
  onEditListDetails: (listDetails: ListDetails) => Promise<void>;
  onExportList: () => void;
  onDuplicateList: () => void;
  onDeleteList: () => void;
  onManageRules: () => void;
}

/**
 * App header of the Exception list details page: list name, id and description, linked rules, and list actions.
 */
export const ListDetailsAppHeader = React.memo<ListDetailsAppHeaderProps>(
  ({
    name,
    description,
    listId,
    linkedRules,
    isReadOnly,
    canUserEditList,
    onEditListDetails,
    onExportList,
    onDuplicateList,
    onDeleteList,
    onManageRules,
  }) => {
    const getSecuritySolutionUrl = useGetSecuritySolutionUrl();
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const canEdit = canUserEditList && !isReadOnly;

    const openEditModal = useCallback(() => setIsEditModalVisible(true), []);
    const closeEditModal = useCallback(() => setIsEditModalVisible(false), []);
    const saveListDetails = useCallback(
      async (listDetails: ListDetails) => {
        await onEditListDetails(listDetails);
        closeEditModal();
      },
      [closeEditModal, onEditListDetails]
    );

    const back = useMemo(
      () => ({
        label: i18n.BACK_LABEL,
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.exceptions }),
      }),
      [getSecuritySolutionUrl]
    );

    const metadata = useMemo<AppHeaderMetadataItems>(() => {
      const listIdItem = {
        type: 'text' as const,
        label: i18n.LIST_ID,
        value: listId,
        'data-test-subj': `${TEST_SUBJ_PREFIX}ListID`,
      };
      if (!description) {
        return [listIdItem];
      }
      return [
        listIdItem,
        {
          type: 'text',
          label: description,
          'data-test-subj': `${TEST_SUBJ_PREFIX}Description`,
        },
      ];
    }, [description, listId]);

    const menu = useMemo<AppHeaderMenu>(() => {
      const linkedRulesItem: MenuItem = {
        id: 'linkedRules',
        label: i18n.LINKED_RULES(linkedRules.length),
        iconType: 'check',
        disableButton: linkedRules.length === 0,
        popoverWidth: LINKED_RULES_POPOVER_WIDTH,
        testId: `${TEST_SUBJ_PREFIX}LinkedRulesMenu`,
        items: linkedRules.map((rule) => ({
          id: `linkedRule-${rule.id}`,
          label: rule.name,
          href: getSecuritySolutionUrl({
            deepLinkId: SecurityPageName.rules,
            path: getRuleDetailsUrl(rule.id),
          }),
          target: '_blank',
          testId: `${TEST_SUBJ_PREFIX}LinkedRule${rule.id}`,
        })),
      };
      const listActionItems: MenuItem[] = [
        {
          id: 'exportList',
          label: i18n.EXPORT_LIST,
          iconType: 'upload',
          overflow: true,
          run: onExportList,
          testId: `${TEST_SUBJ_PREFIX}ExportAction`,
        },
        {
          id: 'duplicateList',
          label: i18n.DUPLICATE_LIST,
          iconType: 'copy',
          overflow: true,
          disableButton: !canUserEditList,
          run: onDuplicateList,
          testId: `${TEST_SUBJ_PREFIX}DuplicateAction`,
        },
        {
          id: 'deleteList',
          label: i18n.DELETE_LIST,
          iconType: 'trash',
          overflow: true,
          disableButton: !canUserEditList,
          run: onDeleteList,
          testId: `${TEST_SUBJ_PREFIX}DeleteAction`,
        },
      ];

      if (!canEdit) {
        return { items: [linkedRulesItem, ...listActionItems] };
      }

      return {
        items: [
          linkedRulesItem,
          {
            id: 'editDetails',
            label: i18n.EDIT_DETAILS,
            iconType: 'pencil',
            overflow: true,
            run: openEditModal,
            testId: `${TEST_SUBJ_PREFIX}EditDetailsAction`,
          },
          ...listActionItems,
        ],
        primaryActionItem: {
          id: 'linkRules',
          label: i18n.LINK_RULES,
          iconType: 'link',
          run: onManageRules,
          testId: `${TEST_SUBJ_PREFIX}RightSideMenuItemsLinkRulesButton`,
        },
      };
    }, [
      canEdit,
      canUserEditList,
      getSecuritySolutionUrl,
      linkedRules,
      onDeleteList,
      onDuplicateList,
      onExportList,
      onManageRules,
      openEditModal,
    ]);

    return (
      <>
        <SecurityAppHeader
          title={name}
          back={back}
          metadata={metadata}
          menu={menu}
          spacing="largeBleed"
        />
        {isEditModalVisible && (
          <EditModal
            listDetails={{ name, description }}
            onSave={saveListDetails}
            onCancel={closeEditModal}
          />
        )}
      </>
    );
  }
);

ListDetailsAppHeader.displayName = 'ListDetailsAppHeader';
