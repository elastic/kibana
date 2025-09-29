/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * This function creates an ingest processor step that copies the user.is_privileged field
 * to user.entity.attributes.Privileged only if user.is_privileged is present.
 */
export const copyUserIsPrivilegedStep: IngestProcessorContainer = {
  set: {
    copy_from: 'user.is_privileged',
    field: 'user.entity.attributes.Privileged',
    ignore_failure: true,
    if: 'ctx.user?.is_privileged != null',
  },
};
