/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { KibanaRequest } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';
import { LISTS_API_ALL } from '@kbn/security-solution-features/constants';

import type { ExceptionListClient } from '../../services/exception_lists/exception_list_client';
import type { ListClient } from '../../services/lists/list_client';
import { lookupAliasOf, lookupIndexOf } from '../../services/lookup';
import type {
  ListsPluginRouter,
  ValueListReferencingRules,
  ValueListRuleScanner,
} from '../../types';
import { buildSiemResponse } from '../utils';
import { getExceptionListClient, getListClient } from '..';

import { scanReferencingRules } from './value_list_references';

export interface RestrictListResult {
  access: 'shared' | 'restricted';
  alias: string | undefined;
  callerCanRead: boolean;
  changed: boolean;
  dryRun: boolean;
  id: string;
  index: string;
  message: string | null;
  referencingRules: ValueListReferencingRules;
}

const remedy = (index: string): string =>
  `Grant read on "${index}" to the roles that must keep reading this list, then save each referencing rule (or use the update API key action) so its API key is refreshed. Disabling and enabling a rule keeps its key`;

/**
 * Restrict a lookup list to explicit grants on its concrete index.
 *
 * Verification runs before any change: the caller must be able to read the concrete
 * index, or they would lose access to the list, and every referencing rule's API key
 * is checked for read on the concrete index, since the rule executes with that key
 * and a role edit does not reach an existing key. A caller without read, or a rule
 * whose key cannot read, blocks the restrict unless `force` is set. `dryRun` returns
 * the report and changes nothing.
 */
export const restrictListWithChecks = async ({
  dryRun,
  exceptionLists,
  force,
  id,
  lists,
  request,
  scanner,
}: {
  dryRun: boolean;
  exceptionLists: ExceptionListClient;
  force: boolean;
  id: string;
  lists: ListClient;
  request: KibanaRequest;
  scanner: ValueListRuleScanner | undefined;
}): Promise<{ body: RestrictListResult; statusCode: 200 | 409 }> => {
  const list = await lists.getList({ id });
  const index = list != null ? lookupIndexOf(list) : undefined;
  if (list == null || index == null) {
    throw Object.assign(new Error(`list "${id}" is not a lookup list`), {
      statusCode: list == null ? 404 : 400,
    });
  }
  const alias = lookupAliasOf(list);
  const itemsIndex = lists.getListItemName();

  const [callerCanRead, referencingRules] = await Promise.all([
    lists.canReadIndex({ index }),
    scanReferencingRules({
      accessNames: [alias, index].filter((name): name is string => name != null),
      exceptionLists,
      itemsIndex,
      listId: id,
      request,
      scanner,
      verifyReadOn: index,
    }),
  ]);

  const base = {
    alias,
    callerCanRead,
    id,
    index,
    referencingRules,
  };

  if (alias == null) {
    return {
      body: { ...base, access: 'restricted', changed: false, dryRun, message: null },
      statusCode: 200,
    };
  }

  const rules = referencingRules.rules ?? [];
  const rulesWithoutRead = rules.filter((rule) => rule.canRead === false);
  const blockers: string[] = [];
  if (!callerCanRead) {
    blockers.push(`You cannot read "${index}", so restricting would remove your own access`);
  }
  if (rulesWithoutRead.length > 0) {
    const names = rulesWithoutRead
      .map((rule) => `"${rule.name}" (owner ${rule.apiKeyOwner ?? 'unknown'})`)
      .join(', ');
    blockers.push(
      `${rulesWithoutRead.length} referencing rule(s) execute with an API key that cannot read "${index}": ${names}`
    );
  }
  const ruleNote = rules.length > 0 ? ` ${rules.length} rule(s) reference this list.` : '';
  const remedyNote = rulesWithoutRead.length > 0 ? ` ${remedy(index)}.` : '';

  if (dryRun) {
    return {
      body: {
        ...base,
        access: 'shared',
        changed: false,
        dryRun,
        message:
          blockers.length === 0
            ? `Restricting removes alias "${alias}". Only roles that grant read on "${index}" keep access.${ruleNote}`
            : `Restricting is blocked: ${blockers.join(
                '; '
              )}.${remedyNote} Pass force to restrict anyway.`,
      },
      statusCode: 200,
    };
  }

  if (blockers.length > 0 && !force) {
    return {
      body: {
        ...base,
        access: 'shared',
        changed: false,
        dryRun,
        message: `Restricting is blocked: ${blockers.join(
          '; '
        )}.${remedyNote} Pass force to restrict anyway.`,
      },
      statusCode: 409,
    };
  }

  const { changed } = await lists.restrictList({ id });
  return {
    body: {
      ...base,
      access: 'restricted',
      alias: undefined,
      changed,
      dryRun,
      message: `${ruleNote}${remedyNote}`.trim() || null,
    },
    statusCode: 200,
  };
};

/**
 * POC: restrict a lookup list to explicit grants on its concrete index, or return it to
 * the shared state. Restrict verifies first; un-restrict only widens access and needs
 * no verification.
 */
export const restrictListRoute = (
  router: ListsPluginRouter,
  getRuleScanner: () => ValueListRuleScanner | undefined
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: '/internal/lists/_restrict',
      security: { authz: { requiredPrivileges: [LISTS_API_ALL] } },
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
              })
            ),
          },
        },
        version: '1',
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { id, dryRun = false, force = false } = request.body;
          const [lists, exceptionLists] = await Promise.all([
            getListClient(context),
            getExceptionListClient(context),
          ]);
          const { body, statusCode } = await restrictListWithChecks({
            dryRun,
            exceptionLists,
            force,
            id,
            lists,
            request,
            scanner: getRuleScanner(),
          });
          // An error response carries the report under `attributes`, since Kibana error
          // bodies are `{ message, attributes }`.
          return statusCode === 200
            ? response.ok({ body })
            : response.customError({
                body: { attributes: body, message: body.message ?? 'restrict blocked' },
                statusCode,
              });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );

  router.versioned
    .post({
      access: 'internal',
      path: '/internal/lists/_unrestrict',
      security: { authz: { requiredPrivileges: [LISTS_API_ALL] } },
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
          const result = await lists.unrestrictList({ id });
          return response.ok({ body: { access: 'shared', id, ...result } });
        } catch (err) {
          const error = transformError(err);
          return siemResponse.error({ body: error.message, statusCode: error.statusCode });
        }
      }
    );
};
