/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import type { CommonTriggerDefinition } from '@kbn/workflows-extensions/common';

export const MAX_ALERTS_PER_TRIGGER = 10_000;

// === Alert Status Changed ===

export const AlertStatusChangedTriggerId = 'securitySolution.alertStatusChanged' as const;

const workflowStatusEnum = z.enum(['open', 'acknowledged', 'closed']);

const previousStatusSchema = z.object({
  id: z.string(),
  previousStatus: workflowStatusEnum,
});

const alertStatusChangedEventSchema = z.object({
  alertIds: z
    .array(z.string())
    .meta({ description: 'IDs of the affected alerts (capped at 10,000).' }),
  status: workflowStatusEnum.meta({ description: 'The new workflow status.' }),
  previousStatuses: z
    .array(previousStatusSchema)
    .meta({ description: 'Previous status for each alert before this update.' }),
  truncated: z
    .boolean()
    .meta({ description: 'True if the number of affected alerts exceeded the capture limit.' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const alertStatusChangedTriggerDef: CommonTriggerDefinition = {
  id: AlertStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertStatusChangedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.alertStatusChanged.title', {
    defaultMessage: 'Security - Alert status changed',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.triggers.alertStatusChanged.description',
    {
      defaultMessage: 'Emitted when the workflow status of one or more detection alerts changes.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.alertStatusChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after a batch of detection alerts has their workflow status updated. The payload includes event.alertIds, event.status (new status), event.previousStatuses, event.spaceId, and event.truncated (true when more than 10,000 alerts were affected).',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.alertStatusChanged.documentation.example1',
        {
          defaultMessage: `## Run when alerts are acknowledged
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.status: "acknowledged"'
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.alertStatusChanged.documentation.example2',
        {
          defaultMessage: `## Process each affected alert sequentially
\`\`\`yaml
triggers:
  - type: {triggerId}
steps:
  - name: process_each_alert
    type: foreach
    foreach: "{{ event.alertIds | json }}"
    steps:
      - name: summarize
        type: renderAlertNarrative
        with:
          alertId: "{{ foreach.item }}"
\`\`\``,
          values: { triggerId: AlertStatusChangedTriggerId },
        }
      ),
    ],
  },
};

// === Alert Tags Changed ===

export const AlertTagsChangedTriggerId = 'securitySolution.alertTagsChanged' as const;

const alertTagsChangedEventSchema = z.object({
  alertIds: z.array(z.string()).meta({ description: 'IDs of the affected alerts.' }),
  tagsToAdd: z.array(z.string()).meta({ description: 'Tags requested to be added.' }),
  tagsToRemove: z.array(z.string()).meta({ description: 'Tags requested to be removed.' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const alertTagsChangedTriggerDef: CommonTriggerDefinition = {
  id: AlertTagsChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertTagsChangedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.alertTagsChanged.title', {
    defaultMessage: 'Security - Alert tags changed',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.triggers.alertTagsChanged.description',
    {
      defaultMessage: 'Emitted when tags are added or removed from detection alerts.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.alertTagsChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after tags are added or removed from a batch of detection alerts. The payload includes event.alertIds, event.tagsToAdd, event.tagsToRemove, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.alertTagsChanged.documentation.example',
        {
          defaultMessage: `## Run when a specific tag is added
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.tagsToAdd: "high-priority"'
\`\`\``,
          values: { triggerId: AlertTagsChangedTriggerId },
        }
      ),
    ],
  },
};

// === Alert Assignees Changed ===

export const AlertAssigneesChangedTriggerId = 'securitySolution.alertAssigneesChanged' as const;

const alertAssigneesChangedEventSchema = z.object({
  alertIds: z.array(z.string()).meta({ description: 'IDs of the affected alerts.' }),
  assigneesToAdd: z.array(z.string()).meta({ description: 'Profile UIDs of assignees added.' }),
  assigneesToRemove: z
    .array(z.string())
    .meta({ description: 'Profile UIDs of assignees removed.' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const alertAssigneesChangedTriggerDef: CommonTriggerDefinition = {
  id: AlertAssigneesChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: alertAssigneesChangedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.alertAssigneesChanged.title', {
    defaultMessage: 'Security - Alert assignees changed',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.description',
    {
      defaultMessage: 'Emitted when assignees are added or removed from detection alerts.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after assignees are added or removed from a batch of detection alerts. The payload includes event.alertIds, event.assigneesToAdd, event.assigneesToRemove, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.documentation.example',
        {
          defaultMessage: `## Run when an alert is assigned
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.assigneesToAdd: *'
\`\`\``,
          values: { triggerId: AlertAssigneesChangedTriggerId },
        }
      ),
    ],
  },
};

// === Attack Status Changed ===

export const AttackStatusChangedTriggerId = 'securitySolution.attackStatusChanged' as const;

const attackStatusChangedEventSchema = z.object({
  attackIds: z.array(z.string()).meta({ description: 'IDs of the affected attack discoveries.' }),
  status: workflowStatusEnum.meta({ description: 'The new workflow status.' }),
  previousStatuses: z
    .array(previousStatusSchema)
    .meta({ description: 'Previous status for each attack before this update.' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const attackStatusChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackStatusChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackStatusChangedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.attackStatusChanged.title', {
    defaultMessage: 'Security - Attack discovery status changed',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.triggers.attackStatusChanged.description',
    {
      defaultMessage: 'Emitted when the workflow status of one or more attack discoveries changes.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.attackStatusChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after a batch of attack discoveries has their workflow status updated. The payload includes event.attackIds, event.status, event.previousStatuses, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.attackStatusChanged.documentation.example',
        {
          defaultMessage: `## Run when attacks are acknowledged
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.status: "acknowledged"'
\`\`\``,
          values: { triggerId: AttackStatusChangedTriggerId },
        }
      ),
    ],
  },
};

// === Attack Tags Changed ===

export const AttackTagsChangedTriggerId = 'securitySolution.attackTagsChanged' as const;

const attackTagsChangedEventSchema = z.object({
  attackIds: z.array(z.string()).meta({ description: 'IDs of the affected attack discoveries.' }),
  tagsToAdd: z.array(z.string()).meta({ description: 'Tags requested to be added.' }),
  tagsToRemove: z.array(z.string()).meta({ description: 'Tags requested to be removed.' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const attackTagsChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackTagsChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackTagsChangedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.attackTagsChanged.title', {
    defaultMessage: 'Security - Attack discovery tags changed',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.triggers.attackTagsChanged.description',
    {
      defaultMessage: 'Emitted when tags are added or removed from attack discoveries.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.attackTagsChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after tags are added or removed from a batch of attack discoveries. The payload includes event.attackIds, event.tagsToAdd, event.tagsToRemove, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.attackTagsChanged.documentation.example',
        {
          defaultMessage: `## Run when a tag is added to attacks
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.tagsToAdd: "escalated"'
\`\`\``,
          values: { triggerId: AttackTagsChangedTriggerId },
        }
      ),
    ],
  },
};

// === Attack Assignees Changed ===

export const AttackAssigneesChangedTriggerId = 'securitySolution.attackAssigneesChanged' as const;

const attackAssigneesChangedEventSchema = z.object({
  attackIds: z.array(z.string()).meta({ description: 'IDs of the affected attack discoveries.' }),
  assigneesToAdd: z.array(z.string()).meta({ description: 'Profile UIDs of assignees added.' }),
  assigneesToRemove: z
    .array(z.string())
    .meta({ description: 'Profile UIDs of assignees removed.' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const attackAssigneesChangedTriggerDef: CommonTriggerDefinition = {
  id: AttackAssigneesChangedTriggerId,
  stability: 'tech_preview',
  eventSchema: attackAssigneesChangedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.attackAssigneesChanged.title', {
    defaultMessage: 'Security - Attack discovery assignees changed',
  }),
  description: i18n.translate(
    'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.description',
    {
      defaultMessage: 'Emitted when assignees are added or removed from attack discoveries.',
    }
  ),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.documentation.details',
      {
        defaultMessage:
          'Emitted after assignees are added or removed from a batch of attack discoveries. The payload includes event.attackIds, event.assigneesToAdd, event.assigneesToRemove, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.documentation.example',
        {
          defaultMessage: `## Run when an attack is assigned
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.assigneesToAdd: *'
\`\`\``,
          values: { triggerId: AttackAssigneesChangedTriggerId },
        }
      ),
    ],
  },
};

// === Note Created ===

export const NoteCreatedTriggerId = 'securitySolution.noteCreated' as const;

const noteCreatedEventSchema = z.object({
  noteId: z.string().meta({ description: 'The saved object ID of the created note.' }),
  noteContent: z.string().meta({ description: 'The text content of the note.' }),
  createdBy: z.string().meta({ description: 'The username of the note author.' }),
  documentId: z
    .string()
    .meta({ description: 'The entity this note is attached to (alert or document _id).' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const noteCreatedTriggerDef: CommonTriggerDefinition = {
  id: NoteCreatedTriggerId,
  stability: 'tech_preview',
  eventSchema: noteCreatedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.noteCreated.title', {
    defaultMessage: 'Security - Note created',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.triggers.noteCreated.description', {
    defaultMessage:
      'Emitted when a note is created on a document (alert, attack discovery, or other entity).',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.noteCreated.documentation.details',
      {
        defaultMessage:
          'Emitted after a note is created on a specific document. Only fires for notes attached to an entity (documentId is set). Investigation guide and timeline-level notes do not fire this trigger. The payload includes event.noteId, event.noteContent, event.createdBy, event.documentId, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.noteCreated.documentation.example',
        {
          defaultMessage: `## Run whenever a note is added to a document
\`\`\`yaml
triggers:
  - type: {triggerId}
\`\`\``,
          values: { triggerId: NoteCreatedTriggerId },
        }
      ),
    ],
  },
};

// === Note Updated ===

export const NoteUpdatedTriggerId = 'securitySolution.noteUpdated' as const;

const noteUpdatedEventSchema = z.object({
  noteId: z.string().meta({ description: 'The saved object ID of the updated note.' }),
  noteContent: z.string().meta({ description: 'The updated text content of the note.' }),
  updatedBy: z.string().meta({ description: 'The username who updated the note.' }),
  documentId: z
    .string()
    .meta({ description: 'The entity this note is attached to (alert or document _id).' }),
  spaceId: z.string().meta({ description: 'The Kibana space ID.' }),
});

export const noteUpdatedTriggerDef: CommonTriggerDefinition = {
  id: NoteUpdatedTriggerId,
  stability: 'tech_preview',
  eventSchema: noteUpdatedEventSchema,
  title: i18n.translate('xpack.securitySolution.workflows.triggers.noteUpdated.title', {
    defaultMessage: 'Security - Note updated',
  }),
  description: i18n.translate('xpack.securitySolution.workflows.triggers.noteUpdated.description', {
    defaultMessage:
      'Emitted when a note is updated on a document (alert, attack discovery, or other entity).',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.securitySolution.workflows.triggers.noteUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted after a note is updated on a specific document. Only fires for notes attached to an entity (documentId is set). The payload includes event.noteId, event.noteContent, event.updatedBy, event.documentId, and event.spaceId.',
      }
    ),
    examples: [
      i18n.translate(
        'xpack.securitySolution.workflows.triggers.noteUpdated.documentation.example',
        {
          defaultMessage: `## Run whenever a note is updated on a document
\`\`\`yaml
triggers:
  - type: {triggerId}
\`\`\``,
          values: { triggerId: NoteUpdatedTriggerId },
        }
      ),
    ],
  },
};
