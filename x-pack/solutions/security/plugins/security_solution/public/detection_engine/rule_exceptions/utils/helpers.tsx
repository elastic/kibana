/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiCommentProps } from '@elastic/eui';
import { EuiText, EuiAvatar } from '@elastic/eui';
import { capitalize, get, omit } from 'lodash';
import type { Moment } from 'moment';
import moment from 'moment';

import { css } from '@emotion/react';

import type {
  CommentsArray,
  Comment,
  CreateComment,
  Entry,
  NamespaceType,
  EntryNested,
  OsTypeArray,
  ExceptionListItemSchema,
  UpdateExceptionListItemSchema,
  ExceptionListSchema,
  EntriesArray,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  ListOperatorTypeEnum,
  ListOperatorEnum,
  comment,
  osType,
} from '@kbn/securitysolution-io-ts-list-types';

import type {
  ExceptionsBuilderExceptionItem,
  ExceptionsBuilderReturnExceptionItem,
} from '@kbn/securitysolution-list-utils';
import { getNewExceptionItem, addIdToEntries } from '@kbn/securitysolution-list-utils';
import { removeIdFromExceptionItemsEntries } from '@kbn/securitysolution-list-hooks';

import type { EcsSecurityExtension as Ecs, CodeSignature } from '@kbn/securitysolution-ecs';
import type { EventSummaryField } from '../../../common/components/event_details/types';
import { getEventFieldsToDisplay } from '../../../common/components/event_details/get_alert_summary_rows';
import * as i18n from './translations';
import type { AlertData, Flattened } from './types';

import { WithCopyToClipboard } from '../../../common/lib/clipboard/with_copy_to_clipboard';
import { ALERT_ORIGINAL_EVENT } from '../../../../common/field_maps/field_names';
import {
  EVENT_CODE,
  EVENT_CATEGORY,
  getKibanaAlertIdField,
  highlightedFieldsPrefixToExclude,
  KIBANA_ALERT_RULE_TYPE,
  AGENT_ID,
  AGENT_TYPE,
  KIBANA_ALERT_RULE_UUID,
  ENDPOINT_ALERT,
} from './highlighted_fields_config';

/**
 * Formats os value array to a displayable string
 */
export const formatOperatingSystems = (osTypes: string[]): string => {
  return osTypes
    .filter((os) => ['linux', 'macos', 'windows'].includes(os))
    .map((os) => {
      if (os === 'macos') {
        return 'macOS';
      }
      return capitalize(os);
    })
    .join(', ');
};

const commentCss = css`
  white-space: pre-wrap;
`;

/**
 * Formats ExceptionItem.comments into EuiCommentList format
 *
 * @param comments ExceptionItem.comments
 */
export const getFormattedComments = (comments: CommentsArray): EuiCommentProps[] =>
  comments.map((commentItem) => ({
    username: commentItem.created_by,
    timestamp: moment(commentItem.created_at).format('on MMM Do YYYY @ HH:mm:ss'),
    event: i18n.COMMENT_EVENT,
    timelineAvatar: <EuiAvatar size="l" name={commentItem.created_by.toUpperCase()} />,
    children: (
      <EuiText size="s" css={commentCss}>
        {commentItem.comment}
      </EuiText>
    ),
    actions: (
      <WithCopyToClipboard
        data-test-subj="copy-to-clipboard"
        text={commentItem.comment}
        titleSummary={i18n.ADD_TO_CLIPBOARD}
      />
    ),
  }));

export const formatExceptionItemForUpdate = (
  exceptionItem: ExceptionListItemSchema
): UpdateExceptionListItemSchema => {
  /* eslint-disable @typescript-eslint/naming-convention */
  const {
    created_at,
    created_by,
    list_id,
    tie_breaker_id,
    updated_at,
    updated_by,
    /* eslint-enable @typescript-eslint/naming-convention */
    ...fieldsToUpdate
  } = exceptionItem;
  return {
    ...fieldsToUpdate,
  };
};

/**
 * Maps "event." fields to "signal.original_event.". This is because when a rule is created
 * the "event" field is copied over to "original_event". When the user creates an exception,
 * they expect it to match against the original_event's fields, not the signal event's.
 * @param exceptionItems new or existing ExceptionItem[]
 */
export const prepareExceptionItemsForBulkClose = (
  exceptionItems: ExceptionListItemSchema[]
): ExceptionListItemSchema[] => {
  return exceptionItems.map((item: ExceptionListItemSchema) => {
    if (item.entries !== undefined) {
      const newEntries = item.entries.map((itemEntry: Entry | EntryNested) => {
        const entry = omit(itemEntry, 'id') as Entry | EntryNested;
        return {
          ...entry,
          field: entry.field.startsWith('event.')
            ? entry.field.replace(/^event./, `${ALERT_ORIGINAL_EVENT}.`)
            : entry.field,
        };
      });
      return {
        ...item,
        entries: newEntries,
        comments: [], // Strips out unneeded comments attribute for bulk close as they are not needed and are throwing type errors
      };
    } else {
      return { ...item, comments: [] };
    }
  });
};

/**
 * Adds new and existing comments to all new exceptionItems if not present already
 * @param exceptionItems new or existing ExceptionItem[]
 * @param comments new Comment
 */
export const enrichNewExceptionItemsWithComments = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[],
  comments: Array<Comment | CreateComment>
): ExceptionsBuilderReturnExceptionItem[] => {
  return exceptionItems.map((item: ExceptionsBuilderReturnExceptionItem) => {
    return {
      ...item,
      comments,
    };
  });
};

/**
 * Adds expireTime to all new exceptionItems if not present already
 * @param exceptionItems new or existing ExceptionItem[]
 * @param expireTime new expireTime
 */
export const enrichNewExceptionItemsWithExpireTime = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[],
  expireTime: Moment | undefined
): ExceptionsBuilderReturnExceptionItem[] => {
  const expireTimeDateString = expireTime !== undefined ? expireTime.toISOString() : undefined;
  return exceptionItems.map((item: ExceptionsBuilderReturnExceptionItem) => {
    return {
      ...item,
      expire_time: expireTimeDateString,
    };
  });
};

export const buildGetAlertByIdQuery = (id: string | undefined) => ({
  query: {
    match: {
      _id: {
        query: id || '',
      },
    },
  },
});

/**
 * Adds new and existing comments to exceptionItem
 * @param exceptionItem existing ExceptionItem
 * @param comments array of comments that can include existing
 * and new comments
 */
export const enrichExistingExceptionItemWithComments = (
  exceptionItem: ExceptionsBuilderReturnExceptionItem,
  comments: Array<Comment | CreateComment>
): ExceptionsBuilderReturnExceptionItem => {
  const formattedComments = comments.map((item) => {
    if (comment.is(item)) {
      const { id, comment: existingComment } = item;
      return {
        id,
        comment: existingComment,
      };
    } else {
      return {
        comment: item.comment,
      };
    }
  });

  return {
    ...exceptionItem,
    comments: formattedComments,
  };
};

/**
 * Adds provided osTypes to all exceptionItems if not present already
 * @param exceptionItems new or existing ExceptionItem[]
 * @param osTypes array of os values
 */
export const enrichExceptionItemsWithOS = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[],
  osTypes: OsTypeArray
): ExceptionsBuilderReturnExceptionItem[] => {
  return exceptionItems.map((item: ExceptionsBuilderReturnExceptionItem) => {
    return {
      ...item,
      os_types: osTypes,
    };
  });
};

export const retrieveAlertOsTypes = (alertData?: AlertData): OsTypeArray => {
  const osDefaults: OsTypeArray = ['windows', 'macos'];
  if (alertData != null) {
    const os =
      alertData?.agent?.type === 'endpoint'
        ? alertData.host?.os?.name?.toLowerCase()
        : alertData.host?.os?.family;
    if (os != null) {
      return osType.is(os) ? [os] : osDefaults;
    }
  }
  return osDefaults;
};

/**
 * Returns given exceptionItems with all hash-related entries lowercased
 */
export const lowercaseHashValues = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[]
): ExceptionsBuilderReturnExceptionItem[] => {
  return exceptionItems.map((item) => {
    const newEntries = item.entries.map((itemEntry) => {
      if (itemEntry.field.includes('.hash')) {
        if (itemEntry.type === 'match') {
          return {
            ...itemEntry,
            value: itemEntry.value.toLowerCase(),
          };
        } else if (itemEntry.type === 'match_any') {
          return {
            ...itemEntry,
            value: itemEntry.value.map((val) => val.toLowerCase()),
          };
        }
      }
      return itemEntry;
    });
    return {
      ...item,
      entries: newEntries,
    };
  });
};

/**
 * Returns the value for `file.Ext.code_signature` which
 * can be an object or array of objects
 */
export const getFileCodeSignature = (
  alertData: Flattened<Ecs>
): Array<{ subjectName: string; trusted: string }> => {
  const { file } = alertData;
  const codeSignature = file && file.Ext && file.Ext.code_signature;

  return getCodeSignatureValue(codeSignature);
};

/**
 * Returns the value for `process.Ext.code_signature` which
 * can be an object or array of objects
 */
export const getProcessCodeSignature = (
  alertData: Flattened<Ecs>
): Array<{ subjectName: string; trusted: string }> => {
  const { process } = alertData;
  const codeSignature = process && process.Ext && process.Ext.code_signature;
  return getCodeSignatureValue(codeSignature);
};

/**
 * Pre 7.10 `Ext.code_signature` fields were mistakenly populated as
 * a single object with subject_name and trusted.
 */
export const getCodeSignatureValue = (
  codeSignature: Flattened<CodeSignature> | Flattened<CodeSignature[]> | undefined
): Array<{ subjectName: string; trusted: string }> => {
  if (Array.isArray(codeSignature) && codeSignature.length > 0) {
    return codeSignature.map((signature) => {
      return {
        subjectName: signature?.subject_name ?? '',
        trusted: signature?.trusted?.toString() ?? '',
      };
    });
  } else {
    const signature: Flattened<CodeSignature> | undefined = !Array.isArray(codeSignature)
      ? codeSignature
      : undefined;

    return [
      {
        subjectName: signature?.subject_name ?? '',
        trusted: signature?.trusted ?? '',
      },
    ];
  }
};

// helper type to filter empty-valued exception entries
interface ExceptionEntry {
  value?: string;
  entries?: ExceptionEntry[];
}

/**
 * Takes an array of Entries and filter out the ones with empty values.
 * It will also filter out empty values for nested entries.
 */
function filterEmptyExceptionEntries<T extends ExceptionEntry>(entries: T[]): T[] {
  const finalEntries: T[] = [];
  for (const entry of entries) {
    if (entry.entries !== undefined) {
      entry.entries = entry.entries.filter((el) => el.value !== undefined && el.value.length > 0);
      finalEntries.push(entry);
    } else if (entry.value !== undefined && entry.value.length > 0) {
      finalEntries.push(entry);
    }
  }
  return finalEntries;
}

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const getPrepopulatedEndpointException = ({
  listId,
  name,
  codeSignature,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  name: string;
  codeSignature: { subjectName: string; trusted: string };
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { file, host } = alertEcsData;
  const filePath = file?.path ?? '';
  const sha256Hash = file?.hash?.sha256 ?? '';
  const isLinux = host?.os?.name === 'Linux';

  const commonFields: Array<{
    field: string;
    operator: 'excluded' | 'included';
    type: 'match';
    value: string;
  }> = [
    {
      field: isLinux ? 'file.path' : 'file.path.caseless',
      operator: 'included',
      type: 'match',
      value: filePath ?? '',
    },
    {
      field: 'file.hash.sha256',
      operator: 'included',
      type: 'match',
      value: sha256Hash ?? '',
    },
    {
      field: 'event.code',
      operator: 'included',
      type: 'match',
      value: eventCode ?? '',
    },
  ];
  const entriesToAdd = () => {
    if (isLinux) {
      return addIdToEntries(commonFields);
    } else {
      return addIdToEntries([
        {
          field: 'file.Ext.code_signature',
          type: 'nested',
          entries: [
            {
              field: 'subject_name',
              operator: 'included',
              type: 'match',
              value: codeSignature != null ? codeSignature.subjectName : '',
            },
            {
              field: 'trusted',
              operator: 'included',
              type: 'match',
              value: codeSignature != null ? codeSignature.trusted : '',
            },
          ],
        },
        ...commonFields,
      ]);
    }
  };

  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, name }),
    entries: entriesToAdd(),
  };
};

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const getPrepopulatedRansomwareException = ({
  listId,
  name,
  codeSignature,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  name: string;
  codeSignature: { subjectName: string; trusted: string };
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process, Ransomware } = alertEcsData;
  const sha256Hash = process?.hash?.sha256 ?? '';
  const executable = process?.executable ?? '';
  const ransomwareFeature = Ransomware?.feature ?? '';
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, name }),
    entries: addIdToEntries([
      {
        field: 'process.Ext.code_signature',
        type: 'nested',
        entries: [
          {
            field: 'subject_name',
            operator: 'included',
            type: 'match',
            value: codeSignature != null ? codeSignature.subjectName : '',
          },
          {
            field: 'trusted',
            operator: 'included',
            type: 'match',
            value: codeSignature != null ? codeSignature.trusted : '',
          },
        ],
      },
      {
        field: 'process.executable',
        operator: 'included',
        type: 'match',
        value: executable ?? '',
      },
      {
        field: 'process.hash.sha256',
        operator: 'included',
        type: 'match',
        value: sha256Hash ?? '',
      },
      {
        field: 'Ransomware.feature',
        operator: 'included',
        type: 'match',
        value: ransomwareFeature ?? '',
      },
      {
        field: 'event.code',
        operator: 'included',
        type: 'match',
        value: eventCode ?? '',
      },
    ]),
  };
};

export const getPrepopulatedMemorySignatureException = ({
  listId,
  name,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  name: string;
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process } = alertEcsData;
  const entries = filterEmptyExceptionEntries([
    {
      field: 'Memory_protection.feature',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.Memory_protection?.feature ?? '',
    },
    {
      field: 'process.executable.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.executable ?? '',
    },
    {
      field: 'process.name.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.name ?? '',
    },
    {
      field: 'process.hash.sha256',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.hash?.sha256 ?? '',
    },
  ]);
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, name }),
    entries: addIdToEntries(entries),
  };
};
export const getPrepopulatedMemoryShellcodeException = ({
  listId,
  name,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  name: string;
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process } = alertEcsData;
  const entries = filterEmptyExceptionEntries([
    {
      field: 'Memory_protection.feature',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.Memory_protection?.feature ?? '',
    },
    {
      field: 'Memory_protection.self_injection',
      operator: 'included' as const,
      type: 'match' as const,
      value: String(alertEcsData.Memory_protection?.self_injection) ?? '',
    },
    {
      field: 'process.executable.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.executable ?? '',
    },
    {
      field: 'process.name.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.name ?? '',
    },
    {
      field: 'process.Ext.token.integrity_level_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.Ext?.token?.integrity_level_name ?? '',
    },
  ]);

  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, name }),
    entries: addIdToEntries(entries),
  };
};

export const getPrepopulatedBehaviorException = ({
  listId,
  name,
  eventCode,
  listNamespace = 'agnostic',
  alertEcsData,
}: {
  listId: string;
  listNamespace?: NamespaceType;
  name: string;
  eventCode: string;
  alertEcsData: Flattened<Ecs>;
}): ExceptionsBuilderExceptionItem => {
  const { process } = alertEcsData;
  const entries = filterEmptyExceptionEntries([
    {
      field: 'rule.id',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.rule?.id ?? '',
    },
    {
      field: 'process.executable.caseless',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.executable ?? '',
    },
    {
      field: 'process.command_line',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.command_line ?? '',
    },
    {
      field: 'process.parent.executable',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.parent?.executable ?? '',
    },
    {
      field: 'process.code_signature.subject_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: process?.code_signature?.subject_name ?? '',
    },
    {
      field: 'file.path',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.file?.path ?? '',
    },
    {
      field: 'file.name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.file?.name ?? '',
    },
    {
      field: 'source.ip',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.source?.ip ?? '',
    },
    {
      field: 'destination.ip',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.destination?.ip ?? '',
    },
    {
      field: 'registry.path',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.registry?.path ?? '',
    },
    {
      field: 'registry.value',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.registry?.value ?? '',
    },
    {
      field: 'registry.data.strings',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.registry?.data?.strings ?? '',
    },
    {
      field: 'dll.path',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dll?.path ?? '',
    },
    {
      field: 'dll.code_signature.subject_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dll?.code_signature?.subject_name ?? '',
    },
    {
      field: 'dll.pe.original_file_name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dll?.pe?.original_file_name ?? '',
    },
    {
      field: 'dns.question.name',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dns?.question?.name ?? '',
    },
    {
      field: 'dns.question.type',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.dns?.question?.type ?? '',
    },
    {
      field: 'user.id',
      operator: 'included' as const,
      type: 'match' as const,
      value: alertEcsData.user?.id ?? '',
    },
  ]);
  return {
    ...getNewExceptionItem({ listId, namespaceType: listNamespace, name }),
    entries: addIdToEntries(entries),
  };
};

/**
 * Returns the default values from the alert data to autofill new endpoint exceptions
 */
export const defaultEndpointExceptionItems = (
  listId: string,
  name: string,
  alertEcsData: Flattened<Ecs> & { 'event.code'?: string }
): ExceptionsBuilderExceptionItem[] => {
  const eventCode = alertEcsData['event.code'] ?? alertEcsData.event?.code;

  switch (eventCode) {
    case 'behavior':
      return [
        getPrepopulatedBehaviorException({
          listId,
          name,
          eventCode,
          alertEcsData,
        }),
      ];
    case 'memory_signature':
      return [
        getPrepopulatedMemorySignatureException({
          listId,
          name,
          eventCode,
          alertEcsData,
        }),
      ];
    case 'shellcode_thread':
      return [
        getPrepopulatedMemoryShellcodeException({
          listId,
          name,
          eventCode,
          alertEcsData,
        }),
      ];
    case 'ransomware':
      return getProcessCodeSignature(alertEcsData).map((codeSignature) =>
        getPrepopulatedRansomwareException({
          listId,
          name,
          eventCode,
          codeSignature,
          alertEcsData,
        })
      );
    default:
      // By default return the standard prepopulated Endpoint Exception fields
      return getFileCodeSignature(alertEcsData).map((codeSignature) =>
        getPrepopulatedEndpointException({
          listId,
          name,
          eventCode: eventCode ?? '',
          codeSignature,
          alertEcsData,
        })
      );
  }
};

/**
 * Adds user defined name to all new exceptionItems
 * @param exceptionItems new or existing ExceptionItem[]
 * @param name new exception item name
 */
export const enrichNewExceptionItemsWithName = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[],
  name: string
): ExceptionsBuilderReturnExceptionItem[] => {
  return exceptionItems.map((item: ExceptionsBuilderReturnExceptionItem) => {
    return {
      ...item,
      name,
    };
  });
};

/**
 * Modifies exception items to prepare for creating as rule_default
 * list items
 * @param exceptionItems new or existing ExceptionItem[]
 */
export const enrichRuleExceptions = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[]
): ExceptionsBuilderReturnExceptionItem[] => {
  return exceptionItems.map((item: ExceptionsBuilderReturnExceptionItem) => {
    return {
      ...removeIdFromExceptionItemsEntries<ExceptionsBuilderReturnExceptionItem>(item),
      list_id: undefined,
      namespace_type: 'single',
    };
  });
};

/**
 * Prepares items to be added to shared exception lists
 * @param exceptionItems new or existing ExceptionItem[]
 * @param lists shared exception lists that were selected to add items to
 */
export const enrichSharedExceptions = (
  exceptionItems: ExceptionsBuilderReturnExceptionItem[],
  lists: ExceptionListSchema[]
): ExceptionsBuilderReturnExceptionItem[] => {
  return lists.flatMap((list) => {
    return exceptionItems.map((item) => {
      return {
        ...removeIdFromExceptionItemsEntries<ExceptionsBuilderReturnExceptionItem>(item),
        list_id: list.list_id,
        namespace_type: list.namespace_type,
      };
    });
  });
};

/**
 * Creates new Rule exception item with passed in entries
 */
export const buildRuleExceptionWithConditions = ({
  name,
  exceptionEntries,
}: {
  name: string;
  exceptionEntries: EntriesArray;
}): ExceptionsBuilderExceptionItem => {
  return {
    ...getNewExceptionItem({ listId: undefined, namespaceType: 'single', name }),
    entries: addIdToEntries(exceptionEntries),
  };
};

/**
 Generate exception conditions based on the highlighted fields of the alert that
 have corresponding values in the alert data.
 For the initial implementation the nested conditions are not considered
 Converting a singular value to a string or an array of strings
 is necessary because the "Match" or "Match any" operators
 are designed to operate with string value(s).
 */
export const buildExceptionEntriesFromAlertFields = ({
  highlightedFields,
  alertData,
}: {
  highlightedFields: EventSummaryField[];
  alertData: AlertData;
}): EntriesArray => {
  return Object.values(highlightedFields).reduce((acc: EntriesArray, field) => {
    const fieldKey = field.id;
    const fieldValue = get(alertData, fieldKey) ?? get(alertData, getKibanaAlertIdField(fieldKey));

    if (fieldValue !== null && fieldValue !== undefined) {
      const listOperatorType = Array.isArray(fieldValue)
        ? ListOperatorTypeEnum.MATCH_ANY
        : ListOperatorTypeEnum.MATCH;

      const fieldValueAsString = Array.isArray(fieldValue)
        ? fieldValue.map(String)
        : fieldValue.toString();
      acc.push({
        field: fieldKey,
        operator: ListOperatorEnum.INCLUDED,
        type: listOperatorType,
        value: fieldValueAsString,
      });
    }

    return acc;
  }, []);
};
/**
 * Prepopulate the Rule Exception with the highlighted fields from the Alert's Summary.
 * @param alertData The Alert data object
 * @param exceptionItemName The name of the Exception Item
 * @returns A new Rule Exception Item with the highlighted fields as entries,
 */
export const getPrepopulatedRuleExceptionWithHighlightFields = ({
  alertData,
  exceptionItemName,
  ruleCustomHighlightedFields,
}: {
  alertData: AlertData;
  exceptionItemName: string;
  ruleCustomHighlightedFields: string[];
}): ExceptionsBuilderExceptionItem | null => {
  const highlightedFields = getAlertHighlightedFields(alertData, ruleCustomHighlightedFields);
  if (!highlightedFields.length) return null;

  const exceptionEntries = buildExceptionEntriesFromAlertFields({
    highlightedFields,
    alertData,
  });
  if (!exceptionEntries.length) return null;

  return buildRuleExceptionWithConditions({
    name: exceptionItemName,
    exceptionEntries,
  });
};

/**
  Filters out the irrelevant highlighted fields for Rule exceptions using
  1. The "highlightedFieldsPrefixToExclude" array
  2. Agent.id field in case the alert was not generated from Endpoint
  3. Threshold Rule
*/
export const filterHighlightedFields = (
  fields: EventSummaryField[],
  prefixesToExclude: string[],
  alertData: AlertData
): EventSummaryField[] => {
  return fields.filter(({ id }) => {
    // Exclude agent.id field only if the agent type was not Endpoint
    if (id === AGENT_ID) return isAlertFromEndpointEvent(alertData);

    return !prefixesToExclude.some((field: string) => id.startsWith(field));
  });
};

/**
 * Retrieve the highlighted fields from the Alert Summary based on the following Alert properties:
 * * event.category
 * * event.code
 * * kibana.alert.rule.type
 * * Alert field ids filters
 * @param alertData The Alert data object
 */
export const getAlertHighlightedFields = (
  alertData: AlertData,
  ruleCustomHighlightedFields: string[]
): EventSummaryField[] => {
  const eventCategory = get(alertData, EVENT_CATEGORY) as string | string[];
  const eventCode = get(alertData, EVENT_CODE);
  const eventRuleType = get(alertData, KIBANA_ALERT_RULE_TYPE);
  const eventCategories = {
    primaryEventCategory: Array.isArray(eventCategory) ? eventCategory[0] : eventCategory,
    allEventCategories: Array.isArray(eventCategory) ? eventCategory : [eventCategory],
  };

  const fieldsToDisplay = getEventFieldsToDisplay({
    eventCategories,
    eventCode,
    eventRuleType,
    highlightedFieldsOverride: ruleCustomHighlightedFields,
  });
  return filterHighlightedFields(fieldsToDisplay, highlightedFieldsPrefixToExclude, alertData);
};

/**
 * Checks to see if the given set of Timeline event detail items includes data that indicates its
 * an endpoint Alert
 */
export const isAlertFromEndpointEvent = (alertData: AlertData) => {
  // Check to see if a timeline event item is an Alert
  const isTimelineEventItemAnAlert = get(alertData, KIBANA_ALERT_RULE_UUID);
  if (!isTimelineEventItemAnAlert) return false;

  const agentTypes = get(alertData, AGENT_TYPE);
  const agentType = Array.isArray(agentTypes) ? agentTypes[0] : agentTypes;
  return agentType === ENDPOINT_ALERT;
};
