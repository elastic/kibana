/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiEmptyPrompt, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { CommonAttachmentTabViewProps } from '@kbn/cases-plugin/public';
import { SECURITY_ENTITY_ATTACHMENT_TYPE, type CaseUI } from '@kbn/cases-plugin/common';
import type { EntityAttachmentMetadata } from '../../../../../common/cases/attachments/entity';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import {
  ENTITY_TAB_EMPTY_TEST_ID,
  ENTITY_TAB_NO_PRIVILEGES_TEST_ID,
  ENTITY_TAB_TABLE_TEST_ID,
} from './test_ids';
import {
  DataViewContext,
  EntitiesTableSection,
  type EntitiesTableConfig,
} from '../../../../entity_analytics/components/home/entities_table';
import { useEntityStoreDataView } from '../../../../entity_analytics/components/home/use_entity_store_data_view';
import { useEntityStoreStatus } from '../../../../entity_analytics/components/entity_store/hooks/use_entity_store';
import { useEntityEnginePrivileges } from '../../../../entity_analytics/components/entity_store/hooks/use_entity_engine_privileges';
import { useMissingRiskEnginePrivileges } from '../../../../entity_analytics/hooks/use_missing_risk_engine_privileges';
import { getEntityAnalyticsReadPrivilegesCallOutMessage } from '../../../../entity_analytics/components/entity_analytics_read_privileges_callout';
import { CallOut } from '../../../../common/components/callouts';
import { EntityStoreDisabledEmptyPromptBody } from '../../../../entity_analytics/pages/entity_store_disabled_empty_prompt';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useEntityLocalTableState } from '../hooks/use_entity_local_table_state';

type CaseAttachment = CaseUI['comments'][number];

/**
 * Minimal projection of an entity attachment used to drive the embedded table.
 * Carries the `entityType` alongside `attachmentId` so we can pin the ES query
 * to the *per-type* identifier field (see `EntityTypeToIdentifierField`) rather
 * than guessing a single canonical field that fits every entity type.
 */
interface AttachedEntity {
  attachmentId: string;
  entityType: EntityAttachmentMetadata['entityType'];
}

/**
 * Narrow a case attachment to a `security.entity` row. The cases V2 union types
 * `attachmentId` as `string | string[]` (alerts can be batched), so we also
 * defensively reject array ids and missing metadata.
 */
const isEntityAttachment = (
  comment: CaseAttachment
): comment is CaseAttachment & {
  type: typeof SECURITY_ENTITY_ATTACHMENT_TYPE;
  attachmentId: string;
  metadata: EntityAttachmentMetadata;
} => {
  if (comment.type !== SECURITY_ENTITY_ATTACHMENT_TYPE) return false;
  const candidate = comment as CaseAttachment & {
    attachmentId?: unknown;
    metadata?: unknown;
  };
  return (
    typeof candidate.attachmentId === 'string' &&
    candidate.metadata != null &&
    typeof candidate.metadata === 'object'
  );
};

const matchesSearchTerm = (metadata: EntityAttachmentMetadata, searchTerm: string) => {
  const haystack = `${metadata.entityName} ${metadata.entityType} ${
    metadata.riskLevel ?? ''
  }`.toLowerCase();
  return haystack.includes(searchTerm.toLowerCase());
};

/**
 * Per-type ECS identifier fields the pinned filter is allowed to match against.
 *
 * What gets captured as `attachmentId` from the user/host/etc. flyout is
 * unstable: the entity store v2 EUID resolver may surface `user.email` rather
 * than `user.name` for IdP-backed (high-confidence) users, so the same
 * underlying entity can be attached as either form depending on which surface
 * the user opened. To cover that variability we OR over every ECS field that
 * could plausibly hold the captured value for the entity's type.
 *
 * Field choices follow the EUID ranking documented in the entity-store skill:
 *   user      : `user.email` > `user.id` > `user.name`            (IdP rank chain)
 *   host      : `host.id` > `host.name` > `host.hostname`         (host fallback chain)
 *   service   : `service.name`
 *   generic   : `entity.id`
 *
 * `entity.id` is added to all types because EUIDs are always prefixed
 * (`user:…`, `host:…`, `service:…`), so it can't cause cross-type collisions —
 * and it's the canonical identifier we should be persisting anyway. See the
 * payload schema follow-up in [[POC_2]] / [[Tasks]].
 */
const CANDIDATE_FIELDS_BY_TYPE: Record<EntityType, readonly string[]> = {
  user: ['user.name', 'user.email', 'user.id', 'entity.id'],
  host: ['host.name', 'host.hostname', 'host.id', 'entity.id'],
  service: ['service.name', 'entity.id'],
  generic: ['entity.id'],
};

/**
 * Per-instance config for the embedded `EntitiesTableSection`. Distinct from
 * the entity analytics home page so column visibility/widths, the global-time
 * "Inspect" registration, and flyout `scopeId`/`contextID` don't collide with
 * the home page table.
 */
const CASE_ATTACHMENT_TABLE_CONFIG: EntitiesTableConfig = {
  tableId: 'entity-analytics-case-attachment-table',
  columnsLocalStorageKey: 'securitySolution.entityAnalytics.cases.attachment.columns',
  columnsSettingsLocalStorageKey:
    'securitySolution.entityAnalytics.cases.attachment.columns:settings',
  groupingLocalStorageKey: 'securitySolution.entityAnalytics.cases.attachment.grouping',
};

/**
 * Renders the body of the "Entities" accordion in the case Attachments tab.
 *
 * Acts as a thin shell around the entity analytics home `EntitiesTableSection`:
 *  1. Extracts the entity-attachment ids from `caseData.comments`, applying the
 *     parent tab's `searchTerm` against the persisted attachment metadata so we
 *     never fire an ES query when nothing matches the user's search.
 *  2. Short-circuits with an empty prompt when no entity attachments exist (or
 *     none match the search) — keeps the accordion cheap and skips the ES call.
 *  3. Gates on `useEntityStoreStatus` and reuses the home page's "store
 *     disabled" prompt body when the entity store isn't installed/running, and
 *     on `useEntityEnginePrivileges` so users without entity analytics read
 *     access get an explicit message instead of a misleading empty grid.
 *  4. Loads the entity store data view and renders `EntitiesTableSection`,
 *     pinning the ES query to the attached entity ids and supplying a
 *     case-scoped `EntitiesTableConfig` so the embedded table is fully isolated
 *     from the EA home page instance.
 */
export const EntityTabContent: React.FC<CommonAttachmentTabViewProps> = ({
  caseData,
  searchTerm,
}) => {
  // Pre-filtering by `searchTerm` here keeps the case-tab search consistent with
  // the in-memory behaviour of other attachment accordions and avoids firing an
  // ES query when the user has already narrowed past every attached entity.
  const attachedEntities = useMemo<AttachedEntity[]>(() => {
    const items: AttachedEntity[] = [];
    for (const comment of caseData.comments) {
      if (!isEntityAttachment(comment)) continue;
      if (searchTerm && !matchesSearchTerm(comment.metadata, searchTerm)) continue;
      items.push({
        attachmentId: comment.attachmentId,
        entityType: comment.metadata.entityType,
      });
    }
    return items;
  }, [caseData.comments, searchTerm]);

  if (attachedEntities.length === 0) {
    return (
      <EuiEmptyPrompt
        data-test-subj={ENTITY_TAB_EMPTY_TEST_ID}
        iconType="user"
        iconColor="default"
        titleSize="xs"
        body={
          <p>
            {searchTerm ? (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.cases.tab.noResults"
                defaultMessage="No entities match your search."
              />
            ) : (
              <FormattedMessage
                id="xpack.securitySolution.entityAnalytics.cases.tab.empty"
                defaultMessage="No entities have been attached to this case yet."
              />
            )}
          </p>
        }
      />
    );
  }

  return <EntityTabTable attachedEntities={attachedEntities} />;
};

/**
 * Inner component that owns the entity-store-aware hooks. Split out from
 * `EntityTabContent` so the hooks only run once we know there's at least one
 * entity attachment to render — avoids the entity store status request on
 * cases that don't have entity attachments.
 */
const EntityTabTable = ({ attachedEntities }: { attachedEntities: AttachedEntity[] }) => {
  const spaceId = useSpaceId();
  const { data: entityStoreStatusData, isLoading: isStatusLoading } = useEntityStoreStatus();
  const { dataView, isLoading: isDataViewLoading } = useEntityStoreDataView(spaceId);
  // The embedded `EntitiesTableSection` does not gate on entity store read
  // privileges — it assumes the parent surface already did (the EA home page
  // does this via the same hook). Without this check a user with cases access
  // but no entity analytics privileges would see an empty grid instead of an
  // honest "no access" message, because the underlying ES query is denied.
  const {
    data: privileges,
    isLoading: isPrivilegesLoading,
    isError: isPrivilegesError,
  } = useEntityEnginePrivileges();
  // The entity table surfaces risk scores, so include risk-engine read access
  // in the same callout the EA home page uses. `readonly: true` requires only
  // read privileges (no run/enable cluster privileges).
  const riskEngineReadPrivileges = useMissingRiskEnginePrivileges({ readonly: true });

  const isEntityStoreDisabled =
    entityStoreStatusData?.status === 'not_installed' ||
    entityStoreStatusData?.status === 'stopped';

  // Mirror the EA home page: only treat as "no privileges" when the request
  // succeeded and explicitly reports missing read permissions. A genuine
  // request error falls through so we don't hide the table on transient failures.
  const hasNoReadPrivileges = !isPrivilegesError && !privileges?.has_read_permissions;

  // `attachmentId` is the identifier captured at attach time. It is NOT the
  // entity store's `entity.id` (an EUID like `user:jane@okta`) — and for IdP
  // (high-confidence) users in particular, it varies between `user.name` and
  // `user.email` depending on which surface opened the flyout (the EUID
  // resolver may only surface `user.email` in `identityFields`). So pinning
  // to a single ECS field would miss attachments captured in the other shape.
  //
  // Per entity type, build a `bool.should` over every plausible ECS identifier
  // field. Combined with per-type id grouping, we keep mixed-type cases scoped
  // (e.g. user "alice" doesn't accidentally match host "alice"), while still
  // matching whichever shape was captured at attach time.
  const pinnedFilter = useMemo<estypes.QueryDslQueryContainer>(() => {
    const idsByType = new Map<EntityType, string[]>();
    for (const { attachmentId, entityType } of attachedEntities) {
      const existing = idsByType.get(entityType as EntityType) ?? [];
      existing.push(attachmentId);
      idsByType.set(entityType as EntityType, existing);
    }
    const should: estypes.QueryDslQueryContainer[] = [];
    for (const [type, ids] of idsByType) {
      const fields = CANDIDATE_FIELDS_BY_TYPE[type];
      if (!fields) continue;
      for (const field of fields) {
        should.push({ terms: { [field]: ids } });
      }
    }
    return { bool: { should, minimum_should_match: 1 } };
  }, [attachedEntities]);

  const state = useEntityLocalTableState({ pinnedFilter });

  if (isStatusLoading || isDataViewLoading || isPrivilegesLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  if (isEntityStoreDisabled) {
    return <EntityStoreDisabledEmptyPromptBody />;
  }

  // Reuse the EA home page's "Insufficient privileges" message (and its
  // specific list of missing Elasticsearch index/risk privileges) so the
  // wording is identical across surfaces. Unlike the home page we render it as
  // a non-dismissible inline callout with its own id prefix, so it neither
  // shares dismissal state with the home page nor can be dismissed inside this
  // accordion. `message` is null when nothing is missing, so this doubles as a
  // banner above the table when only risk score privileges are missing.
  const privilegesCalloutMessage = getEntityAnalyticsReadPrivilegesCallOutMessage({
    riskEngineReadPrivileges,
    entityEnginePrivileges: privileges,
    idPrefix: 'entity-analytics-cases-missing-privileges',
  });
  const privilegesCallout = privilegesCalloutMessage ? (
    <CallOut message={privilegesCalloutMessage} showDismissButton={false} />
  ) : null;

  // Without entity store read access the underlying ES query is denied, so we
  // hide the table entirely and show only the callout rather than a misleading
  // empty grid.
  if (hasNoReadPrivileges) {
    return (
      <EuiFlexItem data-test-subj={ENTITY_TAB_NO_PRIVILEGES_TEST_ID}>
        {privilegesCallout}
      </EuiFlexItem>
    );
  }

  return (
    <>
      {privilegesCallout}
      <EuiFlexItem data-test-subj={ENTITY_TAB_TABLE_TEST_ID}>
        <DataViewContext.Provider value={{ dataView, dataViewIsLoading: isDataViewLoading }}>
          <EntitiesTableSection state={state} config={CASE_ATTACHMENT_TABLE_CONFIG} />
        </DataViewContext.Provider>
      </EuiFlexItem>
    </>
  );
};

EntityTabContent.displayName = 'EntityTabContent';

// eslint-disable-next-line import/no-default-export
export default EntityTabContent;
