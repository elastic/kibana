/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import type { Investigation, RecommendedAction } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useInvestigations } from '../../hooks/use_investigations_api';
import * as i18n from './translations';
import { BriefingContainer } from '../../components/briefing_container';
import { BRIEF_CONTAINER_BUCKETS } from '../../components/briefing_container/translations';
import { CategoryFilter } from '../../components/filters/category_filter';

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);
const AUTO_RESOLVED_STATUSES = new Set(['auto-resolved', 'closed']);

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

const isAutoResolved = (investigation: Investigation): boolean =>
  AUTO_RESOLVED_STATUSES.has(investigation.status ?? '');

const matchesBucket = (
  investigation: Investigation,
  bucket: 'all' | RecommendedAction
): boolean => {
  if (bucket === 'all') return true;
  return investigation.recommendedAction === bucket;
};

export const BriefPage: React.FC = () => {
  const { data, isLoading, error } = useInvestigations();
  const [selectedBucket, setSelectedBucket] = useState<'all' | RecommendedAction>('all');
  const [surfaceFilter, setSurfaceFilter] = useState<string | null>(null);
  usePndDocTitle(i18n.PAGE_TITLE);

  const investigations = useMemo(() => data?.investigations ?? [], [data?.investigations]);

  const sortedEvents = useMemo(
    () =>
      investigations.filter(isQueueRow).sort((a, b) => {
        const priorityDiff = (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
        if (priorityDiff !== 0) {
          return priorityDiff;
        }
        return b.updatedAt.localeCompare(a.updatedAt);
      }),
    [investigations]
  );

  const autoResolvedCount = useMemo(
    () => investigations.filter(isAutoResolved).length,
    [investigations]
  );

  const bucketCounts = useMemo(() => {
    const counts: Record<RecommendedAction, number> = {
      contain: 0,
      escalate: 0,
      investigate: 0,
      tune: 0,
    };
    for (const investigation of sortedEvents) {
      const action = investigation.recommendedAction;
      if (action && action in counts) {
        counts[action as RecommendedAction] += 1;
      }
    }
    return counts;
  }, [sortedEvents]);

  const surfaces = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const investigation of sortedEvents) {
      const surface = investigation.affectedSurface?.trim();
      if (surface && !seen.has(surface)) {
        seen.add(surface);
        labels.push(surface);
      }
    }
    return labels;
  }, [sortedEvents]);

  const filteredQueueItems = useMemo(
    () =>
      sortedEvents.filter((investigation) => {
        if (!matchesBucket(investigation, selectedBucket)) return false;
        if (surfaceFilter && investigation.affectedSurface !== surfaceFilter) return false;
        return true;
      }),
    [sortedEvents, surfaceFilter, selectedBucket]
  );

  const groupedBriefingItems = useMemo(() => {
    const groups: Array<{
      id: RecommendedAction;
      label: string;
      items: Investigation[];
    }> = [];
    for (const bucket of BRIEF_CONTAINER_BUCKETS) {
      const items = filteredQueueItems.filter(
        (investigation) => investigation.recommendedAction === bucket.id
      );
      if (items.length >= 0) {
        groups.push({ ...bucket, items });
      }
    }
    return groups;
  }, [filteredQueueItems]);

  return (
    <PndPageSection restrictWidth="900px">
      <PndPageHeader
        title={
          <>
            {i18n.GREETING_PREFIX}{' '}
            <span
              css={css`
                font-weight: 700;
              `}
            >
              {i18n.greetingEmphasis(sortedEvents.length)}
            </span>
          </>
        }
        subtitle={
          autoResolvedCount > 0 ? i18n.autonomousSubline(autoResolvedCount) : i18n.CLEAR_SUBLINE
        }
      />

      <CategoryFilter
        selectedBucket={selectedBucket}
        bucketCounts={bucketCounts}
        onChange={setSelectedBucket}
      />

      {surfaces.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="m"
            wrap
            responsive={false}
            alignItems="center"
            aria-label={i18n.AFFECTED_SURFACES}
          >
            {surfaces.map((surface) => (
              <EuiFlexItem key={surface} grow={false}>
                <EuiBadge
                  color={surfaceFilter === surface ? 'primary' : 'hollow'}
                  onClick={() =>
                    setSurfaceFilter((current) => (current === surface ? null : surface))
                  }
                  onClickAriaLabel={surface}
                >
                  {surface}
                </EuiBadge>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </>
      ) : null}

      <EuiSpacer size="l" />

      {isLoading ? (
        <EuiFlexGroup justifyContent="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="xl" aria-label={i18n.LOADING} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}

      {error ? <EuiEmptyPrompt iconType="alert" title={<h2>{i18n.LOAD_ERROR}</h2>} /> : null}

      {!isLoading && !error && filteredQueueItems.length === 0 ? (
        <EuiEmptyPrompt iconType="visTagCloud" title={<h2>{i18n.EMPTY_BRIEFING_QUEUE}</h2>} />
      ) : null}

      {!isLoading && !error
        ? groupedBriefingItems.map((group) => (
            <BriefingContainer
              briefingId={group.id}
              briefingType={group.id as RecommendedAction}
              briefingList={group.items}
            />
          ))
        : null}
    </PndPageSection>
  );
};
