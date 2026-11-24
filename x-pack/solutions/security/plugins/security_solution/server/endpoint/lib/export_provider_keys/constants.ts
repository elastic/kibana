/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Hidden, space-agnostic, encrypted saved object holding one export provider's account key */
export const EXPORT_PROVIDER_KEY_SAVED_OBJECT_TYPE = 'security:endpoint-export-provider-key';

/** Task Manager task that deletes key objects nothing references any more */
export const EXPORT_PROVIDER_KEY_CLEANUP_TASK_TYPE = 'endpoint:export-provider-key-cleanup';

/**
 * A key object younger than this is never deleted by the cleanup task, and a reference to it is
 * accepted by the package policy update callback even before the stored policy holds it: the key
 * route creates the object first and references it from the policy a moment later.
 */
export const EXPORT_PROVIDER_KEY_MIN_AGE_MS = 60 * 60 * 1000;

/** Audit event actions */
export const EXPORT_PROVIDER_KEY_SET_AUDIT_ACTION = 'endpoint_export_provider_key_set';
export const EXPORT_PROVIDER_KEY_DELETE_AUDIT_ACTION = 'endpoint_export_provider_key_delete';
