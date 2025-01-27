/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { pipe } from 'lodash/fp';

import type { ExceptionListSchema, OsType } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionsBuilderReturnExceptionItem } from '@kbn/securitysolution-list-utils';

import type { HorizontalAlignment } from '@elastic/eui';
import { EuiBadge } from '@elastic/eui';
import type { Moment } from 'moment';
import {
  HeaderMenu,
  generateLinkedRulesMenuItems,
} from '@kbn/securitysolution-exception-list-components';
import { PopoverItems } from '../../../../common/components/popover_items';
import {
  enrichExceptionItemsWithOS,
  enrichNewExceptionItemsWithComments,
  enrichNewExceptionItemsWithExpireTime,
  enrichNewExceptionItemsWithName,
  enrichRuleExceptions,
  enrichSharedExceptions,
  lowercaseHashValues,
} from '../../utils/helpers';
import type {
  ExceptionListRuleReferencesInfoSchema,
  ExceptionListRuleReferencesSchema,
} from '../../../../../common/api/detection_engine/rule_exceptions';
import { LinkToRuleDetails, LinkToListDetails } from '../../../../exceptions/components';
import * as i18n from './translations';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

/**
 * Adds user defined name to all new exceptionItems
 * @param commentToAdd new comment to add to item
 */
export const enrichItemWithComment =
  (commentToAdd: string) =>
  (items: ExceptionsBuilderReturnExceptionItem[]): ExceptionsBuilderReturnExceptionItem[] => {
    return commentToAdd.trim() !== ''
      ? enrichNewExceptionItemsWithComments(items, [{ comment: commentToAdd }])
      : items;
  };

/**
 * Adds user defined name to all new exceptionItems
 * @param itemName exception item name
 */
export const enrichItemWithName =
  (itemName: string) => (items: ExceptionsBuilderReturnExceptionItem[]) => {
    return itemName.trim() !== '' ? enrichNewExceptionItemsWithName(items, itemName) : items;
  };

/**
 * Adds expiration datetime to all new exceptionItems
 * @param expireTimeToAdd new expireTime to add to item
 */
export const enrichItemWithExpireTime =
  (expireTimeToAdd: Moment | undefined) =>
  (items: ExceptionsBuilderReturnExceptionItem[]): ExceptionsBuilderReturnExceptionItem[] =>
    enrichNewExceptionItemsWithExpireTime(items, expireTimeToAdd);

/**
 * Modifies item entries to be in correct format and adds os selection to items
 * @param listType exception list type
 * @param selectedOs os selection
 */
export const enrichEndpointItems =
  (listType: ExceptionListTypeEnum, selectedOs: OsType[]) =>
  (items: ExceptionsBuilderReturnExceptionItem[]) => {
    if (listType === ExceptionListTypeEnum.ENDPOINT) {
      return lowercaseHashValues(enrichExceptionItemsWithOS(items, selectedOs));
    } else {
      return items;
    }
  };

/**
 * Modifies exception items to prepare for creating as rule_default
 * list items
 * @param listType exception list type
 * @param addToRules boolean determining if user selected to add items to default rule list
 */
export const enrichItemsForDefaultRuleList =
  (listType: ExceptionListTypeEnum, addToRules: boolean) =>
  (items: ExceptionsBuilderReturnExceptionItem[]) => {
    if (addToRules && listType !== ExceptionListTypeEnum.ENDPOINT) {
      return enrichRuleExceptions(items);
    } else {
      return items;
    }
  };

/**
 * Prepares items to be added to shared exception lists
 * @param listType exception list type
 * @param addToSharedLists boolean determining if user selected to add items to shared list
 * @param lists shared exception lists that were selected to add items to
 */
export const enrichItemsForSharedLists =
  (listType: ExceptionListTypeEnum, addToSharedLists: boolean, lists: ExceptionListSchema[]) =>
  (items: ExceptionsBuilderReturnExceptionItem[]) => {
    if (addToSharedLists && listType !== ExceptionListTypeEnum.ENDPOINT) {
      return enrichSharedExceptions(items, lists);
    } else {
      return items;
    }
  };

/**
 * Series of utils to modify and prepare exception items for update or creation
 * @param itemName user defined exception item name
 * @param commentToAdd comment to be added to item
 * @param addToRules boolean determining if user selected to add items to default rule list
 * @param addToSharedLists boolean determining if user selected to add items to shared list
 * @param sharedLists shared exception lists that were selected to add items to
 * @param selectedOs os selection
 * @param listType exception list type
 * @param expireTime exception item expire time
 * @param items exception items to be modified
 */
export const enrichNewExceptionItems = ({
  itemName,
  commentToAdd,
  addToRules,
  addToSharedLists,
  sharedLists,
  selectedOs,
  listType,
  expireTime,
  items,
}: {
  itemName: string;
  commentToAdd: string;
  selectedOs: OsType[];
  addToRules: boolean;
  addToSharedLists: boolean;
  sharedLists: ExceptionListSchema[];
  listType: ExceptionListTypeEnum;
  expireTime: Moment | undefined;
  items: ExceptionsBuilderReturnExceptionItem[];
}): ExceptionsBuilderReturnExceptionItem[] => {
  const enriched: ExceptionsBuilderReturnExceptionItem[] = pipe(
    enrichItemWithComment(commentToAdd),
    enrichItemWithExpireTime(expireTime),
    enrichItemWithName(itemName),
    enrichEndpointItems(listType, selectedOs),
    enrichItemsForDefaultRuleList(listType, addToRules),
    enrichItemsForSharedLists(listType, addToSharedLists, sharedLists)
  )(items);

  return enriched;
};

/**
 * Series of utils to modify and prepare exception items for update or creation
 * @param itemName user defined exception item name
 * @param commentToAdd comment to be added to item
 * @param addToRules boolean determining if user selected to add items to default rule list
 * @param addToSharedLists boolean determining if user selected to add items to shared list
 * @param sharedLists shared exception lists that were selected to add items to
 * @param selectedOs os selection
 * @param listType exception list type
 * @param expireTime exception item expire time
 * @param items exception items to be modified
 */
export const enrichExceptionItemsForUpdate = ({
  itemName,
  commentToAdd,
  selectedOs,
  listType,
  expireTime,
  items,
}: {
  itemName: string;
  commentToAdd: string;
  selectedOs: OsType[];
  listType: ExceptionListTypeEnum;
  expireTime: Moment | undefined;
  items: ExceptionsBuilderReturnExceptionItem[];
}): ExceptionsBuilderReturnExceptionItem[] => {
  const enriched: ExceptionsBuilderReturnExceptionItem[] = pipe(
    enrichItemWithComment(commentToAdd),
    enrichItemWithExpireTime(expireTime),
    enrichItemWithName(itemName),
    enrichEndpointItems(listType, selectedOs)
  )(items);

  return enriched;
};

/**
 * Shared lists columns for EuiInMemoryTable
 */
export const getSharedListsTableColumns = () => [
  {
    field: 'name',
    name: i18n.NAME_COLUMN,
    sortable: true,
    'data-test-subj': 'exceptionListNameCell',
  },
  {
    field: 'referenced_rules',
    name: 'Number of rules linked to',
    sortable: false,
    'data-test-subj': 'exceptionListRulesLinkedToIdCell',
    render: (references: ExceptionListRuleReferencesInfoSchema[]) => (
      <HeaderMenu
        emptyButton
        useCustomActions
        actions={generateLinkedRulesMenuItems({
          dataTestSubj: 'addToSharedListsLinkedRulesMenu',
          linkedRules: references,
          securityLinkAnchorComponent: LinkToRuleDetails,
        })}
        panelPaddingSize="none"
        disableActions={false}
        text={references.length.toString()}
        dataTestSubj="addToSharedListsLinkedRulesMenuAction"
      />
    ),
  },
  {
    name: i18n.ACTION_COLUMN,

    'data-test-subj': 'exceptionListRulesActionCell',
    render: (list: ExceptionListRuleReferencesSchema) => {
      return (
        <LinkToListDetails
          dataTestSubj="exceptionListActionCell-link"
          linkTitle={i18n.VIEW_LIST_DETAIL_ACTION}
          listId={list.list_id}
          external
        />
      );
    },
  },
];

/**
 * Rules columns for EuiInMemoryTable
 */
export const getRulesTableColumn = () => [
  {
    field: 'name',
    align: 'left' as HorizontalAlignment,
    name: i18n.NAME_COLUMN,
    sortable: true,
    'data-test-subj': 'ruleNameCell',
    truncateText: false,
  },
  {
    field: 'tags',
    align: 'left' as HorizontalAlignment,
    name: i18n.TAGS_COLUMN,
    'data-test-subj': 'ruleNameCell',
    render: (tags: RuleResponse['tags']) => {
      if (tags.length === 0) {
        return null;
      }

      const renderItem = (tag: string, i: number) => (
        <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
          {tag}
        </EuiBadge>
      );
      return (
        <PopoverItems
          items={tags}
          popoverTitle={i18n.TAGS_COLUMN}
          popoverButtonTitle={tags.length.toString()}
          popoverButtonIcon="tag"
          dataTestPrefix="tags"
          renderItem={renderItem}
        />
      );
    },
  },
  {
    name: i18n.ACTION_COLUMN,
    'data-test-subj': 'ruleAction-view',
    render: (rule: RuleResponse) => {
      return (
        <LinkToRuleDetails
          external
          referenceId={rule.id}
          referenceName={i18n.VIEW_RULE_DETAIL_ACTION}
        />
      );
    },
  },
];
