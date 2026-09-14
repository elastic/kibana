/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { LISTS_API_ALL } from '@kbn/security-solution-features/constants';

import type {
  ListsPluginRouter,
  ValueListMigrationReferencingRules,
  ValueListMigrationRuleScanner,
} from '../../types';
import { buildSiemResponse } from '../utils';
import { getListClient } from '..';

const warningMessage = (
  warning: ValueListMigrationReferencingRules,
  itemsIndex: string
): string | null => {
  const ruleIds = (warning.ruleIds ?? []).join(', ');
  if (warning.level === 'referenced') {
    return `Indicator match rules reference this list as a threat index and now read a frozen copy of it until they are repointed at the new index: ${ruleIds}`;
  }
  if (warning.level === 'maybe') {
    return `Some indicator match rules read "${itemsIndex}" as a threat index and may reference this list: ${ruleIds}`;
  }
  if (warning.level === 'unverified') {
    return `Could not verify whether any rules reference this list. Review rules that use "${itemsIndex}" as a threat index by hand.`;
  }
  return null;
};

/**
 * POC: migrate a legacy value list into its own lookup index (non-destructive), then
 * warn about detection rules that reference it. The rule scan is supplied by a
 * consumer (the security solution) through the setup contract, so this plugin stays
 * decoupled from alerting; if none is registered, no warning is produced. The scan
 * never fails the migration.
 */
export const migrateListRoute = (
  router: ListsPluginRouter,
  getMigrationRuleScanner: () => ValueListMigrationRuleScanner | undefined
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/lists/_migrate',
      security: {
        authz: {
          requiredPrivileges: [LISTS_API_ALL],
        },
      },
    })
    .addVersion(
      {
        validate: {
          request: {
            body: buildRouteValidationWithZod(z.object({ id: z.string().max(1024) })),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id } = request.body;
          const lists = await getListClient(context);
          const itemsIndex = lists.getListItemName();

          const migration = await lists.migrateListToLookup({ id });

          const scanner = getMigrationRuleScanner();
          let warning: ValueListMigrationReferencingRules = { level: 'none' };
          if (scanner != null) {
            try {
              warning = await scanner({ itemsIndex, listId: id, request });
            } catch {
              warning = { level: 'unverified' };
            }
          }

          return response.ok({
            body: {
              id,
              migration,
              warning: warningMessage(warning, itemsIndex),
              warningLevel: warning.level,
            },
          });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );
};
