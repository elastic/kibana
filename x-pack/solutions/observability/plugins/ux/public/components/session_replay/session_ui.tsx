/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  isBouncedSession,
  type RumSessionSummary,
  type SessionActivityBucket,
  type SessionClient,
  type SessionUser,
  type SessionWebVitals,
} from '../../../common/session_replay';
import { VITAL_HELP } from '../../utils/vital_help';

export const formatTime = (value: string | null): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export const formatDurationMs = (ms: number | null): string => {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return '—';
  }
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const rem = seconds % 60;
  if (minutes < 60) {
    return `${minutes}m ${rem}s`;
  }
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
};

export const formatRelativeTime = (value: string | null): string => {
  if (!value) {
    return '—';
  }
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) {
    return value;
  }
  const diffSec = Math.round((Date.now() - then) / 1000);
  if (diffSec < 5) {
    return i18n.translate('xpack.ux.sessions.time.justNow', { defaultMessage: 'just now' });
  }
  if (diffSec < 60) {
    return i18n.translate('xpack.ux.sessions.time.seconds', {
      defaultMessage: '{n}s ago',
      values: { n: diffSec },
    });
  }
  const min = Math.floor(diffSec / 60);
  if (min < 60) {
    return i18n.translate('xpack.ux.sessions.time.minutes', {
      defaultMessage: '{n}m ago',
      values: { n: min },
    });
  }
  const hr = Math.floor(min / 60);
  if (hr < 24) {
    return i18n.translate('xpack.ux.sessions.time.hours', {
      defaultMessage: '{n}h ago',
      values: { n: hr },
    });
  }
  const days = Math.floor(hr / 24);
  if (days < 30) {
    return i18n.translate('xpack.ux.sessions.time.days', {
      defaultMessage: '{n}d ago',
      values: { n: days },
    });
  }
  return new Date(value).toLocaleDateString();
};

export const durationBetween = (start: string | null, end: string | null): number | null => {
  if (!start || !end) {
    return null;
  }
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) ? ms : null;
};

export const shortenPath = (path: string, max = 42): string => {
  if (path.length <= max) {
    return path;
  }
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 2) {
    return `${path.slice(0, max - 14)}…${path.slice(-12)}`;
  }
  return `…/${parts.slice(-2).join('/')}`;
};

export const userDisplayName = (user: SessionUser): string | null =>
  user.name || user.email || user.id;

export const UserCell = ({
  user,
  client,
  onOpen,
}: {
  user: SessionUser;
  client: SessionClient;
  onOpen?: () => void;
}) => {
  const name = userDisplayName(user);
  const isAnon = !name;
  const displayName =
    name ?? i18n.translate('xpack.ux.sessions.anonymous', { defaultMessage: 'Anonymous' });
  const secondary = [client.browser, client.os].filter(Boolean).join(' · ');

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={{ minWidth: 0 }}>
      <EuiFlexItem grow={false}>
        {client.mobile ? (
          <EuiAvatar size="m" name={displayName} iconType="mobile" />
        ) : (
          <EuiAvatar size="m" name={displayName} initials={isAnon ? '?' : undefined} />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow css={{ minWidth: 0 }}>
        {onOpen ? (
          <EuiToolTip
            content={i18n.translate('xpack.ux.sessions.filterByUser', {
              defaultMessage: 'Filter sessions for this user',
            })}
          >
            <EuiLink
              data-test-subj="uxUserCellLink"
              css={{ fontWeight: 600, display: 'block', maxWidth: '100%' }}
              className="eui-textTruncate"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                onOpen();
              }}
            >
              {displayName}
            </EuiLink>
          </EuiToolTip>
        ) : (
          <EuiText size="s" css={{ fontWeight: 600 }} className="eui-textTruncate">
            {displayName}
          </EuiText>
        )}
        {secondary && (
          <EuiToolTip content={secondary}>
            <EuiText size="xs" color="subdued" className="eui-textTruncate" tabIndex={0}>
              {secondary}
            </EuiText>
          </EuiToolTip>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const Sparkline = ({
  buckets,
  height = 26,
  ariaLabel,
}: {
  buckets: SessionActivityBucket[];
  height?: number;
  ariaLabel?: string;
}) => {
  const { euiTheme } = useEuiTheme();
  if (!buckets || buckets.length === 0) {
    return (
      <EuiText size="xs" color="subdued">
        —
      </EuiText>
    );
  }
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div
      css={css`
        display: flex;
        align-items: flex-end;
        gap: 2px;
        height: ${height}px;
      `}
      aria-label={
        ariaLabel ??
        i18n.translate('xpack.ux.sessions.sparklineAria', {
          defaultMessage: 'Activity over the session',
        })
      }
    >
      {buckets.map((bucket, index) => {
        const h = Math.max(2, Math.round((bucket.count / max) * height));
        return (
          <div
            key={index}
            css={css`
              width: 4px;
              border-radius: 1px;
              height: ${h}px;
              background: ${bucket.hasError
                ? euiTheme.colors.danger
                : bucket.count > 0
                ? euiTheme.colors.primary
                : euiTheme.colors.lightShade};
            `}
          />
        );
      })}
    </div>
  );
};

export const JourneyTrail = ({
  session,
}: {
  session: Pick<RumSessionSummary, 'pagePath' | 'activityPath'>;
}) => {
  const pages = session.pagePath;
  const activities = session.activityPath;
  const trail = pages.length > 1 ? pages : activities.length > 0 ? activities : pages;

  if (trail.length === 0) {
    return (
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.ux.sessions.noJourney', { defaultMessage: 'No page path' })}
      </EuiText>
    );
  }

  // Compact form: entry → (+hidden) → exit so it always fits a single row.
  const first = trail[0];
  const last = trail[trail.length - 1];
  const hidden = trail.length - 2;

  const arrow = (
    <EuiIcon type="sortRight" size="s" color="subdued" aria-hidden={true} css={styles.trailArrow} />
  );

  return (
    <EuiToolTip content={trail.join('  →  ')}>
      <div css={styles.trail} tabIndex={0}>
        <span css={styles.step} title={first}>
          {shortenPath(first)}
        </span>
        {trail.length > 2 && (
          <>
            {arrow}
            <EuiBadge color="hollow" css={styles.trailBadge}>
              +{hidden}
            </EuiBadge>
          </>
        )}
        {trail.length > 1 && (
          <>
            {arrow}
            <span css={styles.step} title={last}>
              {shortenPath(last)}
            </span>
          </>
        )}
      </div>
    </EuiToolTip>
  );
};

export const SignalBadges = ({
  session,
}: {
  session: Pick<
    RumSessionSummary,
    'errorCount' | 'rageClickCount' | 'actionCount' | 'deadClickCount' | 'pageCount'
  >;
}) => {
  const badges: React.ReactNode[] = [];
  if (isBouncedSession(session.pageCount)) {
    badges.push(
      <EuiToolTip
        key="bounce"
        content={i18n.translate('xpack.ux.sessions.signal.bounceTip', {
          defaultMessage: 'Bounced: this session viewed exactly one page',
        })}
      >
        <EuiBadge color="hollow" tabIndex={0}>
          {i18n.translate('xpack.ux.sessions.signal.bounce', { defaultMessage: 'Bounce' })}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  if (session.errorCount > 0) {
    badges.push(
      <EuiToolTip
        key="errors"
        content={i18n.translate('xpack.ux.sessions.signal.errorsTip', {
          defaultMessage: '{count} error events in this session',
          values: { count: session.errorCount },
        })}
      >
        <EuiBadge color="danger" iconType="warning" tabIndex={0}>
          {session.errorCount}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  if (session.rageClickCount > 0) {
    badges.push(
      <EuiToolTip
        key="rage"
        content={i18n.translate('xpack.ux.sessions.signal.rageTip', {
          defaultMessage: 'Rage clicks: repeated clicks on the same element',
        })}
      >
        <EuiBadge color="warning" iconType="bolt" tabIndex={0}>
          {i18n.translate('xpack.ux.sessions.signal.rage', {
            defaultMessage: 'Rage {count}',
            values: { count: session.rageClickCount },
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  if (session.deadClickCount > 0) {
    badges.push(
      <EuiToolTip
        key="dead"
        content={i18n.translate('xpack.ux.sessions.signal.deadTip', {
          defaultMessage: 'Dead clicks: clicks with no navigation or request within 1s',
        })}
      >
        <EuiBadge color="default" iconType="faceNeutral" tabIndex={0}>
          {i18n.translate('xpack.ux.sessions.signal.dead', {
            defaultMessage: 'Dead {count}',
            values: { count: session.deadClickCount },
          })}
        </EuiBadge>
      </EuiToolTip>
    );
  }
  if (badges.length === 0) {
    return (
      <EuiBadge color="hollow" iconType="check">
        {i18n.translate('xpack.ux.sessions.signal.clean', { defaultMessage: 'Clean' })}
      </EuiBadge>
    );
  }
  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
      {badges.map((badge, index) => (
        <EuiFlexItem grow={false} key={index}>
          {badge}
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const VITAL_META: Record<
  keyof SessionWebVitals,
  { label: string; unit: 'ms' | 'score'; good: number; poor: number; tooltip: string }
> = {
  lcp: {
    label: i18n.translate('xpack.ux.inventory.lcpColumnLabel', { defaultMessage: 'LCP' }),
    unit: 'ms',
    good: 2500,
    poor: 4000,
    tooltip: VITAL_HELP.lcp,
  },
  fcp: {
    label: i18n.translate('xpack.ux.inventory.fcpColumnLabel', { defaultMessage: 'FCP' }),
    unit: 'ms',
    good: 1800,
    poor: 3000,
    tooltip: VITAL_HELP.fcp,
  },
  inp: {
    label: i18n.translate('xpack.ux.inventory.inpColumnLabel', { defaultMessage: 'INP' }),
    unit: 'ms',
    good: 200,
    poor: 500,
    tooltip: VITAL_HELP.inp,
  },
  ttfb: {
    label: i18n.translate('xpack.ux.inventory.ttfbColumnLabel', { defaultMessage: 'TTFB' }),
    unit: 'ms',
    good: 800,
    poor: 1800,
    tooltip: VITAL_HELP.ttfb,
  },
  cls: {
    label: i18n.translate('xpack.ux.inventory.clsColumnLabel', { defaultMessage: 'CLS' }),
    unit: 'score',
    good: 0.1,
    poor: 0.25,
    tooltip: VITAL_HELP.cls,
  },
};

const vitalColor = (
  name: keyof SessionWebVitals,
  value: number
): 'success' | 'warning' | 'danger' => {
  const meta = VITAL_META[name];
  if (value <= meta.good) {
    return 'success';
  }
  if (value <= meta.poor) {
    return 'warning';
  }
  return 'danger';
};

const formatVital = (name: keyof SessionWebVitals, value: number): string => {
  const meta = VITAL_META[name];
  if (meta.unit === 'score') {
    return value.toFixed(2);
  }
  return value >= 1000 ? `${(value / 1000).toFixed(2)}s` : `${Math.round(value)}ms`;
};

export const WebVitalBadges = ({ vitals }: { vitals: SessionWebVitals }) => {
  const entries = (Object.keys(VITAL_META) as Array<keyof SessionWebVitals>)
    .map((name) => ({ name, value: vitals[name] }))
    .filter(
      (entry): entry is { name: keyof SessionWebVitals; value: number } => entry.value != null
    );

  if (entries.length === 0) {
    return null;
  }

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
      {entries.map(({ name, value }) => (
        <EuiFlexItem grow={false} key={name}>
          <EuiToolTip content={VITAL_META[name].tooltip}>
            <EuiBadge color={vitalColor(name, value)} tabIndex={0}>
              {VITAL_META[name].label} {formatVital(name, value)}
            </EuiBadge>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

const styles = {
  trail: css`
    display: flex;
    align-items: center;
    gap: 4px;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
  `,
  trailArrow: css`
    flex-shrink: 0;
  `,
  trailBadge: css`
    flex-shrink: 0;
  `,
  step: css`
    flex: 0 1 auto;
    min-width: 0;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
    font-family: var(--euiCodeFontFamily, monospace);
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    background: var(--euiColorLightestShade, rgba(0, 0, 0, 0.05));
  `,
};
