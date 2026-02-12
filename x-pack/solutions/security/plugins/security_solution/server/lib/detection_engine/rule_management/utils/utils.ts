/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partition, isEmpty } from 'lodash/fp';
import pMap from 'p-map';
import { v4 as uuidv4 } from 'uuid';

import type { ActionsClient } from '@kbn/actions-plugin/server';
import type { FindResult, PartialRule } from '@kbn/alerting-plugin/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { RuleAction } from '@kbn/securitysolution-io-ts-alerting-types';

import type {
  InvestigationFields,
  RuleResponse,
  RuleAction as RuleActionSchema,
} from '../../../../../common/api/detection_engine/model/rule_schema';
import type {
  FindRulesResponse,
  RuleToImport,
} from '../../../../../common/api/detection_engine/rule_management';
import type { WarningSchema } from '../../../../../common/api/detection_engine';

import type { BulkError, OutputError } from '../../routes/utils';
import { createBulkErrorObject } from '../../routes/utils';
import type { InvestigationFieldsCombined, RuleAlertType, RuleParams } from '../../rule_schema';
import { hasValidRuleType } from '../../rule_schema';
import { internalRuleToAPIResponse } from '../logic/detection_rules_client/converters/internal_rule_to_api_response';
import type { BulkActionError } from '../api/rules/bulk_actions/bulk_actions_response';

type PromiseFromStreams = RuleToImport | Error;
const MAX_CONCURRENT_SEARCHES = 10;

export const getIdError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}): OutputError => {
  if (id != null) {
    return {
      message: `id: "${id}" not found`,
      statusCode: 404,
    };
  } else if (ruleId != null) {
    return {
      message: `rule_id: "${ruleId}" not found`,
      statusCode: 404,
    };
  } else {
    return {
      message: 'id or rule_id should have been defined',
      statusCode: 404,
    };
  }
};

export const transformAlertsToRules = (rules: RuleAlertType[]): RuleResponse[] => {
  return rules.map((rule) => internalRuleToAPIResponse(rule));
};

export const transformFindAlerts = (
  ruleFindResults: FindResult<RuleParams>,
  warnings?: WarningSchema[]
): FindRulesResponse => {
  return {
    page: ruleFindResults.page,
    perPage: ruleFindResults.perPage,
    total: ruleFindResults.total,
    data: ruleFindResults.data.map((rule) => {
      return internalRuleToAPIResponse(rule);
    }),
    ...(warnings && warnings.length > 0 ? { warnings } : {}),
  };
};

export const transform = (rule: PartialRule<RuleParams>): RuleResponse | null => {
  if (hasValidRuleType(rule)) {
    return internalRuleToAPIResponse(rule);
  }

  return null;
};

export const getTupleDuplicateErrorsAndUniqueRules = (
  rules: PromiseFromStreams[],
  isOverwrite: boolean
): [BulkError[], PromiseFromStreams[]] => {
  const { errors, rulesAcc } = rules.reduce(
    (acc, parsedRule) => {
      if (parsedRule instanceof Error) {
        acc.rulesAcc.set(uuidv4(), parsedRule);
      } else {
        const { rule_id: ruleId } = parsedRule;
        if (acc.rulesAcc.has(ruleId) && !isOverwrite) {
          acc.errors.set(
            uuidv4(),
            createBulkErrorObject({
              ruleId,
              statusCode: 400,
              message: `More than one rule with rule-id: "${ruleId}" found`,
            })
          );
        }
        acc.rulesAcc.set(ruleId, parsedRule);
      }

      return acc;
    }, // using map (preserves ordering)
    {
      errors: new Map<string, BulkError>(),
      rulesAcc: new Map<string, PromiseFromStreams>(),
    }
  );

  return [Array.from(errors.values()), Array.from(rulesAcc.values())];
};

// functions copied from here
// https://github.com/elastic/kibana/blob/4584a8b570402aa07832cf3e5b520e5d2cfa7166/src/core/server/saved_objects/import/lib/check_origin_conflicts.ts#L55-L57
const createQueryTerm = (input: string) => input.replace(/\\/g, '\\\\').replace(/\"/g, '\\"');
const createQuery = (type: string, id: string) =>
  `"${createQueryTerm(`${type}:${id}`)}" | "${createQueryTerm(id)}"`;

/**
 * Query for a saved object with a given origin id and replace the
 * id in the provided action with the _id from the query result
 * @param action
 * @param esClient
 * @returns
 */
export const swapActionIds = async (
  action: RuleAction,
  savedObjectsClient: SavedObjectsClientContract
): Promise<RuleAction | Error> => {
  try {
    const search = createQuery('action', action.id);
    const foundAction = await savedObjectsClient.find<RuleAction>({
      type: 'action',
      search,
      rootSearchFields: ['_id', 'originId'],
    });

    if (foundAction.saved_objects.length === 1) {
      return { ...action, id: foundAction.saved_objects[0].id };
    } else if (foundAction.saved_objects.length > 1) {
      return new Error(
        `Found two action connectors with originId or _id: ${action.id} The upload cannot be completed unless the _id or the originId of the action connector is changed. See https://www.elastic.co/docs/extend/kibana/saved-objects/share for more details`
      );
    }
    return action;
  } catch (exc) {
    return exc;
  }
};

/**
 * In 8.0 all saved objects made in a non-default space will have their
 * _id's regenerated. Security Solution rules have references to the
 * actions SO id inside the 'actions' param.
 * When users import these rules, we need to ensure any rule with
 * an action that has an old, pre-8.0 id will need to be updated
 * to point to the new _id for that action (alias_target_id)
 *
 * ex:
 * import rule.ndjson:
 * {
 *   rule_id: 'myrule_id'
 *   name: 'my favorite rule'
 *   ...
 *   actions:[{id: '1111-2222-3333-4444', group...}]
 * }
 *
 * In 8.0 the 'id' field of this action is no longer a reference
 * to the _id of the action (connector). Querying against the connector
 * endpoint for this id will yield 0 results / 404.
 *
 * The solution: If we query the .kibana index for '1111-2222-3333-4444' as an originId,
 * we should get the original connector back
 * (with the new, migrated 8.0 _id of 'xxxx-yyyy-zzzz-0000') and can then replace
 * '1111-2222-3333-4444' in the example above with 'xxxx-yyyy-zzzz-0000'
 * And the rule will then import successfully.
 * @param rules
 * @param savedObjectsClient SO client exposing hidden 'actions' SO type
 * @returns
 */
export const migrateLegacyActionsIds = async (
  rules: PromiseFromStreams[],
  savedObjectsClient: SavedObjectsClientContract,
  actionsClient: ActionsClient
): Promise<PromiseFromStreams[]> => {
  const isImportRule = (r: unknown): r is RuleToImport => !(r instanceof Error);

  const toReturn = await pMap(
    rules,
    async (rule) => {
      if (isImportRule(rule) && rule.actions != null && !isEmpty(rule.actions)) {
        // filter out system actions, since they were not part of any 7.x releases and do not need to be migrated
        const [systemActions, extActions] = partition<RuleAction>((action) =>
          actionsClient.isSystemAction(action.id)
        )(rule.actions);
        // can we swap the pre 8.0 action connector(s) id with the new,
        // post-8.0 action id (swap the originId for the new _id?)
        const newActions: Array<RuleAction | Error> = await pMap(
          (extActions as RuleAction[]) ?? [],
          (action: RuleAction) => swapActionIds(action, savedObjectsClient),
          { concurrency: MAX_CONCURRENT_SEARCHES }
        );

        // were there any errors discovered while trying to migrate and swap the action connector ids?
        const [actionMigrationErrors, newlyMigratedActions] = partition<RuleAction | Error, Error>(
          (item): item is Error => item instanceof Error
        )(newActions);

        if (actionMigrationErrors == null || actionMigrationErrors.length === 0) {
          return { ...rule, actions: [...newlyMigratedActions, ...systemActions] };
        }

        return [
          { ...rule, actions: [...newlyMigratedActions, ...systemActions] },
          new Error(
            JSON.stringify(
              createBulkErrorObject({
                ruleId: rule.rule_id,
                statusCode: 409,
                message: `${actionMigrationErrors.map((error: Error) => error.message).join(',')}`,
              })
            )
          ),
        ];
      }
      return rule;
    },
    { concurrency: MAX_CONCURRENT_SEARCHES }
  );
  return toReturn.flat();
};

/**
 * In ESS 8.10.x "investigation_fields" are mapped as string[].
 * For 8.11+ logic is added on read in our endpoints to migrate
 * the data over to it's intended type of { field_names: string[] }.
 * The SO rule type will continue to support both types until we deprecate,
 * but APIs will only support intended object format.
 * See PR 169061
 */
export const migrateLegacyInvestigationFields = (
  investigationFields: InvestigationFieldsCombined | undefined
): InvestigationFields | undefined => {
  if (investigationFields && Array.isArray(investigationFields)) {
    if (investigationFields.length) {
      return {
        field_names: investigationFields,
      };
    }

    return undefined;
  }

  return investigationFields;
};

export const separateActionsAndSystemAction = (
  actionsClient: ActionsClient,
  actions: RuleActionSchema[] | undefined
) =>
  !isEmpty(actions)
    ? partition((action: RuleActionSchema) => actionsClient.isSystemAction(action.id))(actions)
    : [[], actions];

export const createBulkActionError = ({
  message,
  statusCode,
  id,
}: {
  message: string;
  statusCode: number;
  id: string;
}): BulkActionError => {
  const error: Error & { statusCode?: number } = new Error(message);
  error.statusCode = statusCode;
  return {
    item: id,
    error,
  };
};
