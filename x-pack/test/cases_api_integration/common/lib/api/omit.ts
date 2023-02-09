/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseResponse, CommentResponse } from '@kbn/cases-plugin/common/api';
import { omit } from 'lodash';

interface CommonSavedObjectAttributes {
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: string | null;
  [key: string]: unknown;
}

const savedObjectCommonAttributes = ['created_at', 'updated_at', 'version', 'id'];

export const removeServerGeneratedPropertiesFromObject = <T extends object, K extends keyof T>(
  object: T,
  keys: K[]
): Omit<T, K> => {
  return omit<T, K>(object, keys);
};
export const removeServerGeneratedPropertiesFromSavedObject = <
  T extends CommonSavedObjectAttributes
>(
  attributes: T,
  keys: Array<keyof T> = []
): Omit<T, typeof savedObjectCommonAttributes[number] | typeof keys[number]> => {
  return removeServerGeneratedPropertiesFromObject(attributes, [
    ...savedObjectCommonAttributes,
    ...keys,
  ]);
};

export const removeServerGeneratedPropertiesFromCase = (
  theCase: CaseResponse
): Partial<CaseResponse> => {
  return removeServerGeneratedPropertiesFromSavedObject<CaseResponse>(theCase, ['closed_at']);
};

export const removeServerGeneratedPropertiesFromComments = (
  comments: CommentResponse[] | undefined
): Array<Partial<CommentResponse>> | undefined => {
  return comments?.map((comment) => {
    return removeServerGeneratedPropertiesFromSavedObject<CommentResponse>(comment, []);
  });
};
