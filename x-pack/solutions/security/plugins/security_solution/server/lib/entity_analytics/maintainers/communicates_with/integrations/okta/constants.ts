/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function getIndexPattern(namespace: string): string {
  return `logs-okta.system-${namespace}`;
}

/**
 * Okta event actions where an actor (admin user) operates on a target user.
 * These events have User-type entries in okta.target, which the ingest pipeline
 * maps to user.target.{id,email,full_name} — real user entities in the entity store.
 */
export const OKTA_USER_ADMIN_EVENT_ACTIONS = [
  'user.lifecycle.create',
  'user.lifecycle.activate',
  'user.lifecycle.deactivate',
  'user.lifecycle.suspend',
  'user.lifecycle.unsuspend',
  'group.user_membership.add',
  'group.user_membership.remove',
  'application.user_membership.add',
  'application.user_membership.remove',
  'application.user_membership.change_username',
];
