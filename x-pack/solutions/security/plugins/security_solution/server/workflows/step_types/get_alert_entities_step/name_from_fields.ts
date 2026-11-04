/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstString } from './first_string';
import { stripUnsafeCharacters } from './strip_unsafe_characters';
import type { AlertEntityType } from './types';

const LOCAL_USER_SUFFIX = '@local';

/**
 * A name part from an alert field, with control and bidi characters removed: whoever controls
 * the logs controls these values, and they go into the agent's context.
 */
const namePart = (value: unknown): string | undefined => {
  const part = firstString(value);
  const stripped = part == null ? '' : stripUnsafeCharacters(part);

  return stripped === '' ? undefined : stripped;
};

/**
 * The display name the Entity Store gives an entity, from the fields of its most recent alert:
 * a host is its `host.name`; a service is its `service.name`; a user whose id is in the `local`
 * namespace is `user.name@host.name` (just `user.name` without a host name); any other user is
 * its `user.name`. A user identified by email or id alone has no `user.name`, so no name.
 */
export const nameFromFields = ({
  entityId,
  entityType,
  fields,
}: {
  entityId: string;
  entityType: AlertEntityType;
  fields: Record<string, unknown> | undefined;
}): string | undefined => {
  if (fields == null) {
    return undefined;
  }

  if (entityType === 'host') {
    return namePart(fields['host.name']);
  }

  if (entityType === 'service') {
    return namePart(fields['service.name']);
  }

  const userName = namePart(fields['user.name']);
  const hostName = namePart(fields['host.name']);

  return userName != null && hostName != null && entityId.endsWith(LOCAL_USER_SUFFIX)
    ? `${userName}@${hostName}`
    : userName;
};
