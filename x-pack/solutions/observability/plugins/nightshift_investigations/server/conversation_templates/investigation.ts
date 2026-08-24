/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplate } from '@kbn/agent-builder-common';

export const investigationTemplate: ConversationTemplate = {
  id: 'observability.nightshift.investigation',
  version: 1,
  name: 'Investigation',
  fields: {
    status: {
      input_type: 'SELECT',
      description: 'Status',
      options: ['open', 'in_progress', 'resolved', 'false_positive'],
    },
    severity: {
      input_type: 'SELECT',
      description: 'Severity',
      options: ['critical', 'high', 'medium', 'low'],
    },
    summary: { input_type: 'TEXT', description: 'Summary' },
    root_cause: { input_type: 'TEXT', description: 'Root cause' },
    affected_services: { input_type: 'TEXT_ARRAY', description: 'Affected services' },
    assigned_to: { input_type: 'USER', description: 'Assigned to' },
  },
};
