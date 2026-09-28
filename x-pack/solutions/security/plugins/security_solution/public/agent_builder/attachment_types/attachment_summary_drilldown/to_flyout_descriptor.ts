/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { SecurityAgentBuilderAttachments } from '../../../../common/constants';
import type { FlyoutDescriptor } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { FLYOUT_DESCRIPTOR_KIND } from '../../../flyout_v2/shared/url_state/flyout_v2_url_param';
import { normaliseEntityAttachment } from '../entity_attachment/payload';
import type { EntityAttachment, EntityAttachmentIdentifier } from '../entity_attachment/types';
import { parseRuleFromAttachment } from '../rule/helpers';
import type { RuleAttachment } from '../rule/helpers';
import { AGENT_BUILDER_ENTITY_CARD_SCOPE } from '../entity_explore_navigation';

/**
 * Index patterns the attachment payloads do not carry themselves. Resolved by the caller from the
 * data view manager and the active space, the same way the rest of the app resolves them.
 */
export interface DrilldownIndices {
  /** Detection alerts. A `security.alerts` batch stores ids only. */
  alertsIndex?: string;
  /** Attack discovery alerts. A `security.attack_discovery` payload stores no index either. */
  attacksIndex?: string;
}

/**
 * `security.alert` stores the alert as a JSON string of picked fields. The producers build it
 * from a fields map, so values arrive as arrays, but scalars are accepted too — the payload is
 * whatever wrote it, and a scalar id is still an id.
 */
const firstValue = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
};

const toDocumentDescriptor = (
  attachment: UnknownAttachment,
  alertsIndex: string | undefined
): FlyoutDescriptor | null => {
  const alert = (attachment.data as { alert?: unknown })?.alert;
  if (typeof alert !== 'string') {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(alert);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const { _id: id, _index: index } = parsed as Record<string, unknown>;
  const documentId = firstValue(id);
  if (!documentId) {
    return null;
  }

  const indexName = firstValue(index);
  if (indexName) {
    return { kind: FLYOUT_DESCRIPTOR_KIND.document, documentId, indexName };
  }

  // Not every producer records the backing index. The id alone still resolves against the alerts
  // pattern, which is what `documentFromPattern` is for.
  return alertsIndex
    ? { kind: FLYOUT_DESCRIPTOR_KIND.documentFromPattern, documentId, indexName: alertsIndex }
    : null;
};

const toEntityDescriptor = ({
  identifierType,
  identifier,
  entityStoreId,
}: EntityAttachmentIdentifier): FlyoutDescriptor | null => {
  const scopeId = AGENT_BUILDER_ENTITY_CARD_SCOPE;

  switch (identifierType) {
    case 'host':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.host,
        hostName: identifier,
        entityId: entityStoreId,
        scopeId,
      };
    case 'user':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.user,
        userName: identifier,
        entityId: entityStoreId,
        scopeId,
      };
    case 'service':
      return {
        kind: FLYOUT_DESCRIPTOR_KIND.service,
        serviceName: identifier,
        entityId: entityStoreId,
        scopeId,
      };
    default:
      // Unlike the named types, the generic entity flyout has no display-name lookup: it resolves
      // by `entity.id` (or a raw document id) alone, so without one there is nothing to open.
      return entityStoreId
        ? { kind: FLYOUT_DESCRIPTOR_KIND.genericEntity, entityId: entityStoreId, scopeId }
        : null;
  }
};

/**
 * Maps an attachment shown in the investigation flyout's attachment summary onto the flyout it
 * should open. Returns `null` when the payload cannot identify one, which leaves the row
 * read-only rather than opening an empty flyout.
 *
 * Where each identifier comes from, and why it is not simply a field read:
 *
 * | Type                       | Flyout needs        | Source                                     |
 * | -------------------------- | ------------------- | ------------------------------------------ |
 * | `security.alert`           | `_id` + `_index`    | parsed out of the `alert` JSON string       |
 * | `security.attack_discovery`| `_id` + index       | `origin` + the attacks data view            |
 * | `security.rule`            | saved object id     | the serialised rule, else `origin`          |
 * | `security.entity`          | name, or `entity.id`| typed fields on the payload                 |
 *
 * Only `security.entity` states its identity in the schema. The alert and rule schemas declare
 * their payload as `z.string()`, so a producer that writes prose instead of JSON validates
 * cleanly and simply cannot be drilled into — the row stays read-only. Giving those types
 * structured identity fields is the fix, and it belongs with the attachment types rather than
 * here.
 */
export const toFlyoutDescriptor = (
  attachment: UnknownAttachment,
  { alertsIndex, attacksIndex }: DrilldownIndices = {}
): FlyoutDescriptor | null => {
  switch (attachment.type) {
    case SecurityAgentBuilderAttachments.alert:
      return toDocumentDescriptor(attachment, alertsIndex);

    // `security.alerts` is absent on purpose: a batch names a set of alerts and no flyout shows a
    // set, so it registers no drill-down and never reaches this mapper.

    case SecurityAgentBuilderAttachments.attackDiscovery:
      // `origin` is the persisted document id (`kibana.alert.uuid`); `data.id` is the LLM's own
      // UUID and does not resolve against the index.
      return attachment.origin && attacksIndex
        ? {
            kind: FLYOUT_DESCRIPTOR_KIND.attack,
            attackId: attachment.origin,
            indexName: attacksIndex,
          }
        : null;

    case SecurityAgentBuilderAttachments.rule: {
      // The flyout fetches by saved object id, and producers disagree on where that lives. Most
      // serialise the whole rule, so the id is in the payload; the rule-creation flows strip ids
      // out of it and keep identity on `origin` instead. Reading the payload first matters
      // because the one producer that puts a `rule_id` signature on `origin` — by-reference
      // creation — has its rule resolved server-side, so the payload already carries the id and
      // the fallback is never reached.
      const ruleId = parseRuleFromAttachment(attachment as RuleAttachment)?.id ?? attachment.origin;
      return ruleId ? { kind: FLYOUT_DESCRIPTOR_KIND.rule, ruleId } : null;
    }

    case SecurityAgentBuilderAttachments.entity: {
      const entities = normaliseEntityAttachment(attachment as EntityAttachment)?.entities;
      // Same reasoning as an alert batch: a multi-entity attachment names no single destination.
      return entities?.length === 1 ? toEntityDescriptor(entities[0]) : null;
    }

    default:
      return null;
  }
};

/**
 * Stand-ins for the two index patterns the environment supplies. They let the check below reuse
 * the mapper as-is, so the question it answers is only ever "does this payload identify
 * something" — never "has the data view loaded yet".
 */
const RESOLVED_ELSEWHERE: DrilldownIndices = {
  alertsIndex: 'resolved-at-open-time',
  attacksIndex: 'resolved-at-open-time',
};

/**
 * Whether the attachment carries enough to open a flyout at all. Answered by running the mapper
 * rather than by a parallel set of rules, so the two cannot disagree: a payload this rejects is
 * exactly a payload the drill-down would fail to open.
 */
export const hasDrilldownIdentity = (attachment: UnknownAttachment): boolean =>
  toFlyoutDescriptor(attachment, RESOLVED_ELSEWHERE) !== null;
