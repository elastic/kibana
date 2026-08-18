/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Discriminator for user-edited metadata docs in the entity metadata data stream. */
export const SERVICE_METADATA_EVENT_ACTION = 'service_user_metadata' as const;

export type ServiceTier = 'critical' | 'standard' | 'internal';

export interface ServiceUserMetadata {
  owner?: string;
  tier?: ServiceTier;
  runbook_url?: string;
  notes?: string;
}

/** Shape of a doc in the entity metadata data stream. */
export interface ServiceUserMetadataDoc extends ServiceUserMetadata {
  '@timestamp': string;
  'event.kind': 'event';
  'event.action': typeof SERVICE_METADATA_EVENT_ACTION;
  'entity.id': string;
}
