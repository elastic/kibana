/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { SavedObject, SavedObjectsClientContract } from '@kbn/core/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, nodeTypes } from '@kbn/es-query';
import { initPromisePool } from '../../../../utils/promise_pool';
import type {
  PreviewRuleGroupRequestBody,
  PreviewRuleGroupResponse,
  RuleGroup,
  RuleGroupDefinition,
} from '../../../../../common/api/detection_engine/rule_groups';
import { findRules } from '../../rule_management/logic/search/find_rules';
import { RULE_GROUP_SO_TYPE, type RuleGroupAttributes } from '../saved_object/rule_group_type';
import {
  RULE_SO_ID_FIELD,
  buildConditionsFilter,
  buildRuleGroupFilter,
} from './build_rule_group_filter';

const MAX_GROUPS = 200;
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

/**
 * Reads and writes rule groups for one request.
 * Shared groups (`visibility: space`) are visible to every user who can read rules. Private groups
 * are visible only to the user who created them (core `created_by`, the profile uid).
 * Write access to the saved object type comes from the rules feature privilege (rules `all`).
 */
export class RuleGroupsClient {
  constructor(
    private readonly soClient: SavedObjectsClientContract,
    private readonly rulesClient: RulesClient,
    private readonly currentUserUid: string | undefined
  ) {}

  async find({ withCounts }: { withCounts: boolean }): Promise<RuleGroup[]> {
    const visibility = `${RULE_GROUP_SO_TYPE}.attributes.visibility: space`;
    const { saved_objects: savedObjects } = await this.soClient.find<RuleGroupAttributes>({
      type: RULE_GROUP_SO_TYPE,
      perPage: MAX_GROUPS,
      filter: this.currentUserUid
        ? `${visibility} OR ${RULE_GROUP_SO_TYPE}.created_by: "${this.currentUserUid}"`
        : visibility,
    });
    const groups = savedObjects
      .map((so) => this.toRuleGroup(so))
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

  async get(id: string): Promise<RuleGroup> {
    const so = await this.soClient.get<RuleGroupAttributes>(RULE_GROUP_SO_TYPE, id);
    const group = this.toRuleGroup(so);
    if (group.visibility === 'private' && !group.is_owner) {
      // Do not tell other users that a private group exists.
      throw Boom.notFound(`Rule group ${id} not found`);
    }
    return group;
  }

  async create(definition: RuleGroupDefinition): Promise<RuleGroup> {
    this.assertCanOwnPrivateGroup(definition);
    await this.assertGroupCountBelowLimit();
    const so = await this.soClient.create<RuleGroupAttributes>(
      RULE_GROUP_SO_TYPE,
      this.toAttributes(definition)
    );
    return this.toRuleGroup(so);
  }

  async update(id: string, definition: RuleGroupDefinition, version?: string): Promise<RuleGroup> {
    const current = await this.get(id);
    this.assertCanOwnPrivateGroup(definition);
    if (definition.visibility !== current.visibility && !current.is_owner) {
      throw Boom.forbidden('Only the user who created a rule group can change its visibility');
    }
    // A full update: a merge would keep conditions that the user removed (nested objects merge).
    await this.soClient.update<RuleGroupAttributes>(
      RULE_GROUP_SO_TYPE,
      id,
      this.toAttributes(definition),
      { version: version ?? current.version, mergeAttributes: false }
    );
    return this.get(id);
  }

  async delete(id: string): Promise<void> {
    await this.get(id);
    await this.soClient.delete(RULE_GROUP_SO_TYPE, id);
  }

  /** The rule filter of a group that the current user can see. */
  async getFilter(id: string): Promise<KueryNode> {
    return buildRuleGroupFilter(await this.get(id));
  }

  async preview({
    page = 1,
    per_page: perPage = 12,
    ...membership
  }: PreviewRuleGroupRequestBody): Promise<PreviewRuleGroupResponse> {
    const groupFilter = buildRuleGroupFilter(membership);
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

  /** For each visible group: are all, some or none of the rules (saved object ids) in it. */
  async membership(ids: string[]): Promise<Array<{ id: string; state: 'all' | 'some' | 'none' }>> {
    const groups = await this.find({ withCounts: false });
    const rulesNode = bySoIds(ids);
    return Promise.all(
      groups.map(async (group) => {
        const inGroup = await this.count(nodeBuilder.and([buildRuleGroupFilter(group), rulesNode]));
        return {
          id: group.id,
          state: inGroup === 0 ? 'none' : inGroup >= ids.length ? 'all' : 'some',
        };
      })
    );
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
    const groupFilter = buildRuleGroupFilter(await this.get(id));
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

  private async countRules(
    group: RuleGroup
  ): Promise<{ rules_count: number; failed_count: number }> {
    const result = await findRules({
      rulesClient: this.rulesClient,
      filter: undefined,
      kueryFilter: buildRuleGroupFilter(group),
      page: 1,
      perPage: 0,
      sortField: undefined,
      sortOrder: undefined,
      aggregations: { outcomes: { terms: { field: LAST_RUN_OUTCOME_FIELD, size: 10 } } },
    });
    const buckets =
      (result.aggregations?.outcomes as { buckets?: Array<{ key: string; doc_count: number }> })
        ?.buckets ?? [];
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
  private assertCanOwnPrivateGroup({ visibility }: RuleGroupDefinition): void {
    if (visibility === 'private' && !this.currentUserUid) {
      throw Boom.badRequest(
        'Private rule groups need a user profile. Log in to Kibana to create one.'
      );
    }
  }

  private async assertGroupCountBelowLimit(): Promise<void> {
    const { total } = await this.soClient.find({ type: RULE_GROUP_SO_TYPE, perPage: 0 });
    if (total >= MAX_GROUPS) {
      throw Boom.badRequest(`A space can have at most ${MAX_GROUPS} rule groups`);
    }
  }

  private toAttributes(definition: RuleGroupDefinition): RuleGroupAttributes {
    const included = [...new Set(definition.included_rule_ids)];
    // A rule id cannot be picked and left out at the same time; picked wins.
    const excluded = [...new Set(definition.excluded_rule_ids)].filter(
      (id) => !included.includes(id)
    );
    return {
      name: definition.name,
      ...(definition.description ? { description: definition.description } : {}),
      visibility: definition.visibility,
      conditions: definition.conditions,
      included_rule_ids: included,
      excluded_rule_ids: excluded,
    };
  }

  private toDefinition(group: RuleGroup): RuleGroupDefinition {
    const { name, description, visibility, conditions, included_rule_ids, excluded_rule_ids } =
      group;
    return { name, description, visibility, conditions, included_rule_ids, excluded_rule_ids };
  }

  private toRuleGroup(so: SavedObject<RuleGroupAttributes>): RuleGroup {
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
