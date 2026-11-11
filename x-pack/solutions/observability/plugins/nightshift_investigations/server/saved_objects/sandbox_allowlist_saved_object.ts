/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { SavedObjectsType } from '@kbn/core/server';
import {
  MAX_SANDBOX_ALLOWLIST_HOSTS,
  MAX_SANDBOX_ALLOWLIST_RULE_LENGTH,
  validateSandboxAllowlist,
} from '../../common/sandbox_allowlist';

export const NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE = 'nightshift-sandbox-allowlist';

// Each space holds at most one sandbox allowlist object.
export const NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_ID = 'sandbox-allowlist';

export interface NightshiftSandboxAllowlistAttributes {
  hosts: string[];
}

const validateStoredAllowlist = (hosts: string[]): string | undefined => {
  const { hosts: normalized, errors } = validateSandboxAllowlist(hosts);
  if (errors.length > 0) {
    return errors.join('; ');
  }
  const isNormalized =
    normalized.length === hosts.length && normalized.every((host, index) => host === hosts[index]);
  return isNormalized
    ? undefined
    : 'must list unique, canonical lowercase egress firewall rules or hostnames';
};

export const nightshiftSandboxAllowlistAttributesSchemaV1 = schema.object({
  hosts: schema.arrayOf(schema.string({ maxLength: MAX_SANDBOX_ALLOWLIST_RULE_LENGTH }), {
    maxSize: MAX_SANDBOX_ALLOWLIST_HOSTS,
    validate: validateStoredAllowlist,
  }),
});

export const nightshiftSandboxAllowlistSavedObjectType: SavedObjectsType<NightshiftSandboxAllowlistAttributes> =
  {
    name: NIGHTSHIFT_SANDBOX_ALLOWLIST_SO_TYPE,
    hidden: true,
    namespaceType: 'single',
    mappings: {
      dynamic: false,
      properties: {},
    },
    management: {
      importableAndExportable: false,
    },
    modelVersions: {
      1: {
        changes: [],
        schemas: {
          create: nightshiftSandboxAllowlistAttributesSchemaV1,
          forwardCompatibility: nightshiftSandboxAllowlistAttributesSchemaV1.extends(
            {},
            { unknowns: 'ignore' }
          ),
        },
      },
    },
  };
