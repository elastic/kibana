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
import {
  decodeLegacyFlyoutParam,
  translateLegacyStateToDescriptors,
  type LegacyFlyoutState,
} from '../../../../common/flyout_v2';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { useDataView } from '../../../data_view_manager/hooks/use_data_view';
import { PageScope } from '../../../data_view_manager/constants';
import { useFlyoutApi } from '../../use_flyout_api';
import { openDescriptorAsStart, openDescriptorAsChild } from './use_flyout_v2_restore';
import { toFlyoutV2UrlParamValue } from './flyout_v2_url_param';
import type { FlyoutV2UrlParamValue } from './flyout_v2_url_param';

// ---------------------------------------------------------------------------
// Descriptor kinds that need async data fetching (hook-only)
// ---------------------------------------------------------------------------

const NEEDS_DOC_HIT = new Set([
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

const NEEDS_ATTACK_HIT = new Set(['attackCorrelations', 'attackEntities']);

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Legacy-URL interop hook. On mount, reads the `flyout` (or `timelineFlyout`) rison URL param;
 * if found while the new flyout is enabled, translates it to the equivalent flyoutV2 open calls,
 * removes the legacy param, and lets the URL writer record the current state as flyoutV2.
 *
 * Only fires when:
 *  - `useIsNewFlyoutEnabled()` is true
 *  - the legacy param is present
 *  - the v2 param is NOT already present (to avoid double-open on already-migrated URLs)
 *
 * Mount this hook in the Security Solution app shell (app/home/index.tsx) BEFORE
 * `useFlyoutV2RestoreFromUrl`, so the legacy param is consumed first.
 *
 * The `eventFlyout` param is intentionally ignored per spec.
 */
export const useLegacyFlyoutUrlInterop = (legacyParamKey: string, v2ParamKey: string): void => {
  const isNewFlyoutEnabled = useIsNewFlyoutEnabled();
  const history = useHistory();
  const flyoutApi = useFlyoutApi();
  const hasOpenedRef = useRef(false);

  // Decode the legacy param exactly once (synchronous useState initializer).
  const [legacyState] = useState<LegacyFlyoutState | null>(() => {
    if (!isNewFlyoutEnabled) return null;
    // If v2 param already present, the URL is already migrated — do nothing.
    const searchParams = new URLSearchParams(history.location.search);
    if (searchParams.get(v2ParamKey)) return null;
    const raw = searchParams.get(legacyParamKey);
    return decodeLegacyFlyoutParam(raw);
  });

  // Track whether the raw legacy param was present but malformed.
  const [isMalformedLegacy] = useState<boolean>(() => {
    if (!isNewFlyoutEnabled) return false;
    const searchParams = new URLSearchParams(history.location.search);
    if (searchParams.get(v2ParamKey)) return false;
    const raw = searchParams.get(legacyParamKey);
    return raw != null && decodeLegacyFlyoutParam(raw) === null;
  });

  // Translate legacy state → v2 descriptors (synchronous).
  const descriptors = useMemo(
    (): FlyoutV2UrlParamValue | null =>
      legacyState ? toFlyoutV2UrlParamValue(translateLegacyStateToDescriptors(legacyState)) : null,
    [legacyState]
  );

  // Strip malformed legacy param on mount.
  useEffect(() => {
    if (!isMalformedLegacy) return;
    const params = new URLSearchParams(history.location.search);
    params.delete(legacyParamKey);
    const search = params.toString();
    history.replace({ ...history.location, search: search ? `?${search}` : '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally empty — run once on mount

  // -----------------------------------------------------------------------
  // Async data fetching (same machinery as useFlyoutV2RestoreFromUrl)
  // -----------------------------------------------------------------------

  const docFetchDescriptor = useMemo(
    () => descriptors?.find((d) => NEEDS_DOC_HIT.has(d.kind)) ?? null,
    [descriptors]
  );

  const attackFetchDescriptor = useMemo(
    () => descriptors?.find((d) => NEEDS_ATTACK_HIT.has(d.kind)) ?? null,
    [descriptors]
  );

  const { dataView, status: dataViewStatus } = useDataView(PageScope.default);
  const dataViewReady = dataViewStatus === 'ready';

  // The attack discovery alerts backing index is not part of the PageScope.default data view's
  // index pattern, so searching for it against that data view (below) finds nothing. The live
  // attack flyout resolves its hit against the dedicated PageScope.attacks data view (see
  // `useAttackDetails`) — use the same one here. See the matching comment in
  // `useFlyoutV2RestoreFromUrl` for the full story.
  const { dataView: attackDataView, status: attackDataViewStatus } = useDataView(PageScope.attacks);
  const attackDataViewReady = attackDataViewStatus === 'ready';

  // Resolve doc/attack hits with the same single-document search the document flyout uses.
  // NOTE: not `useTimelineEventsDetails` — see the comment in `useFlyoutV2RestoreFromUrl`; that
  // search strategy does not resolve a concrete alerts backing index, which broke tool restoration.
  const docEventId = (docFetchDescriptor as { documentId?: string } | null)?.documentId ?? '';
  const docIndexName = (docFetchDescriptor as { indexName?: string } | null)?.indexName ?? '';
  const [docRequestState, docHitRecord] = useEsDocSearch({
    id: docEventId,
    index: docIndexName,
    dataView,
    skip: !docFetchDescriptor || !dataViewReady || !docEventId || !docIndexName,
  });

  const attackEventId = (attackFetchDescriptor as { attackId?: string } | null)?.attackId ?? '';
  const attackIndexName = (attackFetchDescriptor as { indexName?: string } | null)?.indexName ?? '';
  const [attackRequestState, attackHitRecord] = useEsDocSearch({
    id: attackEventId,
    index: attackIndexName,
    dataView: attackDataView,
    skip: !attackFetchDescriptor || !attackDataViewReady || !attackEventId || !attackIndexName,
  });

  // -----------------------------------------------------------------------
  // Open effect
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (hasOpenedRef.current || !descriptors) return;

    if (docFetchDescriptor && !dataViewReady) return;
    if (attackFetchDescriptor && !attackDataViewReady) return;

    // A needed fetch is "settled" once useEsDocSearch resolves: Found WITH a record, or a terminal
    // NotFound/Error state. (Found + null record is the transient pre-fetch state of a skipped search.)
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

    hasOpenedRef.current = true;

    const docHit: DataTableRecord | undefined = docHitRecord ?? undefined;
    const attackHit: DataTableRecord | undefined = attackHitRecord ?? undefined;

    const ctx = { docHit, attackHit };
    const [first, second] = descriptors;

    // Remove the legacy param from the URL before opening (so the URL writer,
    // triggered by writeOnOpen inside open*, reads a clean URL when it appends flyoutV2).
    const searchParams = new URLSearchParams(history.location.search);
    searchParams.delete(legacyParamKey);
    const newSearch = searchParams.toString();
    history.replace({ ...history.location, search: newSearch ? `?${newSearch}` : '' });

    // Open in the next macrotask to avoid z-index ordering races (same guard as restore hook).
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
    dataViewReady,
    attackDataViewReady,
    docRequestState,
    docHitRecord,
    attackRequestState,
    attackHitRecord,
    flyoutApi,
    history,
    legacyParamKey,
  ]);
};
