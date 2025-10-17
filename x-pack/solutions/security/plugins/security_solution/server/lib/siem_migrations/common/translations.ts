/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MIGRATION_ID_NOT_FOUND = (id: string) =>
  i18n.translate('xpack.securitySolution.api.migrationIdNotFound', {
    defaultMessage: `No Migration found with id: {id}`,
    values: {
      id,
    },
  });
