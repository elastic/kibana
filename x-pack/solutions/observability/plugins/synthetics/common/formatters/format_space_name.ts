/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/* Formats kibana space id into a valid Fleet-compliant data-stream namespace */
import { INVALID_NAMESPACE_CHARACTERS } from '@kbn/fleet-plugin/common';

export const formatKibanaNamespace = (spaceId: string) => {
  const namespaceRegExp = new RegExp(INVALID_NAMESPACE_CHARACTERS, 'g');
  return spaceId.replace(namespaceRegExp, '_');
};
