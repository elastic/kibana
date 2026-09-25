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
import type { KibanaRequest } from '@kbn/core/server';

import type { ExceptionListClient } from '../../services/exception_lists/exception_list_client';
import type { ListClient } from '../../services/lists/list_client';
import type {
  ListsPluginRouter,
  ValueListReferencingRule,
  ValueListReferencingRules,
  ValueListRuleScanner,
} from '../../types';
import { buildSiemResponse } from '../utils';
import { getExceptionListClient, getListClient } from '..';

import { restrictListWithChecks } from './restrict_list_route';
import { scanReferencingRules } from './value_list_references';

const warningMessage = (warning: ValueListReferencingRules, itemsIndex: string): string | null => {
  // The level is decided by indicator match rules alone, so the message lists only
  // those; rules that reference the list through an exception are reported separately.
  const ruleIdsFor = (reason: ValueListReferencingRule['reason']): string =>
    (warning.rules ?? [])
      .filter((rule) => rule.reason === reason)
      .map((rule) => rule.id)
      .join(', ');
  if (warning.level === 'referenced') {
    return `Indicator match rules read this list as a threat index through "${itemsIndex}" and now read a frozen copy until they are updated to read the list's concrete index: ${ruleIdsFor(
      'threat_index'
    )}`;
  }
  if (warning.level === 'maybe') {
    return `Some indicator match rules read "${itemsIndex}" as a threat index and may reference this list: ${ruleIdsFor(
      'threat_index_maybe'
    )}`;
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
/**
 * What a restrict right after the migration would check, evaluated before the list exists
 * as a lookup list, for a dry run: the caller must be able to read the concrete index the
 * list will have, and so must every referencing rule's API key. The same two blockers the
 * restrict endpoint applies.
 */
const restrictPreflight = async ({
  exceptionLists,
  force,
  id,
  itemsIndex,
  lists,
  request,
  scanner,
}: {
  exceptionLists: ExceptionListClient;
  force: boolean;
  id: string;
  itemsIndex: string;
  lists: ListClient;
  request: KibanaRequest;
  scanner: ValueListRuleScanner | undefined;
}): Promise<{ blocked: boolean; blockers: string[]; callerCanRead: boolean; index: string }> => {
  const { index } = lists.lookupNamesFor({ id });
  const [callerCanRead, restrictScan] = await Promise.all([
    lists.canReadIndex({ index }),
    scanReferencingRules({
      accessNames: [],
      exceptionLists,
      itemsIndex,
      listId: id,
      request,
      scanner,
      verifyReadOn: index,
    }),
  ]);
  const blockers: string[] = [];
  if (!callerCanRead) {
    blockers.push(`You cannot read "${index}", so restricting would remove your own access`);
  }
  const rulesWithoutRead = (restrictScan.rules ?? []).filter((rule) => rule.canRead === false);
  if (rulesWithoutRead.length > 0) {
    blockers.push(
      `${rulesWithoutRead.length} referencing rule(s) execute with an API key that cannot read "${index}"`
    );
  }
  return { blocked: blockers.length > 0 && !force, blockers, callerCanRead, index };
};

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
                dryRun: z.boolean().optional(),
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
          const { id, restrict = false, force = false, dryRun = false } = request.body;
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
          // Two findings block the migration unless the caller forces it: an exception
          // rule whose key cannot read the alias would fail at its next run, and an
          // indicator match rule reading the list through `.items` would keep matching a
          // frozen copy. An exception rule whose key can read the alias is reported in
          // the response and blocks nothing.
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
          // An indicator match rule that names this list, or a scan that failed, blocks.
          // A rule that reads `.items` without naming the list (`maybe`) is a warning
          // only: every such rule would otherwise block every migration in the space and
          // train callers to pass `force`, which also disables the key check.
          const threatIndexWarning = warningMessage(warning, itemsIndex);
          if (threatIndexWarning != null && warning.level !== 'maybe') {
            blockers.push(`${threatIndexWarning}.`);
          }
          // A value the lookup grammar refuses blocks too. Every such value is listed, so
          // the caller can fix them in one pass or force the migration, which leaves them
          // out of the lookup list and reports them; the legacy rows are never touched.
          // Cheap checks first: the rule scan touches a handful of rules, the value scan
          // reads every item. A plain call that the rules already block stops here; a dry
          // run wants the whole report and a forced call copies anyway, so both go on.
          if (blockers.length > 0 && !force && !dryRun) {
            return response.customError({
              body: {
                // the same shape as the later 409; the value scan did not run, so null
                attributes: {
                  id,
                  referencingRules: warning,
                  rejectedValues: null,
                  warningLevel: warning.level,
                },
                message: `Migration is blocked: ${blockers.join(
                  ' '
                )} Pass force to migrate anyway, or dryRun to see the full report.`,
              },
              statusCode: 409,
            });
          }
          // The scan counts while it streams and keeps a sample, so a list with millions
          // of such values costs no memory and the response stays small.
          const rejectedValues = await lists.findRejectedLegacyValues({ id });
          if (rejectedValues.count > 0) {
            const shown = rejectedValues.sample.slice(0, 20).map((value) => `"${value}"`);
            const more = rejectedValues.count > shown.length ? ', ...' : '';
            blockers.push(
              `${
                rejectedValues.count
              } value(s) are not accepted spellings for this list type and would be left out: ${shown.join(
                ', '
              )}${more}. Edit them first, or pass force to migrate without them.`
            );
          }
          const report = {
            id,
            referencingRules: warning,
            rejectedValues,
            warning: warningMessage(warning, itemsIndex),
            warningLevel: warning.level,
          };
          // A dry run reports what a real call would do and changes nothing, including
          // the restrict checks when the caller asked for a restrict.
          if (dryRun) {
            // The list is still legacy here, so the restrict endpoint's own check cannot
            // run; its two blockers are evaluated against the concrete index the list will
            // have: the caller must be able to read it, and so must every referencing
            // rule's API key.
            const restriction = restrict
              ? await restrictPreflight({
                  exceptionLists,
                  force,
                  id,
                  itemsIndex,
                  lists,
                  request,
                  scanner,
                })
              : undefined;
            return response.ok({
              body: {
                ...report,
                blocked: blockers.length > 0 && !force,
                blockers,
                dryRun: true,
                restriction,
              },
            });
          }
          if (blockers.length > 0 && !force) {
            return response.customError({
              body: {
                attributes: report,
                message: `Migration is blocked: ${blockers.join(
                  ' '
                )} Pass force to migrate anyway.`,
              },
              statusCode: 409,
            });
          }

          const migration = await lists.migrateListToLookup({ force, id });

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

          // The list is migrated either way; a blocked restrict is reported as such rather
          // than folded into a 200, so the caller knows the list is still shared.
          if (restriction != null && restriction.statusCode !== 200) {
            return response.customError({
              body: {
                attributes: {
                  id,
                  migration,
                  referencingRules: warning,
                  restriction: restriction.body,
                  warningLevel: warning.level,
                },
                message: `Migrated, but not restricted. ${restriction.body.message ?? ''}`.trim(),
              },
              statusCode: restriction.statusCode,
            });
          }

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
