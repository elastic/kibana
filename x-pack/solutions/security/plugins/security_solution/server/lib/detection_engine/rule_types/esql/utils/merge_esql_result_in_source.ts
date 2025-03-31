/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignalSource } from '../../types';
import {
  robustGet,
  robustUnset,
} from '../../utils/source_fields_merging/utils/robust_field_access';

export const mergeEsqlResultInSource = (
  source: SignalSource | undefined,
  esqlResult: Record<string, string>
): SignalSource => {
  const document = source ?? {};
  Object.keys(esqlResult).forEach((field) => {
    if (robustGet({ key: field, document })) {
      robustUnset({ key: field, document });
    }
    document[field] = esqlResult[field];
  });

  return document;
};
