/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Transform } from 'stream';

import * as t from 'io-ts';
import { has } from 'lodash/fp';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import {
  CreateCommentsArray,
  ExportExceptionDetails,
  ImportCommentsArray,
  ImportExceptionListItemSchema,
  ImportExceptionListItemSchemaDecoded,
  ImportExceptionListSchemaDecoded,
  ImportExceptionsListSchema,
  importExceptionListItemSchema,
  importExceptionsListSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import {
  createConcatStream,
  createFilterStream,
  createMapStream,
  createReduceStream,
  createSplitStream,
} from '@kbn/utils';
import { BadRequestError } from '@kbn/securitysolution-es-utils';
import { exactCheck, formatErrors } from '@kbn/securitysolution-io-ts-utils';

import { ExceptionsImport } from '../../import_exception_list_and_items';

/**
 * Parses strings from ndjson stream
 */
export const parseNdjsonStrings = (): Transform => {
  return createMapStream((ndJsonStr: string): Transform => {
    try {
      return JSON.parse(ndJsonStr);
    } catch (err) {
      return err;
    }
  });
};

/**
 *
 * Sorting of exceptions logic
 *
 */

/**
 * Helper to determine if exception shape is that of an item vs parent container
 * @param exception
 * @returns {boolean}
 */
export const isImportExceptionListItemSchema = (
  exception: ImportExceptionListItemSchema | ImportExceptionsListSchema
): exception is ImportExceptionListItemSchema => {
  return has('entries', exception) || has('item_id', exception);
};

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 * @param exceptions {array} - exceptions to import
 * @returns {stream} incoming exceptions sorted into lists and items
 */
export const sortExceptions = (
  exceptions: ExceptionsImport
): {
  items: ImportExceptionListItemSchema[];
  lists: ImportExceptionsListSchema[];
} => {
  return exceptions.reduce<{
    items: ImportExceptionListItemSchema[];
    lists: ImportExceptionsListSchema[];
  }>(
    (acc, exception) => {
      if (isImportExceptionListItemSchema(exception)) {
        return { ...acc, items: [...acc.items, exception] };
      } else {
        return { ...acc, lists: [...acc.lists, exception] };
      }
    },
    {
      items: [],
      lists: [],
    }
  );
};

/**
 * Sorts the exceptions into the lists and items.
 * We do this because we don't want the order of the exceptions
 * in the import to matter. If we didn't sort, then some items
 * might error if the list has not yet been created
 * @returns {stream} incoming exceptions sorted into lists and items
 */
export const sortExceptionsStream = (): Transform => {
  return createReduceStream<{
    items: Array<ImportExceptionListItemSchema | Error>;
    lists: Array<ImportExceptionsListSchema | Error>;
  }>(
    (acc, exception) => {
      if (has('entries', exception) || has('item_id', exception)) {
        return { ...acc, items: [...acc.items, exception] };
      } else {
        return { ...acc, lists: [...acc.lists, exception] };
      }
    },
    {
      items: [],
      lists: [],
    }
  );
};

/**
 * Updates any comments associated with exception items to resemble
 * comment creation schema.
 * See issue for context https://github.com/elastic/kibana/issues/124742#issuecomment-1033082093
 * @returns {array} comments reformatted properly for import
 */
export const manageExceptionComments = (
  comments: ImportCommentsArray | undefined
): CreateCommentsArray => {
  if (comments == null || !comments.length) {
    return [];
  } else {
    return comments.map(({ comment }) => ({
      comment,
    }));
  }
};

/**
 *
 * Validating exceptions logic
 *
 */

/**
 * Validates exception lists and items schemas incoming as stream
 * @returns {stream} validated lists and items
 */
export const validateExceptionsStream = (): Transform => {
  return createMapStream<{
    items: Array<ImportExceptionListItemSchema | Error>;
    lists: Array<ImportExceptionsListSchema | Error>;
  }>((exceptions) => ({
    items: validateExceptionsItems(exceptions.items),
    lists: validateExceptionsLists(exceptions.lists),
  }));
};

/**
 * Validates exception lists and items schemas incoming as array
 * @param exceptions {array} - exceptions to import sorted by list/item
 * @returns {object} validated lists and items
 */
export const validateExceptions = (exceptions: {
  items: Array<ImportExceptionListItemSchema | Error>;
  lists: Array<ImportExceptionsListSchema | Error>;
}): {
  items: Array<ImportExceptionListItemSchemaDecoded | Error>;
  lists: Array<ImportExceptionListSchemaDecoded | Error>;
} => {
  return {
    items: validateExceptionsItems(exceptions.items),
    lists: validateExceptionsLists(exceptions.lists),
  };
};

/**
 * Validates exception lists incoming as array
 * @param lists {array} - exception lists to import
 * @returns {array} validated exception lists and validation errors
 */
export const validateExceptionsLists = (
  lists: Array<ImportExceptionsListSchema | Error>
): Array<ImportExceptionListSchemaDecoded | Error> => {
  const onLeft = (errors: t.Errors): BadRequestError | ImportExceptionListSchemaDecoded => {
    return new BadRequestError(formatErrors(errors).join());
  };
  const onRight = (
    schemaList: ImportExceptionsListSchema
  ): BadRequestError | ImportExceptionListSchemaDecoded => {
    return schemaList as ImportExceptionListSchemaDecoded;
  };

  return lists.map((obj: ImportExceptionsListSchema | Error) => {
    if (!(obj instanceof Error)) {
      const decodedList = importExceptionsListSchema.decode(obj);
      const checkedList = exactCheck(obj, decodedList);

      return pipe(checkedList, fold(onLeft, onRight));
    } else {
      return obj;
    }
  });
};

/**
 * Validates exception items incoming as array
 * @param items {array} - exception items to import
 * @returns {array} validated exception items and validation errors
 */
export const validateExceptionsItems = (
  items: Array<ImportExceptionListItemSchema | Error>
): Array<ImportExceptionListItemSchemaDecoded | Error> => {
  const onLeft = (errors: t.Errors): BadRequestError | ImportExceptionListItemSchemaDecoded => {
    return new BadRequestError(formatErrors(errors).join());
  };
  const onRight = (
    itemSchema: ImportExceptionListItemSchema
  ): BadRequestError | ImportExceptionListItemSchemaDecoded => {
    return itemSchema as ImportExceptionListItemSchemaDecoded;
  };

  return items.map((item: ImportExceptionListItemSchema | Error) => {
    if (!(item instanceof Error)) {
      const itemWithUpdatedComments = { ...item, comments: manageExceptionComments(item.comments) };
      const decodedItem = importExceptionListItemSchema.decode(itemWithUpdatedComments);
      const checkedItem = exactCheck(itemWithUpdatedComments, decodedItem);

      return pipe(checkedItem, fold(onLeft, onRight));
    } else {
      return item;
    }
  });
};

/**
 *
 * Validating import limits logic
 *
 */

/**
 * Validates max number of exceptions allowed to import
 * @param limit {number} - max number of exceptions allowed to import
 * @returns {array} validated exception items and validation errors
 */
export const checkLimits = (limit: number): ((arg: ExceptionsImport) => ExceptionsImport) => {
  return (exceptions: ExceptionsImport): ExceptionsImport => {
    if (exceptions.length >= limit) {
      throw new Error(`Can't import more than ${limit} exceptions`);
    }

    return exceptions;
  };
};

/**
 * Validates max number of exceptions allowed to import
 * Adaptation from: saved_objects/import/create_limit_stream.ts
 * @param limit {number} - max number of exceptions allowed to import
 * @returns {stream}
 */
export const createLimitStream = (limit: number): Transform => {
  return new Transform({
    objectMode: true,
    async transform(obj, _, done): Promise<void> {
      if (obj.lists.length + obj.items.length >= limit) {
        done(new Error(`Can't import more than ${limit} exceptions`));
      } else {
        done(undefined, obj);
      }
    },
  });
};

/**
 *
 * Filters
 *
 */

/**
 * Filters out the counts metadata added on export
 */
export const filterExportedCounts = (): Transform => {
  return createFilterStream<
    ImportExceptionListSchemaDecoded | ImportExceptionListItemSchemaDecoded | ExportExceptionDetails
  >((obj) => obj != null && !has('exported_exception_list_count', obj));
};

/**
 * Filters out empty strings from ndjson stream
 */
export const filterEmptyStrings = (): Transform => {
  return createFilterStream<string>((ndJsonStr) => ndJsonStr.trim() !== '');
};

/**
 *
 * Set of helpers to run exceptions through on import
 *
 */

/**
 * Takes an array of exceptions and runs it through a set of helpers
 * to check max number of exceptions, the shape of the data and sorts
 * it into items and lists
 * @param exceptionsToImport {array} - exceptions to be imported
 * @param exceptionsLimit {number} - max nuber of exception allowed to import
 * @returns {object} sorted items and lists
 */
export const exceptionsChecksFromArray = (
  exceptionsToImport: Array<ImportExceptionsListSchema | ImportExceptionListItemSchema>,
  exceptionsLimit: number
): {
  items: Array<ImportExceptionListItemSchemaDecoded | Error>;
  lists: Array<ImportExceptionListSchemaDecoded | Error>;
} => {
  return pipe(exceptionsToImport, checkLimits(exceptionsLimit), sortExceptions, validateExceptions);
};

/**
 * Takes an array of exceptions and runs it through a set of helpers
 * to check max number of exceptions, the shape of the data and sorts
 * it into items and lists
 * Inspiration and the pattern of code followed is from:
 * saved_objects/lib/create_saved_objects_stream_from_ndjson.ts
 * @param exceptionsToImport {array} - exceptions to be imported
 * @param exceptionsLimit {number} - max nuber of exception allowed to import
 * @returns {object} sorted items and lists
 */
export const createExceptionsStreamFromNdjson = (exceptionsLimit: number): Transform[] => {
  return [
    createSplitStream('\n'),
    filterEmptyStrings(),
    parseNdjsonStrings(),
    filterExportedCounts(),
    sortExceptionsStream(),
    validateExceptionsStream(),
    createLimitStream(exceptionsLimit),
    createConcatStream([]),
  ];
};
