/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Case, Attachment } from '@kbn/cases-plugin/common/types/domain';
import { omit } from 'lodash';
import { FtrProviderContext } from '../../ftr_provider_context';

export interface CommonSavedObjectAttributes {
  id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  version?: string | null;
  [key: string]: unknown;
}

export function SvlCasesOmitServiceProvider({}: FtrProviderContext) {
  const savedObjectCommonAttributes = ['created_at', 'updated_at', 'version', 'id'];

  return {
    removeServerGeneratedPropertiesFromObject<T extends object, K extends keyof T>(
      object: T,
      keys: K[]
    ): Omit<T, K> {
      return omit<T, K>(object, keys);
    },

    removeServerGeneratedPropertiesFromSavedObject<T extends CommonSavedObjectAttributes>(
      attributes: T,
      keys: Array<keyof T> = []
    ): Omit<T, (typeof savedObjectCommonAttributes)[number] | (typeof keys)[number]> {
      return this.removeServerGeneratedPropertiesFromObject(attributes, [
        ...savedObjectCommonAttributes,
        ...keys,
      ]);
    },

    removeServerGeneratedPropertiesFromCase(theCase: Case): Partial<Case> {
      return this.removeServerGeneratedPropertiesFromSavedObject<Case>(theCase, ['closed_at']);
    },

    removeServerGeneratedPropertiesFromComments(
      comments: Attachment[] | undefined
    ): Array<Partial<Attachment>> | undefined {
      return comments?.map((comment) => {
        return this.removeServerGeneratedPropertiesFromSavedObject<Attachment>(comment, []);
      });
    },
  };
}
