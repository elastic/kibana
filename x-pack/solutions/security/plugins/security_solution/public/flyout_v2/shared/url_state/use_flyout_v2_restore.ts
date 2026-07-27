/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { useEsDocSearch } from '@kbn/unified-doc-viewer-plugin/public';
import { noop } from 'lodash/fp';
import type { Indicator } from '../../../../common/threat_intelligence/types/indicator';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { FlowTargetSourceDest } from '../../../../common/search_strategy/security_solution/network';
import type { ManagedUserHit } from '../../../../common/search_strategy/security_solution/users/managed_details';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import type { FlyoutApi } from '../../use_flyout_api';
import { useFlyoutApi } from '../../use_flyout_api';
import type {
  AnalyzerDescriptor,
  AttackCorrelationsDescriptor,
  AttackDescriptor,
  AttackEntitiesDescriptor,
  CspMisconfigurationDescriptor,
  CspVulnerabilityDescriptor,
  DocumentCorrelationsDescriptor,
  DocumentDescriptor,
  DocumentEntitiesDescriptor,
  DocumentFromPatternDescriptor,
  DocumentGraphDescriptor,
  DocumentInvestigationGuideDescriptor,
  DocumentPrevalenceDescriptor,
  DocumentResponseDescriptor,
  DocumentThreatIntelligenceDescriptor,
  EntityAlertsInsightsDescriptor,
  EntityAnomalyInsightsDescriptor,
  EntityEntraInsightsDescriptor,
  EntityGraphViewDescriptor,
  EntityMisconfigurationInsightsDescriptor,
  EntityOktaInsightsDescriptor,
  EntityResolutionDescriptor,
  EntityRiskInputsDescriptor,
  EntityVulnerabilityInsightsDescriptor,
  FlyoutDescriptor,
  FlyoutV2UrlParamValue,
  GenericEntityDescriptor,
  HostDescriptor,
  IocDescriptor,
  NetworkDescriptor,
  NotesDescriptor,
  RuleDescriptor,
  ServiceDescriptor,
  SessionViewDescriptor,
  UserDescriptor,
} from './flyout_v2_url_param';
import { decodeFlyoutV2UrlParam } from './flyout_v2_url_param';

// ---------------------------------------------------------------------------
// Constants — which descriptor kinds require an async data fetch
// ---------------------------------------------------------------------------

/**
 * Descriptor kinds that require resolving the document's DataTableRecord (via `useEsDocSearch`)
 * before the tool flyout can be opened.
 */
const NEEDS_DOC_HIT = new Set<string>([
  'analyzer',
  'sessionView',
  'documentEntities',
  'documentCorrelations',
  'documentPrevalence',
  'documentResponse',
  'documentThreatIntelligence',
  'documentInvestigationGuide',
  'documentGraph',
  'notes',
]);

/** Descriptor kinds that require pre-fetching the attack's DataTableRecord. */
const NEEDS_ATTACK_HIT = new Set<string>(['attackCorrelations', 'attackEntities']);

// ---------------------------------------------------------------------------
// Per-kind restorer helpers (pure functions, not hooks)
// ---------------------------------------------------------------------------

interface RestoreContext {
  docHit?: DataTableRecord;
  attackHit?: DataTableRecord;
  iocIndicator?: Indicator;
}

/**
 * Builds the tool-header "show entity" callback for a restored entity tool flyout.
 *
 * Entity tools open with `session: 'start'`, so the entity main flyout is not persisted alongside
 * the tool: on refresh only the tool descriptor is in the URL and there is no parent entity flyout.
 * The shared tools header hides its source context (the entity name + icon) unless it is given a
 * title-click handler, so without this callback a restored tool flyout would lose the host/user
 * info in its header. Rebuilding it here restores both the header label and the
 * click-to-open-entity behaviour the live flyout provides via its own `onShowEntity` handler.
 */
const buildShowEntityCallback = (
  api: FlyoutApi,
  {
    entityType,
    entityName,
    entityId,
    scopeId,
  }: { entityType?: string; entityName: string; entityId?: string; scopeId?: string }
): (() => void) => {
  return () => {
    switch (entityType) {
      case 'user':
        api.openUserFlyoutAsChild({ userName: entityName, entityId, scopeId, title: entityName });
        break;
      case 'service':
        api.openServiceFlyoutAsChild({
          serviceName: entityName,
          entityId,
          scopeId,
          title: entityName,
        });
        break;
      case 'host':
        api.openHostFlyoutAsChild({ hostName: entityName, entityId, scopeId, title: entityName });
        break;
      default:
        // Generic / unknown entity type: only openable when we have the canonical entity id.
        if (entityId) {
          api.openGenericEntityFlyoutAsChild({
            scopeId: scopeId ?? '',
            entityId,
            title: entityName,
          });
        }
    }
  };
};

/**
 * Open a descriptor as the first/main flyout (session = 'start').
 * Mutually exclusive with `openDescriptorAsChild`.
 *
 * Exported for reuse by `useLegacyFlyoutUrlInterop`.
 */
export const openDescriptorAsStart = (
  descriptor: FlyoutDescriptor,
  ctx: RestoreContext,
  api: FlyoutApi
): void => {
  const { kind } = descriptor;

  switch (kind) {
    // --- Document main flyouts ---
    case 'document': {
      const { documentId, indexName } = descriptor as DocumentDescriptor;
      api.openDocumentFlyoutFromIndex({ documentId, indexName });
      break;
    }
    case 'documentFromPattern': {
      const { documentId, indexName } = descriptor as DocumentFromPatternDescriptor;
      api.openDocumentFlyoutFromPattern({ documentId, indexName });
      break;
    }

    // --- Document tools (require resolved docHit) ---
    case 'analyzer': {
      const d = descriptor as AnalyzerDescriptor;
      if (ctx.docHit) {
        api.openAnalyzer({ hit: ctx.docHit });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'sessionView': {
      const d = descriptor as SessionViewDescriptor;
      if (ctx.docHit) {
        api.openSessionView({
          hit: ctx.docHit,
          jumpToCursor: d.jumpToCursor,
          jumpToEntityId: d.jumpToEntityId,
        });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentEntities': {
      const d = descriptor as DocumentEntitiesDescriptor;
      if (ctx.docHit) {
        api.openDocumentEntities({ hit: ctx.docHit, scopeId: d.scopeId });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentCorrelations': {
      const d = descriptor as DocumentCorrelationsDescriptor;
      if (ctx.docHit) {
        api.openDocumentCorrelations({
          hit: ctx.docHit,
          scopeId: d.scopeId,
          isRulePreview: d.isRulePreview,
          // Provide a default onShowAlert that opens the alert as a child flyout.
          onShowAlert: (alertId, indexName) =>
            api.openDocumentFlyoutFromIndexAsChild({ documentId: alertId, indexName }),
        });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentPrevalence': {
      const d = descriptor as DocumentPrevalenceDescriptor;
      if (ctx.docHit) {
        api.openDocumentPrevalence({
          hit: ctx.docHit,
          scopeId: d.scopeId,
          investigationFields: d.investigationFields,
        });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentResponse': {
      const d = descriptor as DocumentResponseDescriptor;
      if (ctx.docHit) {
        api.openDocumentResponse({ hit: ctx.docHit });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentThreatIntelligence': {
      const d = descriptor as DocumentThreatIntelligenceDescriptor;
      if (ctx.docHit) {
        api.openDocumentThreatIntelligence({ hit: ctx.docHit });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentInvestigationGuide': {
      const d = descriptor as DocumentInvestigationGuideDescriptor;
      if (ctx.docHit) {
        api.openDocumentInvestigationGuide({ hit: ctx.docHit });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'documentGraph': {
      const d = descriptor as DocumentGraphDescriptor;
      if (ctx.docHit) {
        api.openDocumentGraph({ hit: ctx.docHit });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }
    case 'notes': {
      const d = descriptor as NotesDescriptor;
      if (ctx.docHit) {
        api.openNotes({ hit: ctx.docHit });
      } else {
        api.openDocumentFlyoutFromIndex({ documentId: d.documentId, indexName: d.indexName });
      }
      break;
    }

    // --- Attack main flyout + tools ---
    case 'attack': {
      const { attackId, indexName } = descriptor as AttackDescriptor;
      api.openAttackFlyout({ attackId, indexName });
      break;
    }
    case 'attackCorrelations': {
      const d = descriptor as AttackCorrelationsDescriptor;
      if (ctx.attackHit) {
        api.openAttackCorrelations({ hit: ctx.attackHit, alertIds: d.alertIds });
      } else {
        api.openAttackFlyout({ attackId: d.attackId, indexName: d.indexName });
      }
      break;
    }
    case 'attackEntities': {
      const d = descriptor as AttackEntitiesDescriptor;
      if (ctx.attackHit) {
        api.openAttackEntities({ hit: ctx.attackHit, alertIds: d.alertIds });
      } else {
        api.openAttackFlyout({ attackId: d.attackId, indexName: d.indexName });
      }
      break;
    }

    // --- Entity main flyouts ---
    case 'host': {
      const { hostName, entityId, scopeId } = descriptor as HostDescriptor;
      api.openHostFlyout({ hostName, entityId, scopeId });
      break;
    }
    case 'user': {
      const { userName, entityId, scopeId } = descriptor as UserDescriptor;
      api.openUserFlyout({ userName, entityId, scopeId });
      break;
    }
    case 'service': {
      const { serviceName, entityId, scopeId } = descriptor as ServiceDescriptor;
      api.openServiceFlyout({ serviceName, entityId, scopeId });
      break;
    }
    case 'genericEntity': {
      const { scopeId, entityId, entityDocId } = descriptor as GenericEntityDescriptor;
      if (!entityId && !entityDocId) break;
      const idProps =
        entityId && entityDocId
          ? { entityId, entityDocId }
          : entityId
          ? { entityId }
          : { entityDocId: entityDocId as string };
      api.openGenericEntityFlyout({ scopeId, ...idProps });
      break;
    }

    // --- Entity tools ---
    case 'entityRiskInputs': {
      const d = descriptor as EntityRiskInputsDescriptor;
      api.openEntityRiskInputs({
        entityType: d.entityType as unknown as
          | EntityType.host
          | EntityType.user
          | EntityType.service,
        entityName: d.entityName,
        entityId: d.entityId,
        onShowEntity: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.entityName,
          entityId: d.entityId,
        }),
      });
      break;
    }
    case 'entityAnomalyInsights': {
      const d = descriptor as EntityAnomalyInsightsDescriptor;
      api.openEntityAnomalyInsights({
        entityType: d.entityType as unknown as EntityType.host | EntityType.user,
        value: d.value,
        entityId: d.entityId,
        onOpenEntity: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.value,
          entityId: d.entityId,
        }),
      });
      break;
    }
    case 'entityAlertsInsights': {
      const d = descriptor as EntityAlertsInsightsDescriptor;
      api.openEntityAlertsInsights({
        entityType: d.entityType as unknown as
          | EntityType.host
          | EntityType.user
          | EntityType.generic,
        value: d.value,
        entityId: d.entityId,
        onShowEntity: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.value,
          entityId: d.entityId,
        }),
      });
      break;
    }
    case 'entityMisconfigurationInsights': {
      const d = descriptor as EntityMisconfigurationInsightsDescriptor;
      api.openEntityMisconfigurationInsights({
        entityType: d.entityType as unknown as
          | EntityType.host
          | EntityType.user
          | EntityType.generic,
        value: d.value,
        entityId: d.entityId,
        onShowEntity: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.value,
          entityId: d.entityId,
        }),
      });
      break;
    }
    case 'entityVulnerabilityInsights': {
      const d = descriptor as EntityVulnerabilityInsightsDescriptor;
      api.openEntityVulnerabilityInsights({
        value: d.value,
        entityId: d.entityId,
        entityType: d.entityType as unknown as EntityType.host | EntityType.generic | undefined,
        onShowHost: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.value,
          entityId: d.entityId,
        }),
      });
      break;
    }
    case 'entityGraphView': {
      const d = descriptor as EntityGraphViewDescriptor;
      api.openEntityGraphView({
        entityId: d.entityId,
        scopeId: d.scopeId,
        entityName: d.entityName,
        onShowEntity: noop,
        onShowOriginatingEntity: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.entityName,
          entityId: d.entityId,
          scopeId: d.scopeId,
        }),
      });
      break;
    }
    case 'entityResolution': {
      const d = descriptor as EntityResolutionDescriptor;
      api.openEntityResolution({
        entityId: d.entityId,
        entityType: d.entityType as EntityType,
        entityName: d.entityName,
        scopeId: d.scopeId,
        onShowEntity: buildShowEntityCallback(api, {
          entityType: d.entityType,
          entityName: d.entityName,
          entityId: d.entityId,
          scopeId: d.scopeId,
        }),
      });
      break;
    }
    case 'entityEntraInsights': {
      const d = descriptor as EntityEntraInsightsDescriptor;
      // ManagedUserHit can be constructed directly from stored {_id, _index} — no async fetch needed.
      // The EntraInsights component fetches the full fields lazily from within.
      const managedUser: ManagedUserHit = {
        _id: d.managedUserId,
        _index: d.managedUserIndex,
      };
      api.openEntityEntraInsights({ managedUser, value: d.value });
      break;
    }
    case 'entityOktaInsights': {
      const d = descriptor as EntityOktaInsightsDescriptor;
      const managedUser: ManagedUserHit = {
        _id: d.managedUserId,
        _index: d.managedUserIndex,
      };
      api.openEntityOktaInsights({ managedUser, value: d.value });
      break;
    }

    // --- Network / Rule ---
    case 'network': {
      const { ip, flowTarget } = descriptor as NetworkDescriptor;
      api.openNetworkFlyout({ ip, flowTarget: flowTarget as FlowTargetSourceDest });
      break;
    }
    case 'rule': {
      const { ruleId } = descriptor as RuleDescriptor;
      api.openRuleFlyout({ ruleId });
      break;
    }

    // --- IOC ---
    case 'ioc': {
      if (ctx.iocIndicator) {
        api.openIocFlyout({ indicator: ctx.iocIndicator });
      }
      // If indicator could not be fetched: skip rather than open with empty data.
      break;
    }

    // --- CSP ---
    case 'cspMisconfiguration': {
      const { resourceId, ruleId } = descriptor as CspMisconfigurationDescriptor;
      api.openMisconfigurationFinding({ resourceId, ruleId });
      break;
    }
    case 'cspVulnerability': {
      const d = descriptor as CspVulnerabilityDescriptor;
      api.openVulnerabilityFinding({
        vulnerabilityId: d.vulnerabilityId,
        resourceId: d.resourceId,
        packageName: d.packageName,
        packageVersion: d.packageVersion,
        eventId: d.eventId,
      });
      break;
    }
  }
};

/**
 * Open a descriptor as the second/child flyout (session = 'inherit').
 * For kinds that have an explicit `...AsChild` method, that is used.
 * For tool kinds (which are always 'start') the same method is used as for `openDescriptorAsStart`.
 *
 * Exported for reuse by `useLegacyFlyoutUrlInterop`.
 */
export const openDescriptorAsChild = (
  descriptor: FlyoutDescriptor,
  ctx: RestoreContext,
  api: FlyoutApi
): void => {
  const { kind } = descriptor;

  switch (kind) {
    // Main flyouts that have an explicit AsChild variant
    case 'document': {
      const { documentId, indexName } = descriptor as DocumentDescriptor;
      api.openDocumentFlyoutFromIndexAsChild({ documentId, indexName });
      break;
    }
    case 'documentFromPattern': {
      // No AsChild variant exists — open as main (best-effort fallback)
      const { documentId, indexName } = descriptor as DocumentFromPatternDescriptor;
      api.openDocumentFlyoutFromPattern({ documentId, indexName });
      break;
    }
    case 'attack': {
      const { attackId, indexName } = descriptor as AttackDescriptor;
      api.openAttackFlyoutAsChild({ attackId, indexName });
      break;
    }
    case 'host': {
      const { hostName, entityId, scopeId } = descriptor as HostDescriptor;
      api.openHostFlyoutAsChild({ hostName, entityId, scopeId });
      break;
    }
    case 'user': {
      const { userName, entityId, scopeId } = descriptor as UserDescriptor;
      api.openUserFlyoutAsChild({ userName, entityId, scopeId });
      break;
    }
    case 'service': {
      const { serviceName, entityId, scopeId } = descriptor as ServiceDescriptor;
      api.openServiceFlyoutAsChild({ serviceName, entityId, scopeId });
      break;
    }
    case 'genericEntity': {
      const { scopeId, entityId, entityDocId } = descriptor as GenericEntityDescriptor;
      if (!entityId && !entityDocId) break;
      const idProps =
        entityId && entityDocId
          ? { entityId, entityDocId }
          : entityId
          ? { entityId }
          : { entityDocId: entityDocId as string };
      api.openGenericEntityFlyoutAsChild({ scopeId, ...idProps });
      break;
    }
    case 'network': {
      const { ip, flowTarget } = descriptor as NetworkDescriptor;
      api.openNetworkFlyoutAsChild({ ip, flowTarget: flowTarget as FlowTargetSourceDest });
      break;
    }
    case 'rule': {
      const { ruleId } = descriptor as RuleDescriptor;
      api.openRuleFlyoutAsChild({ ruleId });
      break;
    }
    case 'ioc': {
      if (ctx.iocIndicator) {
        api.openIocFlyoutAsChild({ indicator: ctx.iocIndicator });
      }
      break;
    }
    case 'cspMisconfiguration': {
      const { resourceId, ruleId } = descriptor as CspMisconfigurationDescriptor;
      api.openMisconfigurationFindingAsChild({ resourceId, ruleId });
      break;
    }
    case 'cspVulnerability': {
      const d = descriptor as CspVulnerabilityDescriptor;
      api.openVulnerabilityFindingAsChild({
        vulnerabilityId: d.vulnerabilityId,
        resourceId: d.resourceId,
        packageName: d.packageName,
        packageVersion: d.packageVersion,
        eventId: d.eventId,
      });
      break;
    }

    // Tool kinds and everything else: re-use the 'start' path (tools have no child variants).
    default:
      openDescriptorAsStart(descriptor, ctx, api);
      break;
  }
};

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Restore-on-mount hook: on first render, reads the `flyoutV2` (or `flyoutV2Timeline`) URL param,
 * resolves any `{id, index}` back to a DataTableRecord (for document/attack tool descriptors) or
 * Indicator (for IOC descriptors), then replays the ordered array via `useFlyoutApi()` — first
 * entry with session `'start'`, second entry via the `...AsChild` (`'inherit'`) form so both
 * the tool and its child reopen.
 *
 * Gated on `useIsNewFlyoutEnabled()`. Runs at most once per mount.
 *
 * Mount this hook in the Security Solution app shell, analogous to `useUrlState()` in
 * `app/home/index.tsx`. The `useFlyoutApi()` contract requires the Redux store, router, and
 * Kibana services that the app shell provides.
 */
export const useFlyoutV2RestoreFromUrl = (urlParamKey: string): void => {
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const history = useHistory();
  const flyoutApi = useFlyoutApi();
  const hasRestoredRef = useRef(false);

  // Read URL param exactly once (useState initializer runs on the first render only).
  const [descriptors] = useState<FlyoutV2UrlParamValue | null>(() => {
    if (!isNewFlyoutEnabled) return null;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    return decodeFlyoutV2UrlParam(raw);
  });

  // Detect a malformed param (raw present but decode failed) to strip it.
  const [isMalformed] = useState<boolean>(() => {
    if (!isNewFlyoutEnabled) return false;
    const raw = new URLSearchParams(history.location.search).get(urlParamKey);
    return raw != null && decodeFlyoutV2UrlParam(raw) === null;
  });

  // Strip malformed param once on mount.
  useEffect(() => {
    if (!isMalformed) return;
    const params = new URLSearchParams(history.location.search);
    params.delete(urlParamKey);
    const search = params.toString();
    history.replace({ ...history.location, search: search ? `?${search}` : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount

  // -----------------------------------------------------------------------
  // Identify which async fetches are needed
  // -----------------------------------------------------------------------

  const docFetchDescriptor = useMemo(
    () => descriptors?.find((d) => NEEDS_DOC_HIT.has(d.kind)) ?? null,
    [descriptors]
  );

  const attackFetchDescriptor = useMemo(
    () => descriptors?.find((d) => NEEDS_ATTACK_HIT.has(d.kind)) ?? null,
    [descriptors]
  );

  const iocDescriptor = useMemo((): IocDescriptor | null => {
    const found = descriptors?.find((d) => d.kind === 'ioc');
    return found ? (found as IocDescriptor) : null;
  }, [descriptors]);

  // -----------------------------------------------------------------------
  // Data fetching (hooks always called; skip controls actual execution)
  // -----------------------------------------------------------------------

  const { dataView, status: dataViewStatus } = useDataView(PageScope.default);
  const dataViewReady = dataViewStatus === 'ready';

  // The attack discovery alerts backing index (e.g.
  // `.internal.alerts-security.attack.discovery.alerts-default-000001`) is not part of the
  // PageScope.default data view's index pattern, so searching for it against that data view
  // (below) finds nothing. The live attack flyout resolves its hit against the dedicated
  // PageScope.attacks data view (see `useAttackDetails`) — use the same one here.
  const { dataView: attackDataView, status: attackDataViewStatus } = useDataView(PageScope.attacks);
  const attackDataViewReady = attackDataViewStatus === 'ready';

  // Resolve each document / attack / indicator by id+index using the SAME single-document search
  // (`useEsDocSearch`) that the document flyout itself uses.
  //
  // We deliberately do NOT use `useTimelineEventsDetails` here: that is the timeline events-details
  // *search strategy*, intended for a broad index *pattern*, and it returns no hit for a concrete
  // alerts backing index (e.g. `.internal.alerts-security.alerts-default-000001`) at restore time.
  // Relying on it made a restored tool flyout (analyzer, session view, ...) fall back to the
  // document main flyout on refresh, because `ctx.docHit` was never resolved.
  const docEventId = (docFetchDescriptor as { documentId?: string } | null)?.documentId ?? '';
  const docIndexName = (docFetchDescriptor as { indexName?: string } | null)?.indexName ?? '';
  const [docRequestState, docHitRecord] = useEsDocSearch({
    id: docEventId,
    index: docIndexName,
    dataView,
    skip: !docFetchDescriptor || !dataViewReady || !docEventId || !docIndexName,
  });

  const attackEventId =
    (attackFetchDescriptor as AttackCorrelationsDescriptor | AttackEntitiesDescriptor | null)
      ?.attackId ?? '';
  const attackIndexName =
    (attackFetchDescriptor as AttackCorrelationsDescriptor | AttackEntitiesDescriptor | null)
      ?.indexName ?? '';
  const [attackRequestState, attackHitRecord] = useEsDocSearch({
    id: attackEventId,
    index: attackIndexName,
    dataView: attackDataView,
    skip: !attackFetchDescriptor || !attackDataViewReady || !attackEventId || !attackIndexName,
  });

  const iocEventId = iocDescriptor?.indicatorId ?? '';
  const iocIndexName = iocDescriptor?.indicatorIndex ?? '';
  const [iocRequestState, iocHitRecord] = useEsDocSearch({
    id: iocEventId,
    index: iocIndexName,
    dataView,
    skip: !iocDescriptor || !dataViewReady || !iocEventId || !iocIndexName,
  });

  // -----------------------------------------------------------------------
  // Restore effect
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (hasRestoredRef.current || !descriptors) return;

    // Wait for the relevant data view(s) to be ready before any fetch-dependent restore.
    const needsDefaultDataView = !!docFetchDescriptor || !!iocDescriptor;
    if (needsDefaultDataView && !dataViewReady) return;
    if (attackFetchDescriptor && !attackDataViewReady) return;

    // A needed fetch is "settled" once `useEsDocSearch` resolves: Found WITH a record, or a terminal
    // NotFound/Error state. `Found` with a null record is the transient initial state of a skipped
    // search, so we require a non-null record for the Found case (otherwise we would commit before
    // the fetch actually ran and fall back to the wrong flyout).
    const isSettled = (
      hasDescriptor: boolean,
      state: ElasticRequestState,
      record: DataTableRecord | null
    ): boolean =>
      !hasDescriptor ||
      (state === ElasticRequestState.Found && !!record) ||
      state === ElasticRequestState.NotFound ||
      state === ElasticRequestState.Error ||
      state === ElasticRequestState.NotFoundDataView;

    if (!isSettled(!!docFetchDescriptor, docRequestState, docHitRecord)) return;
    if (!isSettled(!!attackFetchDescriptor, attackRequestState, attackHitRecord)) return;
    if (!isSettled(!!iocDescriptor, iocRequestState, iocHitRecord)) return;

    // All required fetches are done. Mark restored before setTimeout so a fast
    // double-render cannot trigger a second open.
    hasRestoredRef.current = true;

    // Build resolved context. `useEsDocSearch` already returns `DataTableRecord`s.
    const docHit = docHitRecord ?? undefined;
    const attackHit = attackHitRecord ?? undefined;
    // Carry `_index` through on the reconstructed indicator (the `Indicator` type only declares
    // `_id`/`fields`, but the IOC opener reads `_index` off the raw hit to re-persist the URL
    // descriptor). Without it, re-opening on restore would rewrite the descriptor with an empty
    // index and a second refresh would no longer restore the flyout.
    const iocIndicator: Indicator | undefined = iocHitRecord
      ? ({
          _id: iocHitRecord.raw._id ?? '',
          _index: iocHitRecord.raw._index,
          fields: (iocHitRecord.raw.fields ?? {}) as Indicator['fields'],
        } as Indicator)
      : undefined;

    const ctx: RestoreContext = { docHit, attackHit, iocIndicator };
    const [first, second] = descriptors;

    // Defer to a macrotask to avoid z-index ordering races with Timeline restore, which also
    // fires on mount and claims its slot in the same render cycle.
    setTimeout(() => {
      openDescriptorAsStart(first, ctx, flyoutApi);
      if (second) {
        openDescriptorAsChild(second, ctx, flyoutApi);
      }
    }, 0);
  }, [
    descriptors,
    docFetchDescriptor,
    attackFetchDescriptor,
    iocDescriptor,
    dataViewReady,
    attackDataViewReady,
    docRequestState,
    docHitRecord,
    attackRequestState,
    attackHitRecord,
    iocRequestState,
    iocHitRecord,
    flyoutApi,
  ]);
};
