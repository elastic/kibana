/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNonLocalIndexName } from '@kbn/es-query';

/**
 * Qualifies an index name recorded inside a document (e.g. `kibana.alert.ancestors[].index`) with
 * the cross-cluster / cross-project alias of the document that contains it.
 */
export const getClusterQualifiedIndex = (index: string, documentIndex: string): string => {
  if (!index || isNonLocalIndexName(index) || !isNonLocalIndexName(documentIndex)) {
    return index;
  }
  const separatorIndex = documentIndex.indexOf(':');
  return `${documentIndex.slice(0, separatorIndex + 1)}${index}`;
};
