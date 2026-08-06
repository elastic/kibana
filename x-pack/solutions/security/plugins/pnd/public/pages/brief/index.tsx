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
  EuiButtonIcon,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import { useHistory } from 'react-router-dom';
import type { Investigation, RecommendedAction } from '@kbn/pnd-common';
import { PndPageSection } from '../../components/layout/pnd_page_section';
import { PndPageHeader } from '../../components/pnd_page_header';
import { usePndDocTitle } from '../../hooks/use_pnd_doc_title';
import { useInvestigations } from '../../hooks/use_investigations_api';
import * as i18n from './translations';

const QUEUE_STATUSES = new Set(['open', 'investigating', 'in-progress', 'escalated']);
const AUTO_RESOLVED_STATUSES = new Set(['auto-resolved', 'closed']);

const BUCKET_COLORS: Record<Exclude<i18n.BriefBucket, 'all'>, string> = {
  contain: 'danger',
  escalate: 'warning',
  investigate: 'primary',
  tune: 'accent',
};

const isQueueRow = (investigation: Investigation): boolean =>
  QUEUE_STATUSES.has(investigation.status ?? 'open');

const isAutoResolved = (investigation: Investigation): boolean =>
  AUTO_RESOLVED_STATUSES.has(investigation.status ?? '');

const matchesBucket = (investigation: Investigation, bucket: i18n.BriefBucket): boolean => {
  if (bucket === 'all') return true;
  return investigation.recommendedAction === bucket;
};

const BriefCard: React.FC<{
  investigation: Investigation;
  accent: string;
  onOpen: () => void;
  onOpenChat: () => void;
}> = ({ investigation, accent, onOpen, onOpenChat }) => {
  const inMotion = investigation.status === 'in-progress';

  return (
    <EuiPanel
      paddingSize="m"
      hasBorder
      onClick={onOpen}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={investigation.title}
      css={css`
        cursor: pointer;
        border-left: 3px solid ${accent};
      `}
    >
      <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
        {investigation.priorityScore != null ? (
          <EuiFlexItem grow={false}>
            <EuiText size="m">
              <strong>{investigation.priorityScore}</strong>
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem>
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiTitle size="xs">
                <h3>{investigation.title}</h3>
              </EuiTitle>
            </EuiFlexItem>
            {investigation.recordId ? (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {investigation.recordId}
                </EuiText>
              </EuiFlexItem>
            ) : null}
            {inMotion ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{i18n.IN_MOTION}</EuiBadge>
              </EuiFlexItem>
            ) : null}
            {investigation.pendingProposalCount > 0 ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="warning">
                  {i18n.pendingProposalsLabel(investigation.pendingProposalCount)}
                </EuiBadge>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedRelative value={investigation.updatedAt} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          {investigation.summary ? (
            <>
              <EuiSpacer size="xs" />
              <EuiText size="s" color="subdued">
                <p>{investigation.summary}</p>
              </EuiText>
            </>
          ) : null}
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <strong>{i18n.WATCHED_BY}</strong> {i18n.watchTierLabel(investigation.watch_tier)}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow />
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color={inMotion ? 'text' : 'primary'}
                onClick={(event: React.MouseEvent) => {
                  event.stopPropagation();
                  onOpen();
                }}
              >
                {investigation.primaryActionLabel ?? i18n.DEFAULT_ACTION}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip content={i18n.OPEN_CHAT} disableScreenReaderOutput>
                <EuiButtonIcon
                  aria-label={i18n.OPEN_CHAT}
                  iconType="comment"
                  color="text"
                  onClick={(event: React.MouseEvent) => {
                    event.stopPropagation();
                    onOpenChat();
                  }}
                />
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const BriefPage: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const history = useHistory();
  const { data, isLoading, error } = useInvestigations();
  const [selectedBucket, setSelectedBucket] = useState<i18n.BriefBucket>('all');
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
    const counts: Record<Exclude<i18n.BriefBucket, 'all'>, number> = {
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
      id: Exclude<i18n.BriefBucket, 'all'>;
      label: string;
      items: Investigation[];
    }> = [];
    for (const bucket of i18n.BRIEF_BUCKETS) {
      const items = filtered.filter(
        (investigation) => investigation.recommendedAction === bucket.id
      );
      if (items.length > 0) {
        groups.push({ ...bucket, items });
      }
    }
    return groups;
  }, [filtered]);

  const bucketAccent = (bucket: Exclude<i18n.BriefBucket, 'all'>): string => {
    switch (bucket) {
      case 'contain':
        return euiTheme.colors.danger;
      case 'escalate':
        return euiTheme.colors.warning;
      case 'investigate':
        return euiTheme.colors.primary;
      case 'tune':
        return euiTheme.colors.accent;
      default:
        return euiTheme.border.color;
    }
  };

  return (
    <PndPageSection>
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
        {i18n.BRIEF_BUCKETS.map((bucket) => (
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

      {error ? <EuiEmptyPrompt iconType="warning" title={<h2>{i18n.LOAD_ERROR}</h2>} /> : null}

      {!isLoading && !error && filtered.length === 0 ? (
        <EuiEmptyPrompt iconType="visTagCloud" title={<h2>{i18n.EMPTY_BUCKET}</h2>} />
      ) : null}

      {!isLoading && !error
        ? grouped.map((group) => (
            <div key={group.id} css={{ marginBottom: euiTheme.size.l }}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiBadge
                    color={BUCKET_COLORS[group.id] as 'danger' | 'warning' | 'primary' | 'accent'}
                  >
                    {group.label}
                  </EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="s" color="subdued">
                    {group.items.length}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <FormattedMessage
                      id="xpack.pnd.brief.sectionBlurb"
                      defaultMessage="{count, plural, one {# investigation} other {# investigations}}"
                      values={{ count: group.items.length }}
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="s" />
              <EuiFlexGroup direction="column" gutterSize="m" responsive={false}>
                {group.items.map((investigation) => (
                  <EuiFlexItem key={investigation.id} grow={false}>
                    <BriefCard
                      investigation={investigation}
                      accent={bucketAccent(group.id)}
                      onOpen={() => history.push(`/investigations/${investigation.id}`)}
                      onOpenChat={() => history.push('/chats')}
                    />
                  </EuiFlexItem>
                ))}
              </EuiFlexGroup>
            </div>
          ))
        : null}
    </PndPageSection>
  );
};
