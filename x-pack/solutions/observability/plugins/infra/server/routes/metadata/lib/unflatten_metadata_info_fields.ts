/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, isArray } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { InfraMetadataFields } from '../../../../common/http_api/metadata_api';

const isMultiField = (field: string, knownFieldKeys: Set<string>): boolean => {
  const segments = field.split('.');
  for (let depth = 1; depth < segments.length; depth++) {
    if (knownFieldKeys.has(segments.slice(0, depth).join('.'))) {
      return true;
    }
  }
  return false;
};

export const unflattenMetadataInfoFields = (result = {}, hit: InfraMetadataFields) => {
  const fields = hit?.fields ?? {};
  const ignoredFieldValues = hit?.ignored_field_values ?? {};
  // Include ignored keys so a parent dropped by ignore_above still identifies its .text/.keyword siblings.
  const knownFieldKeys = new Set([...Object.keys(fields), ...Object.keys(ignoredFieldValues)]);

  for (const [field, value] of Object.entries(fields)) {
    if (value === null || value === undefined) {
      continue;
    }
    if (isMultiField(field, knownFieldKeys)) {
      continue;
    }
    if (isArray(value) && value.length > 1) {
      set(result, field, value);
    } else {
      set(result, field, castArray(value)[0]);
    }
  }
};
