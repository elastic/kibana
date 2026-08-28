/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, get, isArray, isPlainObject } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { InfraMetadataFields } from '../../../../common/http_api/metadata_api';

const hasLeafAncestor = (result: object, field: string): boolean => {
  const segments = field.split('.');
  for (let depth = 1; depth < segments.length; depth++) {
    const ancestor: unknown = get(result, segments.slice(0, depth));
    if (ancestor !== undefined && ancestor !== null && !isPlainObject(ancestor)) {
      return true;
    }
  }
  return false;
};

export const unflattenMetadataInfoFields = (result = {}, hit: InfraMetadataFields) => {
  for (const [field, value] of Object.entries(hit?.fields ?? {})) {
    if (value !== null && value !== undefined) {
      if (hasLeafAncestor(result, field)) {
        continue;
      }
      if (isArray(value) && value.length > 1) {
        set(result, field, value);
      } else {
        set(result, field, castArray(value)[0]);
      }
    }
  }
};
