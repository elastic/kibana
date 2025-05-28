/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServerError } from '@kbn/kibana-utils-plugin/common';

export const isPermissionError = (error: { body: KibanaServerError }) => {
  return error.body.statusCode === 403;
};

export const isNotFoundError = (error: { body: KibanaServerError }) => {
  return error.body.statusCode === 404;
};

export const formatRulesetName = (rawName: string) =>
  rawName
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-') // Replace all special/non-alphanumerical characters with dashes
    .replace(/^[-]+|[-]+$/g, '') // Strip all leading and trailing dashes
    .toLowerCase();
