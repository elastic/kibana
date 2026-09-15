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
  ValueListReferencingRules,
  ValueListRuleScanner,
} from '../../types';
import { buildSiemResponse } from '../utils';
import { getExceptionListClient, getListClient } from '..';

import { restrictListWithChecks } from './restrict_list_route';
import { scanReferencingRules } from './value_list_references';

const warningMessage = (warning: ValueListReferencingRules, itemsIndex: string): string | null => {
  const ruleIds = (warning.ruleIds ?? []).join(', ');
  if (warning.level === 'referenced') {
    return `Indicator match rules read this list as a threat index through "${itemsIndex}" and now read a frozen copy until they are updated to read the new alias: ${ruleIds}`;
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
 * warn about indicator match rules that read it through the shared `.items` stream.
 * Rules that reference the list through exceptions keep working with no change, since
 * the new alias sits under the `.items*` wildcard their API keys already hold. With
 * `restrict: true` the list is restricted right after migration, with the same
 * verification the restrict endpoint applies. Any finding of the referencing-rule scan
 * blocks the migration unless `force` is set.
 */
export const migrateListRoute = (
  router: ListsPluginRouter,
  getRuleScanner: () => ValueListRuleScanner | undefined
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
            body: buildRouteValidationWithZod(
              z.object({
                force: z.boolean().optional(),
                id: z.string().max(1024),
                restrict: z.boolean().optional(),
              })
            ),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id, restrict = false, force = false } = request.body;
          const [lists, exceptionLists] = await Promise.all([
            getListClient(context),
            getExceptionListClient(context),
          ]);
          const itemsIndex = lists.getListItemName();
          const scanner = getRuleScanner();
          const { alias } = lists.lookupNamesFor({ id });

          // Verify before copying anything: a rule that references the list through an
          // exception keeps working only if its API key can read the alias, which a
          // role holding the exact `.items-<space>` name cannot.
          const warning = await scanReferencingRules({
            accessNames: [],
            exceptionLists,
            itemsIndex,
            listId: id,
            request,
            scanner,
            verifyReadOn: alias,
          });
          // Any finding blocks the migration unless the caller forces it: a rule whose
          // key cannot read the alias would fail at its next run, and an indicator match
          // rule reading the list through `.items` would keep matching a frozen copy.
          const blockers: string[] = [];
          const rulesWithoutRead = (warning.rules ?? []).filter(
            (rule) => rule.reason === 'exception' && rule.canRead === false
          );
          if (rulesWithoutRead.length > 0) {
            const names = rulesWithoutRead
              .map((rule) => `"${rule.name}" (owner ${rule.apiKeyOwner ?? 'unknown'})`)
              .join(', ');
            blockers.push(
              `${rulesWithoutRead.length} referencing rule(s) execute with an API key that cannot read "${alias}": ${names}. Grant those roles read on ".items-<space-id>*" rather than the exact name, then save each rule so its key is refreshed.`
            );
          }
          const threatIndexWarning = warningMessage(warning, itemsIndex);
          if (threatIndexWarning != null) {
            blockers.push(`${threatIndexWarning}.`);
          }
          if (blockers.length > 0 && !force) {
            return response.customError({
              body: {
                attributes: { id, referencingRules: warning, warningLevel: warning.level },
                message: `Migration is blocked: ${blockers.join(
                  ' '
                )} Pass force to migrate anyway.`,
              },
              statusCode: 409,
            });
          }

          const migration = await lists.migrateListToLookup({ id });

          const restriction = restrict
            ? await restrictListWithChecks({
                dryRun: false,
                exceptionLists,
                force,
                id,
                lists,
                request,
                scanner,
              })
            : undefined;

          return response.ok({
            body: {
              id,
              migration,
              referencingRules: warning,
              restriction: restriction?.body,
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
