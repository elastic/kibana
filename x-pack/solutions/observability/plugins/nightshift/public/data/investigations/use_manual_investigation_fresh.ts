/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HttpStart } from '@kbn/core/public';
import { useQuery } from '@kbn/react-query';
import type { SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';
import {
  SHARED_INVESTIGATION_BY_ID_URL,
  SHARED_INVESTIGATIONS_API_VERSION,
} from './shared_investigations_api';
import {
  dismissManualInvestigationFresh,
  getManualInvestigationFreshCounts,
  getManualInvestigationFreshCountsFromSections,
  isManualInvestigationFresh,
  type ManualInvestigationFreshSection,
  shouldDismissManualInvestigationFresh,
  subscribeManualInvestigationFresh,
  syncManualInvestigationFreshFromSections,
} from './manual_investigation_starts';

/**
 * Homepage wiring for unread manual Investigate starts: tile `+N`, card New, dismiss on open.
 */
export const useManualInvestigationFresh = ({
  spaceBasePath,
  sections,
  searchQuery,
  selectedInvestigationId,
  http,
}: {
  spaceBasePath: string;
  sections: ReadonlyArray<ManualInvestigationFreshSection>;
  searchQuery?: string;
  selectedInvestigationId?: string;
  http: HttpStart;
}): {
  isFreshInvestigation: (investigationId: string) => boolean;
  freshCounts: SeverityCounts;
} => {
  const [revision, setRevision] = useState(0);
  useEffect(
    () => subscribeManualInvestigationFresh(() => setRevision((current) => current + 1)),
    []
  );

  useEffect(() => {
    syncManualInvestigationFreshFromSections(spaceBasePath, sections);
  }, [revision, sections, spaceBasePath]);

  const isFreshInvestigation = useCallback(
    (investigationId: string) => isManualInvestigationFresh(investigationId, spaceBasePath),
    [revision, spaceBasePath]
  );

  const freshCounts = useMemo((): SeverityCounts => {
    if (!(searchQuery ?? '').trim()) {
      return getManualInvestigationFreshCounts(spaceBasePath);
    }
    return getManualInvestigationFreshCountsFromSections(spaceBasePath, sections);
  }, [revision, searchQuery, sections, spaceBasePath]);

  const selectedIsFresh =
    selectedInvestigationId != null &&
    isManualInvestigationFresh(selectedInvestigationId, spaceBasePath);

  const { data: selectedInvestigation } = useQuery({
    queryKey: ['nightshift.manualInvestigationFresh.selected', selectedInvestigationId],
    enabled: selectedIsFresh,
    queryFn: ({ signal }) =>
      http.get<{ in_progress: boolean }>(
        SHARED_INVESTIGATION_BY_ID_URL.replace(
          '{id}',
          encodeURIComponent(selectedInvestigationId!)
        ),
        { version: SHARED_INVESTIGATIONS_API_VERSION, signal }
      ),
  });

  useEffect(() => {
    if (!selectedInvestigationId || !selectedIsFresh) {
      return;
    }
    if (
      !shouldDismissManualInvestigationFresh({
        investigationId: selectedInvestigationId,
        sections,
        fetchedInProgress: selectedInvestigation?.in_progress,
      })
    ) {
      return;
    }
    dismissManualInvestigationFresh(selectedInvestigationId, spaceBasePath);
  }, [
    sections,
    selectedInvestigation?.in_progress,
    selectedInvestigationId,
    selectedIsFresh,
    spaceBasePath,
  ]);

  return { isFreshInvestigation, freshCounts };
};
