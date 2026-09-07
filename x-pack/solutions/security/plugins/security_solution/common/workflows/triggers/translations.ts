/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// Shared field descriptions used across multiple triggers

export const TRIGGER_SCHEMA_STATUS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.schema.status',
  { defaultMessage: 'The new workflow status.' }
);

export const TRIGGER_SCHEMA_TAGS_TO_ADD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.schema.tagsToAdd',
  { defaultMessage: 'Tags requested to be added.' }
);

export const TRIGGER_SCHEMA_TAGS_TO_REMOVE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.schema.tagsToRemove',
  { defaultMessage: 'Tags requested to be removed.' }
);

export const TRIGGER_SCHEMA_ASSIGNEES_TO_ADD_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.schema.assigneesToAdd',
  { defaultMessage: 'Profile UIDs of assignees added.' }
);

export const TRIGGER_SCHEMA_ASSIGNEES_TO_REMOVE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.schema.assigneesToRemove',
  { defaultMessage: 'Profile UIDs of assignees removed.' }
);

export const TRIGGER_SCHEMA_PREVIOUS_STATUS_ID_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.schema.previousStatusId',
  { defaultMessage: 'ID of the alert or attack this previous status entry refers to.' }
);

// Alert status changed

export const ALERT_STATUS_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertStatusChanged.schema.alertIds',
  { defaultMessage: 'IDs of the affected alerts (capped at 10,000).' }
);

export const ALERT_STATUS_CHANGED_SCHEMA_PREVIOUS_STATUSES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertStatusChanged.schema.previousStatuses',
  { defaultMessage: 'Previous status for each alert before this update.' }
);

export const ALERT_STATUS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertStatusChanged.schema.truncated',
  { defaultMessage: 'True if the number of affected alerts exceeded the capture limit.' }
);

// Alert tags changed

export const ALERT_TAGS_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertTagsChanged.schema.alertIds',
  { defaultMessage: 'IDs of the affected alerts.' }
);

export const ALERT_TAGS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertTagsChanged.schema.truncated',
  {
    defaultMessage:
      'True if any payload field was capped: either the number of affected alerts exceeded the capture limit, or the number of tags in the request exceeded the per-operation limit.',
  }
);

// Alert assignees changed

export const ALERT_ASSIGNEES_CHANGED_SCHEMA_ALERT_IDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.schema.alertIds',
  { defaultMessage: 'IDs of the affected alerts.' }
);

export const ALERT_ASSIGNEES_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.schema.truncated',
  {
    defaultMessage:
      'True if any payload field was capped: either the number of affected alerts exceeded the capture limit, or the number of assignees in the request exceeded the per-operation limit.',
  }
);

// Attack status changed

export const ATTACK_STATUS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackStatusChanged.schema.attackIds',
  { defaultMessage: 'IDs of the affected attack discoveries.' }
);

export const ATTACK_STATUS_CHANGED_SCHEMA_PREVIOUS_STATUSES_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackStatusChanged.schema.previousStatuses',
  { defaultMessage: 'Previous status for each attack before this update.' }
);

export const ATTACK_STATUS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackStatusChanged.schema.truncated',
  { defaultMessage: 'True if the number of affected attacks exceeded the capture limit.' }
);

// Attack tags changed

export const ATTACK_TAGS_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackTagsChanged.schema.attackIds',
  { defaultMessage: 'IDs of the affected attack discoveries.' }
);

export const ATTACK_TAGS_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackTagsChanged.schema.truncated',
  {
    defaultMessage:
      'True if any payload field was capped: either the number of affected attacks exceeded the capture limit, or the number of tags in the request exceeded the per-operation limit.',
  }
);

// Attack assignees changed

export const ATTACK_ASSIGNEES_CHANGED_SCHEMA_ATTACK_IDS_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.schema.attackIds',
  { defaultMessage: 'IDs of the affected attack discoveries.' }
);

export const ATTACK_ASSIGNEES_CHANGED_SCHEMA_TRUNCATED_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.schema.truncated',
  {
    defaultMessage:
      'True if any payload field was capped: either the number of affected attacks exceeded the capture limit, or the number of assignees in the request exceeded the per-operation limit.',
  }
);

// Note created

export const NOTE_CREATED_SCHEMA_NOTE_ID_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteCreated.schema.noteId',
  { defaultMessage: 'The saved object ID of the created note.' }
);

export const NOTE_CREATED_SCHEMA_CREATED_BY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteCreated.schema.createdBy',
  {
    defaultMessage:
      'The display name of the note author (full name if configured, otherwise username).',
  }
);

export const NOTE_CREATED_SCHEMA_DOCUMENT_ID_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteCreated.schema.documentId',
  { defaultMessage: 'The entity this note is attached to (alert or document _id).' }
);

// Note updated

export const NOTE_UPDATED_SCHEMA_NOTE_ID_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteUpdated.schema.noteId',
  { defaultMessage: 'The saved object ID of the updated note.' }
);

export const NOTE_UPDATED_SCHEMA_UPDATED_BY_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteUpdated.schema.updatedBy',
  {
    defaultMessage:
      'The display name of the user who updated the note (full name if configured, otherwise username).',
  }
);

export const NOTE_UPDATED_SCHEMA_DOCUMENT_ID_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteUpdated.schema.documentId',
  { defaultMessage: 'The entity this note is attached to (alert or document _id).' }
);

// ── Trigger metadata: titles, descriptions, documentation ────────────────────

// Alert status changed

export const ALERT_STATUS_CHANGED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertStatusChanged.title',
  { defaultMessage: 'Security - Alert status changed' }
);

export const ALERT_STATUS_CHANGED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertStatusChanged.description',
  { defaultMessage: 'Emitted when the workflow status of one or more detection alerts changes.' }
);

export const ALERT_STATUS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertStatusChanged.documentation.details',
  {
    defaultMessage:
      'Emitted after a batch of detection alerts has their workflow status updated. The payload includes event.alertIds, event.status (new status), event.previousStatuses, and event.truncated (true when more than 10,000 alerts were affected).',
  }
);

// Alert tags changed

export const ALERT_TAGS_CHANGED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertTagsChanged.title',
  { defaultMessage: 'Security - Alert tags changed' }
);

export const ALERT_TAGS_CHANGED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertTagsChanged.description',
  { defaultMessage: 'Emitted when tags are added or removed from detection alerts.' }
);

export const ALERT_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertTagsChanged.documentation.details',
  {
    defaultMessage:
      'Emitted after tags are added or removed from a batch of detection alerts. The payload includes event.alertIds, event.tagsToAdd, event.tagsToRemove, and event.truncated (true when more than 10,000 alerts were affected).',
  }
);

// Alert assignees changed

export const ALERT_ASSIGNEES_CHANGED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.title',
  { defaultMessage: 'Security - Alert assignees changed' }
);

export const ALERT_ASSIGNEES_CHANGED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.description',
  { defaultMessage: 'Emitted when assignees are added or removed from detection alerts.' }
);

export const ALERT_ASSIGNEES_CHANGED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.alertAssigneesChanged.documentation.details',
  {
    defaultMessage:
      'Emitted after assignees are added or removed from a batch of detection alerts. The payload includes event.alertIds, event.assigneesToAdd, event.assigneesToRemove, and event.truncated (true when more than 10,000 alerts were affected).',
  }
);

// Attack status changed

export const ATTACK_STATUS_CHANGED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackStatusChanged.title',
  { defaultMessage: 'Security - Attack discovery status changed' }
);

export const ATTACK_STATUS_CHANGED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackStatusChanged.description',
  {
    defaultMessage: 'Emitted when the workflow status of one or more attack discoveries changes.',
  }
);

export const ATTACK_STATUS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackStatusChanged.documentation.details',
  {
    defaultMessage:
      'Emitted after a batch of attack discoveries has their workflow status updated. The payload includes event.attackIds, event.status (new status), event.previousStatuses, and event.truncated (true when more than 10,000 attack discoveries were affected).',
  }
);

// Attack tags changed

export const ATTACK_TAGS_CHANGED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackTagsChanged.title',
  { defaultMessage: 'Security - Attack discovery tags changed' }
);

export const ATTACK_TAGS_CHANGED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackTagsChanged.description',
  { defaultMessage: 'Emitted when tags are added or removed from attack discoveries.' }
);

export const ATTACK_TAGS_CHANGED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackTagsChanged.documentation.details',
  {
    defaultMessage:
      'Emitted after tags are added or removed from a batch of attack discoveries. The payload includes event.attackIds, event.tagsToAdd, event.tagsToRemove, and event.truncated (true when more than 10,000 attack discoveries were affected).',
  }
);

// Attack assignees changed

export const ATTACK_ASSIGNEES_CHANGED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.title',
  { defaultMessage: 'Security - Attack discovery assignees changed' }
);

export const ATTACK_ASSIGNEES_CHANGED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.description',
  { defaultMessage: 'Emitted when assignees are added or removed from attack discoveries.' }
);

export const ATTACK_ASSIGNEES_CHANGED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.attackAssigneesChanged.documentation.details',
  {
    defaultMessage:
      'Emitted after assignees are added or removed from a batch of attack discoveries. The payload includes event.attackIds, event.assigneesToAdd, event.assigneesToRemove, and event.truncated (true when more than 10,000 attack discoveries were affected).',
  }
);

// Note created

export const NOTE_CREATED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteCreated.title',
  { defaultMessage: 'Security - Note created' }
);

export const NOTE_CREATED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteCreated.description',
  {
    defaultMessage:
      'Emitted when a note is created on a document (alert, attack discovery, or other entity).',
  }
);

export const NOTE_CREATED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteCreated.documentation.details',
  {
    defaultMessage:
      'Emitted after a note is created on a specific document. Only fires for notes attached to an entity (documentId is set). Investigation guide and timeline-level notes do not fire this trigger. The payload includes event.noteId, event.createdBy, and event.documentId.',
  }
);

// Note updated

export const NOTE_UPDATED_TRIGGER_TITLE = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteUpdated.title',
  { defaultMessage: 'Security - Note updated' }
);

export const NOTE_UPDATED_TRIGGER_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteUpdated.description',
  {
    defaultMessage:
      'Emitted when a note is updated on a document (alert, attack discovery, or other entity).',
  }
);

export const NOTE_UPDATED_TRIGGER_DOCUMENTATION_DETAILS = i18n.translate(
  'xpack.securitySolution.workflows.triggers.noteUpdated.documentation.details',
  {
    defaultMessage:
      'Emitted after a note is updated on a specific document. Only fires for notes attached to an entity (documentId is set). The payload includes event.noteId, event.updatedBy, and event.documentId.',
  }
);
