/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { SmlTypeDefinition } from '@kbn/agent-builder-sml-plugin/server';
import { kibanaPermissions } from '@kbn/agent-builder-sml-plugin/server';
import { RULE_SAVED_OBJECT_TYPE } from '@kbn/alerting-plugin/server';
import { DETECTION_RULE_SML_TYPE } from '@kbn/security-solution-features/constants';
import { SecurityAgentBuilderAttachments, SERVER_APP_ID } from '../../../common/constants';
import { ruleAttachmentDataSchema } from '../attachments/rule';

/** SML record type id. The semantic rule tool filters on this. */
export { DETECTION_RULE_SML_TYPE };

/**
 * Only security detection rules, never every alerting rule in the deployment.
 * `consumer` is the cheapest discriminator: every detection rule is created with
 * `consumer: 'siem'`, and it is a top-level indexed attribute, unlike `params`.
 */
const SIEM_RULES_FILTER = `${RULE_SAVED_OBJECT_TYPE}.attributes.consumer: ${SERVER_APP_ID}`;

/**
 * The crawler holds one page in memory at a time, so this bounds memory, not total
 * coverage: every page is still enumerated.
 */
const PAGE_SIZE = 500;

/**
 * Matches the Alerting v2 rule type. A pass only enumerates rules and diffs `updated_at`;
 * inference runs for new and changed rules alone, so a frequent pass costs a saved-object
 * scan and no ML work. Freshness is what a coverage check actually needs: a rule created
 * one turn ago must be findable on the next, not up to a quarter of an hour later.
 */
const FETCH_FREQUENCY = '1m';

/** Keep indexed content bounded: a rule query can be thousands of characters. */
const MAX_QUERY_CHARS = 2000;
const MAX_DESCRIPTION_CHARS = 2000;

interface DetectionRuleAttributes {
  name?: string;
  enabled?: boolean;
  tags?: string[];
  alertTypeId?: string;
  params?: {
    description?: string;
    query?: string;
    index?: string[];
    ruleId?: string;
    type?: string;
    severity?: string;
    threat?: Array<{
      tactic?: { id?: string; name?: string };
      technique?: Array<{ id?: string; name?: string; subtechnique?: Array<{ id?: string }> }>;
    }>;
  };
}

const truncate = (value: string | undefined, max: number): string =>
  !value ? '' : value.length > max ? `${value.slice(0, max)}…` : value;

/** Flatten `threat` into the ATT&CK ids a coverage question is usually phrased with. */
const collectMitreIds = (attrs: DetectionRuleAttributes): string[] => {
  const ids = new Set<string>();
  for (const entry of attrs.params?.threat ?? []) {
    if (entry.tactic?.id) ids.add(entry.tactic.id);
    for (const technique of entry.technique ?? []) {
      if (technique.id) ids.add(technique.id);
      for (const sub of technique.subtechnique ?? []) {
        if (sub.id) ids.add(sub.id);
      }
    }
  }
  return [...ids];
};

interface CreateDetectionRuleSmlTypeOptions {
  /**
   * Resolved per call, not captured once: registration happens at setup, but the hooks
   * only run at crawl time, when the saved-objects service is started.
   */
  getInternalRepository: () => Promise<ISavedObjectsRepository>;
}

/**
 * Makes installed security detection rules semantically searchable.
 *
 * Why this exists: rule saved objects store `params` as a `flattened` field, so a rule
 * `description` indexes as an exact, case-sensitive keyword. Lexical search therefore
 * only ever matches the words a rule literally uses, and misses a rule that describes
 * the same behavior in different words. SML owns the `semantic_text` index and the
 * inference endpoint, so this type only has to say what to index.
 *
 * Cost note: the crawler diffs `updated_at` per item and skips unchanged ones, so
 * inference runs once per rule and then only when that rule is edited.
 */
export const createDetectionRuleSmlType = ({
  getInternalRepository,
}: CreateDetectionRuleSmlTypeOptions): SmlTypeDefinition => ({
  id: DETECTION_RULE_SML_TYPE,
  fetchFrequency: () => FETCH_FREQUENCY,

  async *list() {
    const repository = await getInternalRepository();
    const finder = repository.createPointInTimeFinder<DetectionRuleAttributes>({
      type: RULE_SAVED_OBJECT_TYPE,
      filter: SIEM_RULES_FILTER,
      perPage: PAGE_SIZE,
      namespaces: ['*'],
      // Only the crawler's change-detection keys are needed here; the entry hook
      // re-reads the rule it actually has to index.
      fields: [],
    });

    try {
      for await (const response of finder.find()) {
        yield response.saved_objects.map((so) => ({
          id: so.id,
          updatedAt: so.updated_at ?? new Date().toISOString(),
          spaces: so.namespaces ?? ['default'],
        }));
      }
    } finally {
      await finder.close();
    }
  },

  getSmlEntry: async (originId, context) => {
    try {
      const repository = await getInternalRepository();
      const so = await repository.get<DetectionRuleAttributes>(RULE_SAVED_OBJECT_TYPE, originId);
      const attrs = so.attributes ?? {};
      const params = attrs.params ?? {};
      const name = attrs.name ?? originId;
      const mitreIds = collectMitreIds(attrs);

      // The content is what gets embedded, so it carries the three things a coverage
      // judgement runs on: what the rule is called, what it says it detects, and the
      // query that is the ground truth of it.
      const contentParts = [
        name,
        truncate(params.description, MAX_DESCRIPTION_CHARS),
        truncate(params.query, MAX_QUERY_CHARS),
        (params.index ?? []).join(', '),
        mitreIds.join(', '),
        (attrs.tags ?? []).join(', '),
      ].filter(Boolean);

      return {
        type: DETECTION_RULE_SML_TYPE,
        title: name,
        content: contentParts.join('\n'),
        description: truncate(params.description, MAX_DESCRIPTION_CHARS),
        tags: attrs.tags ?? [],
      };
    } catch (error) {
      context.logger.warn(
        `SML detection rule: failed to read '${originId}': ${(error as Error).message}`
      );
      return undefined;
    }
  },

  /**
   * Rule content is not public within a space, so this hook is mandatory: it is the
   * only thing that attaches an access gate to the indexed entry. The standard helper
   * emits the AI-index read privilege rather than a hand-written action string.
   */
  getPermissions: () => kibanaPermissions({ kiType: DETECTION_RULE_SML_TYPE }),

  /**
   * Attaching a rule to a conversation is already modelled by the security rule
   * attachment, whose payload is the stringified rule.
   */
  toAttachment: async (item) => {
    try {
      const repository = await getInternalRepository();
      const so = await repository.get<DetectionRuleAttributes>(
        RULE_SAVED_OBJECT_TYPE,
        item.origin_id ?? ''
      );
      return {
        type: SecurityAgentBuilderAttachments.rule,
        data: ruleAttachmentDataSchema.parse({
          text: JSON.stringify({ id: so.id, name: so.attributes?.name, ...so.attributes?.params }),
          attachmentLabel: so.attributes?.name,
        }),
      };
    } catch {
      // A rule that vanished between crawl and attach is not an error worth raising:
      // returning undefined simply means it cannot be attached.
      return undefined;
    }
  },
});
