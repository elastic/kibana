/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { GapReasonType } from '@kbn/alerting-plugin/common/constants/gap_reason';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { initPromisePool } from '../../../../utils/promise_pool';
import type {
  GetRuleSetGapsSummaryRequestBody,
  GetRuleSetGapsSummaryResponse,
  PreviewRuleSetRequestBody,
  PreviewRuleSetResponse,
  RuleSet,
  RuleSetDefinition,
  RuleSetSummary,
} from '../../../../../common/api/detection_engine/rule_sets';
import { findRules } from '../../rule_management/logic/search/find_rules';
import { RULE_SET_SO_TYPE, type RuleSetAttributes } from '../saved_object/rule_set_type';
import {
  RULE_SO_ID_FIELD,
  buildConditionsFilter,
  buildRuleSetFilter,
} from './build_rule_set_filter';
import { normalizeRuleSetConditions } from '../../../../../common/detection_engine/rule_sets/rule_set_conditions';
import { termsBuckets } from './terms_buckets';

/** Shared sets of one space. */
const MAX_SHARED_SETS = 200;
/** Private sets of one user in one space. They do not count toward the shared limit. */
const MAX_PRIVATE_SETS_PER_USER = 50;
const MAX_SETS = MAX_SHARED_SETS + 1000;
const COUNT_CONCURRENCY = 5;
const ID_PAGE_SIZE = 1_000;
const MAX_RULES = 10_000;
const LAST_RUN_OUTCOME_FIELD = 'alert.attributes.lastRun.outcome';

const not = (node: KueryNode): KueryNode => nodeTypes.function.buildNode('not', node);
const bySoIds = (ids: string[]): KueryNode =>
  nodeBuilder.terms(
    RULE_SO_ID_FIELD,
    ids.map((id) => `alert:${id}`)
  );

const EMPTY_GAPS_SUMMARY: GetRuleSetGapsSummaryResponse['summary'] = {
  total_unfilled_duration_ms: 0,
  total_in_progress_duration_ms: 0,
  total_filled_duration_ms: 0,
  total_error_duration_ms: 0,
  total_duration_ms: 0,
  rules_by_gap_fill_status: { unfilled: 0, in_progress: 0, filled: 0, error: 0 },
};

type RuleSetWithCounts = RuleSet & { rules_count?: number; failed_count?: number };

const toSummary = ({
  included_rule_ids: included,
  excluded_rule_ids: excluded,
  ...rest
}: RuleSetWithCounts): RuleSetSummary => ({
  ...rest,
  included_rules_count: included.length,
  excluded_rules_count: excluded.length,
});

/**
 * Reads and writes rule sets for one request.
 * Shared groups (`visibility: space`) are visible to every user who can read rules. Private groups
 * are visible only to the user who created them (core `created_by`, the profile uid).
 * Write access to the saved object type comes from the rules feature privilege (rules `all`).
 */
export class RuleSetsClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly rulesClient: RulesClient,
    private readonly currentUserUid: string | undefined
  ) {}

  async find({ withCounts }: { withCounts: boolean }): Promise<RuleSetWithCounts[]> {
    const visibility = `${RULE_SET_SO_TYPE}.attributes.visibility: space`;
    const { saved_objects: savedObjects } = await this.soClient.find<RuleSetAttributes>({
      type: RULE_SET_SO_TYPE,
      perPage: MAX_SHARED_SETS + MAX_PRIVATE_SETS_PER_USER,
      filter: this.currentUserUid
        ? `${visibility} OR ${RULE_SET_SO_TYPE}.created_by: "${this.currentUserUid}"`
        : visibility,
    });
    const groups = savedObjects
      .map((so) => this.toRuleSet(so))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!withCounts) {
      return groups;
    }
    // One small count query per group. Saved objects aggregations cannot hold the group filters
    // (terms lists, search), so they cannot be one query. Limit the parallel queries instead.
    const { results, errors } = await initPromisePool({
      concurrency: COUNT_CONCURRENCY,
      items: groups,
      executor: async (group) => ({ ...group, ...(await this.countRules(group)) }),
    });
    if (errors.length) {
      throw errors[0].error;
    }
    const counted = new Map(results.map(({ item, result }) => [item.id, result]));
    return groups.map((group) => counted.get(group.id) ?? group);
  }

  /** The sets for lists: without the picked and left-out rule ids, which can be 10,000 each. */
  async list({ withCounts }: { withCounts: boolean }): Promise<RuleSetSummary[]> {
    return (await this.find({ withCounts })).map(toSummary);
  }

  async get(id: string): Promise<RuleSet> {
    const so = await this.soClient.get<RuleSetAttributes>(RULE_SET_SO_TYPE, id);
    const group = this.toRuleSet(so);
    if (group.visibility === 'private' && !group.is_owner) {
      // Do not tell other users that a private group exists.
      throw Boom.notFound(`Rule set ${id} not found`);
    }
    return group;
  }

  async create(definition: RuleSetDefinition): Promise<RuleSet> {
    this.assertCanOwnPrivateGroup(definition);
    await this.assertBelowLimit(definition.visibility);
    const so = await this.soClient.create<RuleSetAttributes>(
      RULE_SET_SO_TYPE,
      this.toAttributes(definition)
    );
    return this.toRuleSet(so);
  }

  async update(id: string, definition: RuleSetDefinition, version?: string): Promise<RuleSet> {
    const current = await this.get(id);
    this.assertCanOwnPrivateGroup(definition);
    if (definition.visibility !== current.visibility) {
      if (!current.is_owner) {
        throw Boom.forbidden('Only the user who created a rule set can change its visibility');
      }
      await this.assertBelowLimit(definition.visibility);
    }
    // A full update: a merge would keep conditions that the user removed (nested objects merge).
    await this.soClient.update<RuleSetAttributes>(
      RULE_SET_SO_TYPE,
      id,
      this.toAttributes(definition),
      { version: version ?? current.version, mergeAttributes: false }
    );
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.soClient.delete(RULE_SET_SO_TYPE, id);
  }

  /** The rule filter of a group that the current user can see. */
  async getFilter(id: string): Promise<KueryNode> {
    return buildRuleSetFilter(await this.get(id));
  }

  async preview({
    page = 1,
    per_page: perPage = 12,
    ...membership
  }: PreviewRuleSetRequestBody): Promise<PreviewRuleSetResponse> {
    const groupFilter = buildRuleSetFilter(membership);
    const conditions = buildConditionsFilter(membership.conditions);

    const [pageResult, byConditions] = await Promise.all([
      findRules({
        rulesClient: this.rulesClient,
        filter: undefined,
        kueryFilter: groupFilter,
        page,
        perPage,
        sortField: 'name',
        sortOrder: 'asc',
        fields: ['name', 'params.ruleId', 'params.type', 'params.severity'],
      }),
      conditions
        ? this.count(
            membership.excluded_rule_ids.length
              ? nodeBuilder.and([
                  conditions,
                  not(
                    nodeBuilder.terms(
                      'alert.attributes.params.ruleId',
                      membership.excluded_rule_ids
                    )
                  ),
                ])
              : conditions
          )
        : Promise.resolve(0),
    ]);

    const pageIds = pageResult.data.map((rule) => rule.id);
    const matchingConditions =
      conditions && pageIds.length
        ? await this.findIds(nodeBuilder.and([conditions, bySoIds(pageIds)]))
        : new Set<string>();
    const picked = new Set(membership.included_rule_ids);

    return {
      total: pageResult.total,
      by_conditions: byConditions,
      only_picked: pageResult.total - byConditions,
      rules: pageResult.data.map((rule) => {
        const byCondition = matchingConditions.has(rule.id);
        const isPicked = picked.has(rule.params.ruleId);
        return {
          id: rule.id,
          rule_id: rule.params.ruleId,
          name: rule.name,
          type: rule.params.type,
          severity: rule.params.severity,
          reason: byCondition && isPicked ? 'both' : byCondition ? 'conditions' : 'picked',
        };
      }),
    };
  }

  /** For each visible set: are all, some or none of the rules (saved object ids) in it. */
  async membership(ids: string[]): Promise<Array<{ id: string; state: 'all' | 'some' | 'none' }>> {
    const sets = await this.find({ withCounts: false });
    const rulesNode = bySoIds(ids);
    const { results, errors } = await initPromisePool({
      concurrency: COUNT_CONCURRENCY,
      items: sets,
      executor: async (set) => {
        const inSet = await this.count(nodeBuilder.and([buildRuleSetFilter(set), rulesNode]));
        return {
          id: set.id,
          state:
            inSet === 0
              ? ('none' as const)
              : inSet >= ids.length
              ? ('all' as const)
              : ('some' as const),
        };
      },
    });
    if (errors.length) {
      throw errors[0].error;
    }
    const byId = new Map(results.map(({ item, result }) => [item.id, result]));
    return sets.flatMap((set) => byId.get(set.id) ?? []);
  }

  /** Rule execution gaps of the rules of a set. The rule ids do not leave the server. */
  async getGapsSummary(
    {
      rule_set_id: ruleSetId,
      start,
      end,
      scheduler_id: schedulerId,
    }: GetRuleSetGapsSummaryRequestBody,
    excludedReasons: GapReasonType[]
  ): Promise<GetRuleSetGapsSummaryResponse> {
    const ruleIds = await this.getRuleIds(ruleSetId);
    // An empty id list would mean "all rules" to some callers; a set with no rules has no gaps.
    if (!ruleIds.length) {
      return { total: 0, summary: EMPTY_GAPS_SUMMARY };
    }
    const { total, latestGapTimestamp, summary } = await this.rulesClient.getRuleIdsWithGaps({
      start,
      end,
      excludedReasons,
      schedulerId,
      ruleIds,
    });
    return {
      total,
      ...(latestGapTimestamp != null && { latest_gap_timestamp: latestGapTimestamp }),
      summary: {
        total_unfilled_duration_ms: summary.totalUnfilledDurationMs,
        total_in_progress_duration_ms: summary.totalInProgressDurationMs,
        total_filled_duration_ms: summary.totalFilledDurationMs,
        total_error_duration_ms: summary.totalErrorDurationMs,
        total_duration_ms: summary.totalDurationMs,
        rules_by_gap_fill_status: {
          unfilled: summary.rulesByGapFillStatus.unfilled,
          in_progress: summary.rulesByGapFillStatus.inProgress,
          filled: summary.rulesByGapFillStatus.filled,
          error: summary.rulesByGapFillStatus.error,
        },
      },
    };
  }

  /**
   * Private sets of every user of the space, for an administrator who removes the sets of users
   * who left. The route checks the privilege; this method does not filter by owner.
   */
  async findAllPrivate(): Promise<RuleSetSummary[]> {
    const { saved_objects: savedObjects } = await this.soClient.find<RuleSetAttributes>({
      type: RULE_SET_SO_TYPE,
      perPage: MAX_SETS,
      filter: `${RULE_SET_SO_TYPE}.attributes.visibility: private`,
    });
    return savedObjects
      .map((so) => toSummary(this.toRuleSet(so)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Deletes a private set of any user. The route checks the administrator privilege. */
  async deletePrivate(id: string): Promise<void> {
    const so = await this.soClient.get<RuleSetAttributes>(RULE_SET_SO_TYPE, id);
    if (so.attributes.visibility !== 'private') {
      throw Boom.badRequest(`Rule set ${id} is shared; delete it with the rule sets API`);
    }
    await this.soClient.delete(RULE_SET_SO_TYPE, id);
  }

  /**
   * Adds rules to groups and removes rules from groups. The rules do not change.
   * Add: the rule leaves the left-out list, and is picked only if the conditions do not match it.
   * Remove: the rule is unpicked, and is left out if the conditions still match it.
   */
  async bulkAssign({
    ids,
    addTo = [],
    removeFrom = [],
  }: {
    ids: string[];
    addTo?: string[];
    removeFrom?: string[];
  }): Promise<string[]> {
    const rules = await findRules({
      rulesClient: this.rulesClient,
      filter: undefined,
      kueryFilter: bySoIds(ids),
      page: 1,
      perPage: MAX_RULES,
      sortField: undefined,
      sortOrder: undefined,
      fields: ['params.ruleId'],
    });
    const ruleIdBySoId = new Map(rules.data.map((rule) => [rule.id, rule.params.ruleId]));
    const soIds = [...ruleIdBySoId.keys()];

    const changes = [
      ...addTo.map((groupId) => ({ groupId, add: true })),
      ...removeFrom.map((groupId) => ({ groupId, add: false })),
    ];
    const updated: string[] = [];
    for (const { groupId, add } of changes) {
      const group = await this.get(groupId);
      const conditions = buildConditionsFilter(group.conditions);
      const matching = conditions
        ? await this.findIds(nodeBuilder.and([conditions, bySoIds(soIds)]))
        : new Set<string>();
      const included = new Set(group.included_rule_ids);
      const excluded = new Set(group.excluded_rule_ids);

      for (const [soId, ruleId] of ruleIdBySoId) {
        if (add) {
          excluded.delete(ruleId);
          if (!matching.has(soId)) included.add(ruleId);
        } else {
          included.delete(ruleId);
          if (matching.has(soId)) excluded.add(ruleId);
        }
      }

      await this.update(
        groupId,
        {
          ...this.toDefinition(group),
          included_rule_ids: [...included],
          excluded_rule_ids: [...excluded],
        },
        group.version
      );
      updated.push(groupId);
    }
    return updated;
  }

  /**
   * Saved object ids of all rules in a group, for APIs that take a rule id list (rule gaps).
   * Reads only ids, page by page, so it stays small for large groups.
   */
  async getRuleIds(id: string): Promise<string[]> {
    const groupFilter = buildRuleSetFilter(await this.get(id));
    const ids: string[] = [];
    for (let page = 1; ids.length < MAX_RULES; page++) {
      const result = await findRules({
        rulesClient: this.rulesClient,
        filter: undefined,
        kueryFilter: groupFilter,
        page,
        perPage: ID_PAGE_SIZE,
        sortField: undefined,
        sortOrder: undefined,
        fields: ['id'],
      });
      ids.push(...result.data.map((rule) => rule.id));
      if (result.data.length < ID_PAGE_SIZE) break;
    }
    return ids.slice(0, MAX_RULES);
  }

  private async countRules(group: RuleSet): Promise<{ rules_count: number; failed_count: number }> {
    const result = await findRules({
      rulesClient: this.rulesClient,
      filter: undefined,
      kueryFilter: buildRuleSetFilter(group),
      page: 1,
      perPage: 0,
      sortField: undefined,
      sortOrder: undefined,
      aggregations: { outcomes: { terms: { field: LAST_RUN_OUTCOME_FIELD, size: 10 } } },
    });
    const buckets = termsBuckets(result.aggregations, 'outcomes');
    return {
      rules_count: result.total,
      failed_count: buckets.find((bucket) => bucket.key === 'failed')?.doc_count ?? 0,
    };
  }

  private async count(kueryFilter: KueryNode): Promise<number> {
    const result = await findRules({
      rulesClient: this.rulesClient,
      filter: undefined,
      kueryFilter,
      page: 1,
      perPage: 0,
      sortField: undefined,
      sortOrder: undefined,
    });
    return result.total;
  }

  private async findIds(kueryFilter: KueryNode): Promise<Set<string>> {
    const result = await findRules({
      rulesClient: this.rulesClient,
      filter: undefined,
      kueryFilter,
      page: 1,
      perPage: MAX_RULES,
      sortField: undefined,
      sortOrder: undefined,
      fields: ['id'],
    });
    return new Set(result.data.map((rule) => rule.id));
  }

  /** Without a user profile (for example basic auth or an API key), nobody would own the group. */
  private assertCanOwnPrivateGroup({ visibility }: RuleSetDefinition): void {
    if (visibility === 'private' && !this.currentUserUid) {
      throw Boom.badRequest(
        'Private rule sets need a user profile. Log in to Kibana to create one.'
      );
    }
  }

  /** Shared sets count per space; private sets count per user, so other users' sets do not block. */
  private async assertBelowLimit(visibility: RuleSetDefinition['visibility']): Promise<void> {
    const visibilityFilter = `${RULE_SET_SO_TYPE}.attributes.visibility: ${visibility}`;
    const { total } = await this.soClient.find({
      type: RULE_SET_SO_TYPE,
      perPage: 0,
      filter:
        visibility === 'private'
          ? `${visibilityFilter} AND ${RULE_SET_SO_TYPE}.created_by: "${this.currentUserUid}"`
          : visibilityFilter,
    });
    const limit = visibility === 'private' ? MAX_PRIVATE_SETS_PER_USER : MAX_SHARED_SETS;
    if (total >= limit) {
      throw Boom.badRequest(
        visibility === 'private'
          ? `A user can have at most ${limit} private rule sets in a space`
          : `A space can have at most ${limit} shared rule sets`
      );
    }
  }

  private toAttributes(definition: RuleSetDefinition): RuleSetAttributes {
    const included = new Set(definition.included_rule_ids);
    // A rule id cannot be picked and left out at the same time; picked wins.
    const excluded = [...new Set(definition.excluded_rule_ids)].filter((id) => !included.has(id));
    return {
      name: definition.name,
      ...(definition.description ? { description: definition.description } : {}),
      visibility: definition.visibility,
      conditions: normalizeRuleSetConditions(definition.conditions),
      included_rule_ids: [...included],
      excluded_rule_ids: excluded,
    };
  }

  private toDefinition(group: RuleSet): RuleSetDefinition {
    const { name, description, visibility, conditions, included_rule_ids, excluded_rule_ids } =
      group;
    return { name, description, visibility, conditions, included_rule_ids, excluded_rule_ids };
  }

  private toRuleSet(so: SavedObject<RuleSetAttributes>): RuleSet {
    return {
      id: so.id,
      ...so.attributes,
      created_by: so.created_by,
      created_at: so.created_at,
      updated_at: so.updated_at,
      is_owner: so.created_by != null && so.created_by === this.currentUserUid,
      version: so.version ?? '',
    };
  }
}
