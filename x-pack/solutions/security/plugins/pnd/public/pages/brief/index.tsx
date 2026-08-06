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
  EuiButton,
  EuiButtonEmpty,
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

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);
const AUTO_RESOLVED_STATUSES = new Set(['auto-resolved', 'closed']);

const BUCKET_COLORS: Record<RecommendedAction, string> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'primary',
  tune: 'accent',
};

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

  const queueRows = useMemo(
    () =>
      investigations
        .filter(isQueueRow)
        .sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0)),
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
    for (const investigation of queueRows) {
      const action = investigation.recommendedAction;
      if (action && action in counts) {
        counts[action as RecommendedAction] += 1;
      }
    }
    return counts;
  }, [queueRows]);

  const surfaces = useMemo(() => {
    const seen = new Set<string>();
    const labels: string[] = [];
    for (const investigation of queueRows) {
      const surface = investigation.affectedSurface?.trim();
      if (surface && !seen.has(surface)) {
        seen.add(surface);
        labels.push(surface);
      }
    }
    return labels;
  }, [queueRows]);

  const filtered = useMemo(
    () =>
      queueRows.filter((investigation) => {
        if (!matchesBucket(investigation, selectedBucket)) return false;
        if (surfaceFilter && investigation.affectedSurface !== surfaceFilter) return false;
        return true;
      }),
    [queueRows, selectedBucket, surfaceFilter]
  );

  const grouped = useMemo(() => {
    const groups: Array<{
      id: RecommendedAction;
      label: string;
      items: Investigation[];
    }> = [];
    for (const bucket of BRIEF_CONTAINER_BUCKETS) {
      const items = filtered.filter(
        (investigation) => investigation.recommendedAction === bucket.id
      );
      if (items.length > 0) {
        groups.push({ ...bucket, items });
      }
    }
    return groups;
  }, [filtered]);

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
              {i18n.greetingEmphasis(queueRows.length)}
            </span>
          </>
        }
        subtitle={
          autoResolvedCount > 0 ? i18n.autonomousSubline(autoResolvedCount) : i18n.CLEAR_SUBLINE
        }
      />

      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            color={selectedBucket === 'all' ? 'primary' : 'text'}
            flush="both"
            onClick={() => setSelectedBucket('all')}
          >
            {i18n.ALL_BUCKET}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {BRIEF_CONTAINER_BUCKETS.map((bucket) => (
          <EuiFlexItem key={bucket.id} grow={false}>
            <EuiButton
              size="s"
              color={BUCKET_COLORS[bucket.id] as 'danger' | 'warning' | 'primary' | 'accent'}
              fill={selectedBucket === bucket.id}
              onClick={() =>
                setSelectedBucket((current) => (current === bucket.id ? 'all' : bucket.id))
              }
            >
              {bucket.label} {bucketCounts[bucket.id]}
            </EuiButton>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {surfaces.length > 0 ? (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup
            gutterSize="s"
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

      {!isLoading && !error && filtered.length === 0 ? (
        <EuiEmptyPrompt iconType="visTagCloud" title={<h2>{i18n.EMPTY_BRIEFING_QUEUE}</h2>} />
      ) : null}

      {!isLoading && !error
        ? grouped.map((group) => (
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
