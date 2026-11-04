/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WebhookMode } from '../flyouts/form/automation_form_values';

/** A payload the webhook of this mode accepts, for the form's help text and the example `curl`. */
export const getWebhookExamplePayload = (mode: WebhookMode): string =>
  mode === 'alert'
    ? JSON.stringify({ id: 'disk-full-web-1', name: 'Disk almost full on web-1', status: 'active' })
    : JSON.stringify({ message: 'Something happened' });
