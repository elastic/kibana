/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { EntityType } from '@kbn/entity-store/common';
import type {
  ItemExpandPopoverListItemProps,
  SeparatorExpandPopoverListItemProps,
} from '../primitives/list_graph_popover';
import type { NodeViewModel } from '../../types';
import { RELATED_ENTITY, RELATED_HOST, RELATED_USER } from '../../../common/constants';
import {
  emitFilterToggle,
  emitEntityFilterToggle,
  isFilterActiveForScope,
  isEntityFilterActiveForScope,
} from '../../filters/filter_store';
import {
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID,
  GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_TOOLTIP_ID,
} from '../../test_ids';

/**
 * Extracts the entity type from a node ID (EUID).
 * EUID format: "user:...", "host:...", "service:...", or no prefix for generic entities.
 */
export const getEntityTypeFromNodeId = (nodeId: string): string => {
  const colonIndex = nodeId.indexOf(':');
  return colonIndex === -1 ? 'entity' : nodeId.substring(0, colonIndex);
};

/**
 * Transforms a field name to the correct namespace for the given role.
 * - 'actor' role: strips `.target.` if present (e.g., `user.target.id` → `user.id`)
 * - 'target' role: adds `.target.` if not present (e.g., `user.id` → `user.target.id`)
 */
export const fieldForRole = (field: string, role: 'actor' | 'target'): string => {
  // Normalize to actor namespace first
  const actorField = field.replace('.target.', '.');
  if (role === 'actor') return actorField;
  // Transform to target namespace
  const dotIndex = actorField.indexOf('.');
  if (dotIndex === -1) return actorField;
  return `${actorField.substring(0, dotIndex)}.target.${actorField.substring(dotIndex + 1)}`;
};

/**
 * Extracts sourceFields from the first document's entity.
 * After deduplication in parse_records, each entity ID has one document with merged
 * sourceFields — multi-value fields are arrays (e.g., user.id: ["id1", "id2"]).
 */
export const getSourceFieldsFromNode = (
  node: NodeViewModel
): Record<string, string | string[]> | undefined => {
  if ('documentsData' in node) {
    const documentsData = node.documentsData;
    if (Array.isArray(documentsData) && documentsData.length > 0) {
      return (
        documentsData[0] as {
          entity?: { sourceFields?: Record<string, string | string[]> };
        }
      ).entity?.sourceFields;
    }
  }
  return undefined;
};

/**
 * EUID API surface needed to build entity filters. Matches the shape returned by
 * `useEntityStoreEuidApi()?.euid`, which is async-hydrated and therefore nullable.
 */
export interface EuidFilterApi {
  dsl: {
    getEuidFilterBasedOnDocument: (entityType: EntityType, doc: unknown) => object | undefined;
  };
  getEuidNamespaceSourceFields: (entityType: EntityType) => {
    exactMatchFields: string[];
    prefixMatchFields: string[];
  };
}

/**
 * Maps an EUID prefix to the entity-store entity type. `getEntityTypeFromNodeId` returns
 * `entity` for unprefixed (generic) ids, which the entity store calls `generic`.
 */
const euidPrefixToEntityType = (prefix: string): EntityType =>
  (prefix === 'entity' ? 'generic' : prefix) as EntityType;

/**
 * The filter to emit for an entity role. `kql` is the precise form built from the Entity Store's
 * EUID logic; `fields` is the legacy fallback used until the EUID API's lazy chunk has loaded,
 * where each field/value pair becomes an OR'd phrase filter.
 */
export type EntityFilterSpec =
  | {
      kind: 'dsl';
      dsl: object;
      /** Raw namespace source field values for replacing prefix clauses with exact phrases. */
      namespaceSourceValues: Record<string, string | string[]>;
    }
  | { kind: 'fields'; fields: Record<string, string | string[]> };

/**
 * Namespace source fields describe the event, not the entity, so they must never become phrase
 * filters in the fallback path — `event.module: gcp` would match every GCP event.
 */
const NAMESPACE_SOURCE_FIELD_PREFIXES = ['event.', 'data_stream.', 'cloud.'];

const isIdentitySourceField = (field: string): boolean =>
  !NAMESPACE_SOURCE_FIELD_PREFIXES.some((prefix) => field.startsWith(prefix));

/**
 * Builds the filter matching events that resolve to the same entity as this node.
 *
 * Preferred form is the ES DSL from the Entity Store's own EUID logic
 * (`euid.dsl.getEuidFilterBasedOnDocument`): the node's `sourceFields` plus its EUID are handed
 * over as a pseudo-document, and the result carries the entity's identifying field at its EUID
 * ranking position, guards excluding the higher-ranked fields it fell through, and the namespace
 * clause rebuilt from the namespace source fields. A flat OR over `sourceFields` can express none
 * of those — see https://github.com/elastic/kibana/issues/262882.
 *
 * DSL rather than KQL so the result can be translated into ordinary Kibana filters (phrase /
 * exists / OR) instead of one opaque query string.
 *
 * `entity.id` is included because the `user` definition's pipeline gate accepts an
 * already-resolved entity id; without it the builder rejects a bag of identity fields.
 *
 * Falls back to the identity `sourceFields` when the EUID API has not hydrated yet or the entity's
 * identity cannot be resolved, so the action still works (with the previous, broader semantics)
 * rather than silently emitting nothing.
 */
export const getEntityFilterSpec = (
  nodeId: string,
  sourceFields: Record<string, string | string[]> | undefined,
  euidApi: EuidFilterApi | undefined,
  role: 'actor' | 'target'
): EntityFilterSpec | undefined => {
  if (!sourceFields || Object.keys(sourceFields).length === 0) return undefined;

  const dsl = buildEntityDsl(nodeId, sourceFields, euidApi, role);
  if (dsl) {
    // Ask the entity store which source fields are prefix-matched for this entity type so we
    // replace exactly those prefix clauses with observed exact values — no more, no less.
    const entityType = euidPrefixToEntityType(getEntityTypeFromNodeId(nodeId));
    const prefixFields = euidApi
      ? new Set(euidApi.getEuidNamespaceSourceFields(entityType).prefixMatchFields)
      : new Set<string>();
    const namespaceSourceValues = Object.fromEntries(
      Object.entries(sourceFields).filter(([field]) => prefixFields.has(field))
    );
    return { kind: 'dsl', dsl, namespaceSourceValues };
  }

  const identityFields = Object.fromEntries(
    Object.entries(sourceFields).filter(([field]) => isIdentitySourceField(field))
  );
  return Object.keys(identityFields).length > 0
    ? { kind: 'fields', fields: identityFields }
    : undefined;
};

const buildEntityDsl = (
  nodeId: string,
  sourceFields: Record<string, string | string[]>,
  euidApi: EuidFilterApi | undefined,
  role: 'actor' | 'target'
): object | undefined => {
  if (!euidApi) return undefined;

  const entityType = euidPrefixToEntityType(getEntityTypeFromNodeId(nodeId));

  // sourceFields keys are normalised to the actor namespace by the server. The builder reasons
  // over entity definitions, which are actor-namespaced too, so build in that namespace and
  // rewrite the identity field names in the resulting DSL for the target role.
  const doc: Record<string, string | string[]> = { ...sourceFields, 'entity.id': nodeId };

  let dsl: object | undefined;
  try {
    dsl = euidApi.dsl.getEuidFilterBasedOnDocument(entityType, doc);
  } catch {
    // Unknown entity type (EUID prefix not in the entity-store registry).
    return undefined;
  }
  if (!dsl || role === 'actor') return dsl;

  return rewriteDslFieldsForTargetRole(dsl);
};

/**
 * Rewrites identity field names in an EUID DSL tree to their `.target.` namespace equivalents.
 * Namespace source fields (`event.*`, `data_stream.*`, `cloud.*`) describe the event and have no
 * target-namespaced form, so they are left alone.
 */
const rewriteDslFieldsForTargetRole = (dsl: object): object => {
  const rewriteKeys = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewriteKeys);
    if (value === null || typeof value !== 'object') return value;

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
        // Clause bodies are keyed by field name (`term`, `prefix`) or carry it in `field`
        // (`exists`); both are handled by rewriting any key that looks like an identity field.
        const rewrittenKey = isIdentitySourceField(key) ? fieldForRole(key, 'target') : key;
        if (key === 'field' && typeof nested === 'string') {
          return [key, isIdentitySourceField(nested) ? fieldForRole(nested, 'target') : nested];
        }
        return [rewrittenKey, rewriteKeys(nested)];
      })
    );
  };

  return rewriteKeys(dsl) as object;
};

/**
 * Emits (or removes) the filter for an entity role, handling both the KQL and fallback forms.
 * Shared by the graph node popover and the grouped-entities flyout so they stay in step.
 */
export const toggleEntityFilterSpec = (
  scopeId: string,
  filterKey: string,
  spec: EntityFilterSpec,
  role: 'actor' | 'target',
  action: 'show' | 'hide'
): void => {
  if (spec.kind === 'dsl') {
    emitEntityFilterToggle(scopeId, filterKey, spec.dsl, action, spec.namespaceSourceValues);
    return;
  }
  for (const [field, value] of Object.entries(spec.fields)) {
    // Flatten string | string[] so each value gets its own OR'd phrase filter
    for (const one of ([] as string[]).concat(value)) {
      emitFilterToggle(scopeId, fieldForRole(field, role), one, action);
    }
  }
};

/** True when the filter described by `spec` is currently active. */
export const isEntityFilterSpecActive = (
  scopeId: string,
  filterKey: string,
  spec: EntityFilterSpec,
  role: 'actor' | 'target'
): boolean => {
  if (spec.kind === 'dsl') {
    return isEntityFilterActiveForScope(scopeId, filterKey);
  }
  return Object.entries(spec.fields).some(([field, value]) =>
    ([] as string[])
      .concat(value)
      .some((one) => isFilterActiveForScope(scopeId, fieldForRole(field, role), one))
  );
};

/**
 * Resolves the `related.*` field and values for the "Show related events" action.
 *
 * The entity type comes from the entity store's `engine_type` when enrichment succeeded, and
 * otherwise from the node's EUID prefix — without that fallback, unenriched entities (and any
 * enriched type other than user/host) fell through to a generic branch that filtered on the
 * calculated EUID, which appears in no event field and so matched nothing.
 *
 * `related.user` and `related.hosts` are ECS; `related.entity` is not, and is used for service
 * and generic entities because ECS defines no equivalent for them.
 */
export const getRelatedEventsFilter = (
  nodeId: string,
  sourceFields: Record<string, string | string[]> | undefined,
  engineType?: string
): { field: string; values: string[] } | undefined => {
  const type = engineType ?? getEntityTypeFromNodeId(nodeId);

  const valuesForPrefix = (prefix: string): string[] =>
    Object.entries(sourceFields ?? {})
      .filter(([field]) => field.startsWith(prefix))
      .flatMap(([, value]) => ([] as string[]).concat(value))
      .filter((value) => value !== '');

  const { field, values } =
    type === 'user'
      ? { field: RELATED_USER, values: valuesForPrefix('user.') }
      : type === 'host'
      ? { field: RELATED_HOST, values: valuesForPrefix('host.') }
      : type === 'service'
      ? { field: RELATED_ENTITY, values: valuesForPrefix('service.') }
      : { field: RELATED_ENTITY, values: valuesForPrefix('entity.') };

  // No usable values: emit nothing rather than a filter that cannot match.
  return values.length > 0 ? { field, values } : undefined;
};

/**
 * Pre-bound callbacks for entity filter actions in the expand popover.
 * The caller (use_entity_node_expand_popover) binds these with node-specific data
 * so getEntityExpandItems doesn't need to know about sourceFields or entity types.
 */
export interface EntityFilterActions {
  toggleEntityFilter: (role: 'actor' | 'target', action: 'show' | 'hide') => void;
  isEntityFilterActive: (role: 'actor' | 'target') => boolean;
  toggleRelatedEvents: (action: 'show' | 'hide') => void;
  isRelatedEventsActive: () => boolean;
}

/**
 * Opt-in configuration for which items to render in the entity expand popover.
 * All items default to false - consumers must explicitly enable the items they want.
 */
export interface EntityExpandShouldRender {
  /** Show "Show entity relationships" toggle (entity store relationships) */
  showEntityRelationships?: boolean;
  /** Show "Show this entity's actions" filter toggle */
  showActionsByEntity?: boolean;
  /** Show "Show actions done to this entity" filter toggle */
  showActionsOnEntity?: boolean;
  /** Show "Show related events" filter toggle */
  showRelatedEvents?: boolean;
  /** Show "Show entity details" preview action */
  showEntityDetails?: boolean;
}

/**
 * Options for generating entity expand popover items.
 */
export interface GetEntityExpandItemsOptions {
  /** The node ID */
  nodeId: string;
  /** Pre-bound callbacks for entity filter actions */
  entityFilterActions?: EntityFilterActions;
  /** Callback to show entity details. Called when "Show entity details" is clicked. */
  onShowEntityDetails?: () => void;
  /** Callback to close the popover */
  onClose?: () => void;
  /** Opt-in configuration for which items to render. All default to false. */
  shouldRender: EntityExpandShouldRender;
  /** Whether entity details should be disabled (shown but not clickable). Defaults to false. */
  showEntityDetailsDisabled?: boolean;
  /** Whether entity relationships is currently expanded (controls show/hide label) */
  isEntityRelationshipsExpanded?: boolean;
  /** Whether the entity is part of the initial set of entities (e.g., from the original graph request) */
  isInitialEntity?: boolean;
  /** Callback to toggle entity relationships on/off */
  toggleEntityRelationships?: (action: 'show' | 'hide') => void;
  /** Whether entity relationships should be disabled. Defaults to false. */
  showEntityRelationshipsDisabled?: boolean;
}

const DISABLED_TOOLTIP = i18n.translate(
  'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetailsTooltipText',
  { defaultMessage: 'Details not available' }
);

/**
 * Generates entity expand popover items with onClick handlers.
 * Returns items ready to be rendered directly in ListGraphPopover.
 *
 * Uses opt-in pattern: consumers must explicitly enable each item type they want.
 */
export const getEntityExpandItems = (
  options: GetEntityExpandItemsOptions
): Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> => {
  const {
    onShowEntityDetails,
    onClose,
    entityFilterActions,
    shouldRender,
    showEntityDetailsDisabled = false,
    isEntityRelationshipsExpanded = false,
    isInitialEntity = false,
    toggleEntityRelationships,
    showEntityRelationshipsDisabled = false,
  } = options;

  const items: Array<ItemExpandPopoverListItemProps | SeparatorExpandPopoverListItemProps> = [];

  // Entity relationships item (shown first, before filter actions)
  if (shouldRender.showEntityRelationships) {
    items.push({
      type: 'item',
      iconType: 'cluster',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_ITEM_ID,
      label: isEntityRelationshipsExpanded
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideEntityRelationships',
            { defaultMessage: 'Hide entity relationships' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityRelationships',
            { defaultMessage: 'Show entity relationships' }
          ),
      disabled: showEntityRelationshipsDisabled,
      onClick: () => {
        toggleEntityRelationships?.(isEntityRelationshipsExpanded ? 'hide' : 'show');
        onClose?.();
      },
      showToolTip: showEntityRelationshipsDisabled,
      toolTipText: showEntityRelationshipsDisabled
        ? isInitialEntity
          ? i18n.translate(
              'securitySolutionPackages.csp.graph.graphNodeExpandPopover.initialEntityRelationshipsNotAvailable',
              { defaultMessage: 'Cannot hide entity relationships of investigation entity' }
            )
          : i18n.translate(
              'securitySolutionPackages.csp.graph.graphNodeExpandPopover.entityRelationshipsNotAvailable',
              { defaultMessage: 'Entity relationships not available' }
            )
        : undefined,
      toolTipProps: showEntityRelationshipsDisabled
        ? {
            position: 'bottom',
            'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_RELATIONSHIPS_TOOLTIP_ID,
          }
        : undefined,
    });
  }

  // Filter action items
  if (shouldRender.showActionsByEntity) {
    const actionsByEntityActive = entityFilterActions?.isEntityFilterActive('actor') ?? false;
    items.push({
      type: 'item',
      iconType: 'sortRight',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_BY_ITEM_ID,
      label: actionsByEntityActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideThisEntitysActions',
            { defaultMessage: "Hide this entity's actions" }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showThisEntitysActions',
            { defaultMessage: "Show this entity's actions" }
          ),
      onClick: () => {
        entityFilterActions?.toggleEntityFilter('actor', actionsByEntityActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  if (shouldRender.showActionsOnEntity) {
    const actionsOnEntityActive = entityFilterActions?.isEntityFilterActive('target') ?? false;
    items.push({
      type: 'item',
      iconType: 'sortLeft',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ACTIONS_ON_ITEM_ID,
      label: actionsOnEntityActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideActionsDoneToThisEntity',
            { defaultMessage: 'Hide actions done to this entity' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showActionsDoneToThisEntity',
            { defaultMessage: 'Show actions done to this entity' }
          ),
      onClick: () => {
        entityFilterActions?.toggleEntityFilter('target', actionsOnEntityActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  if (shouldRender.showRelatedEvents) {
    const relatedEventsActive = entityFilterActions?.isRelatedEventsActive() ?? false;
    items.push({
      type: 'item',
      iconType: 'analyzeEvent',
      testSubject: GRAPH_NODE_POPOVER_SHOW_RELATED_ITEM_ID,
      label: relatedEventsActive
        ? i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.hideRelatedEntities',
            { defaultMessage: 'Hide related events' }
          )
        : i18n.translate(
            'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showRelatedEntities',
            { defaultMessage: 'Show related events' }
          ),
      onClick: () => {
        entityFilterActions?.toggleRelatedEvents(relatedEventsActive ? 'hide' : 'show');
        onClose?.();
      },
    });
  }

  // Entity details item (with optional separator if filter items exist)
  if (shouldRender.showEntityDetails) {
    // Add separator if there are filter items before the entity details
    if (items.length > 0) {
      items.push({ type: 'separator' });
    }

    const handleEntityDetailsClick = () => {
      onShowEntityDetails?.();
      onClose?.();
    };

    items.push({
      type: 'item',
      iconType: 'maximize',
      testSubject: GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_ITEM_ID,
      label: i18n.translate(
        'securitySolutionPackages.csp.graph.graphNodeExpandPopover.showEntityDetails',
        { defaultMessage: 'Show entity details' }
      ),
      disabled: showEntityDetailsDisabled,
      onClick: handleEntityDetailsClick,
      showToolTip: showEntityDetailsDisabled,
      toolTipText: showEntityDetailsDisabled ? DISABLED_TOOLTIP : undefined,
      toolTipProps: showEntityDetailsDisabled
        ? {
            position: 'bottom',
            'data-test-subj': GRAPH_NODE_POPOVER_SHOW_ENTITY_DETAILS_TOOLTIP_ID,
          }
        : undefined,
    });
  }

  return items;
};
