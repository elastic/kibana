/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';
import {
  MAX_ALERTS_PER_TRIGGER,
  MAX_ID_LENGTH,
  previousStatusSchema,
  workflowStatusEnum,
} from '../constants';
import {
  ALERT_STATUS_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION,
  ALERT_STATUS_CHANGED_SCHEMA_PREVIOUS_STATUSES_DESCRIPTION,
  ALERT_STATUS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION,
  ALERT_STATUS_CHANGED_TRIGGER_DESCRIPTION,
  ALERT_STATUS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
  ALERT_STATUS_CHANGED_TRIGGER_TITLE,
  TRIGGER_SCHEMA_STATUS_DESCRIPTION,
} from '../translations';

export const AlertStatusChangedTriggerId = 'security.alertStatusChanged' as const;

const documentationExample1 = `## Run when alerts are acknowledged
\`\`\`yaml
triggers:
  - type: security.alertStatusChanged
    on:
      condition: 'event.status: "acknowledged"'
\`\`\``;

const documentationExample2 = `## Process each affected alert sequentially
\`\`\`yaml
triggers:
  - type: security.alertStatusChanged
steps:
  - name: process_each_alert
    type: foreach
    foreach: "{{ event.alertIds | json }}"
    steps:
      - name: summarize
        type: renderAlertNarrative
        with:
          alertId: "{{ foreach.item }}"
\`\`\``;

const alertStatusChangedEventSchema = z.object({
  alertIds: z
    .array(z.string().min(1).max(MAX_ID_LENGTH))
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ALERT_STATUS_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION }),
  status: workflowStatusEnum.meta({ description: TRIGGER_SCHEMA_STATUS_DESCRIPTION }),
  previousStatuses: z
    .array(previousStatusSchema)
    .max(MAX_ALERTS_PER_TRIGGER)
    .meta({ description: ALERT_STATUS_CHANGED_SCHEMA_PREVIOUS_STATUSES_DESCRIPTION }),
  truncated: z.boolean().meta({ description: ALERT_STATUS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION }),
});

export const alertStatusChangedTriggerDef: CommonTriggerDefinition = {
  id: AlertStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedEventSchema,
  title: ALERT_STATUS_CHANGED_TRIGGER_TITLE,
  description: ALERT_STATUS_CHANGED_TRIGGER_DESCRIPTION,
  documentation: {
    details: ALERT_STATUS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS,
    examples: [documentationExample1, documentationExample2],
  },
};
