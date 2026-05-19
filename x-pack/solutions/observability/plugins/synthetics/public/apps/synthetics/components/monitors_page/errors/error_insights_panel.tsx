/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useContext } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiBadge,
  EuiToolTip,
  EuiIcon,
  EuiSkeletonRectangle,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ErrorInsights } from '../../../../../../common/runtime_types';
import { useUrlParams, useGetUrlParams } from '../../../hooks';
import { SyntheticsRefreshContext } from '../../../contexts';

export const ErrorInsightsPanel = ({
  insights,
  loading,
}: {
  insights: ErrorInsights | null;
  loading: boolean;
}) => {
  const [, updateUrl] = useUrlParams();
  const urlParams = useGetUrlParams();
  const { refreshApp } = useContext(SyntheticsRefreshContext);

  const filterByTag = useCallback(
    (tag: string) => {
      const current = urlParams.tags ?? [];
      const already = Array.isArray(current) ? current.includes(tag) : current === tag;
      if (!already) {
        const newTags = Array.isArray(current) ? [...current, tag] : [tag];
        updateUrl({ tags: JSON.stringify(newTags) } as any);
        refreshApp();
      }
    },
    [urlParams.tags, updateUrl, refreshApp]
  );

  const filterByMonitorType = useCallback(
    (monitorType: string) => {
      const current = urlParams.monitorTypes ?? [];
      const already = Array.isArray(current)
        ? current.includes(monitorType)
        : current === monitorType;
      if (!already) {
        const newTypes = Array.isArray(current) ? [...current, monitorType] : [monitorType];
        updateUrl({ monitorTypes: JSON.stringify(newTypes) } as any);
        refreshApp();
      }
    },
    [urlParams.monitorTypes, updateUrl, refreshApp]
  );

  const filterByQuery = useCallback(
    (queryStr: string) => {
      updateUrl({ query: queryStr });
      refreshApp();
    },
    [updateUrl, refreshApp]
  );

  if (loading && !insights) {
    return (
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiText size="xs">
          <h5>{TITLE}</h5>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="m">
          {[1, 2, 3, 4].map((n) => (
            <EuiFlexItem key={n}>
              <EuiSkeletonRectangle width="100%" height="120px" />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }

  if (!insights) return null;

  const hasStatusCodes = insights.statusCodes.length > 0;
  const hasEmergingTerms = insights.emergingTerms.length > 0;

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiText size="xs">
        <h5>{TITLE}</h5>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" wrap>
        {hasEmergingTerms && (
          <EuiFlexItem grow={3} style={{ minWidth: 320 }}>
            <EmergingTermsCard terms={insights.emergingTerms} onFilter={filterByQuery} />
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={2} style={{ minWidth: 280 }}>
          <FailingDomainsCard domains={insights.failingDomains} onFilter={filterByQuery} />
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
          <MonitorTypeCard types={insights.monitorTypeStats} onFilter={filterByMonitorType} />
        </EuiFlexItem>
        <EuiFlexItem grow={1} style={{ minWidth: 200 }}>
          <TagBreakdownCard tags={insights.tagStats} onFilter={filterByTag} />
        </EuiFlexItem>
        {hasStatusCodes && (
          <EuiFlexItem grow={1} style={{ minWidth: 180 }}>
            <StatusCodesCard codes={insights.statusCodes} onFilter={filterByQuery} />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const TYPE_ICONS: Record<string, string> = {
  http: 'globe',
  browser: 'videoPlayer',
  tcp: 'link',
  icmp: 'heartbeat',
};

const MAX_VISIBLE_TAGS = 6;

const clickableRow = css`
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: 0 -4px;
  &:hover {
    background: rgba(0, 0, 0, 0.05);
  }
`;

const MonitorTypeCard = ({
  types,
  onFilter,
}: {
  types: Array<{ monitorType: string; downChecks: number; totalChecks: number; errorRate: number }>;
  onFilter: (type: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  if (!types.length) return null;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {MONITOR_TYPE_TITLE}
      </EuiText>
      <EuiSpacer size="xs" />
      {types.map((t) => {
        const pct = (t.errorRate * 100).toFixed(0);
        const barColor =
          t.errorRate >= 0.5
            ? euiTheme.colors.danger
            : t.errorRate >= 0.2
            ? euiTheme.colors.warning
            : euiTheme.colors.success;
        return (
          <EuiToolTip key={t.monitorType} content={FILTER_BY_TYPE_HINT}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={css`
                ${clickableRow};
                margin-bottom: 6px;
              `}
              onClick={() => onFilter(t.monitorType)}
            >
              <EuiFlexItem
                grow={false}
                css={css`
                  width: 80px;
                `}
              >
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon
                      type={TYPE_ICONS[t.monitorType] ?? 'dot'}
                      size="s"
                      aria-hidden={true}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem>
                    <EuiText size="xs">{t.monitorType}</EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <div
                  css={css`
                    height: 20px;
                    background: ${euiTheme.colors.lightShade};
                    border-radius: ${euiTheme.border.radius.small};
                    overflow: hidden;
                  `}
                >
                  <div
                    css={css`
                      height: 100%;
                      width: ${pct}%;
                      background: ${barColor};
                      border-radius: ${euiTheme.border.radius.small};
                      transition: width 0.3s ease;
                    `}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                css={css`
                  width: 45px;
                  text-align: right;
                `}
              >
                <EuiText
                  size="xs"
                  css={css`
                    font-weight: ${euiTheme.font.weight.semiBold};
                    color: ${barColor};
                  `}
                >
                  {pct}%
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiToolTip>
        );
      })}
    </EuiPanel>
  );
};

const FailingDomainsCard = ({
  domains,
  onFilter,
}: {
  domains: Array<{ domain: string; count: number }>;
  onFilter: (query: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  if (!domains.length) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {DOMAINS_TITLE}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {NO_DATA}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {DOMAINS_TITLE}
      </EuiText>
      <EuiSpacer size="xs" />
      {domains.slice(0, 5).map((d) => (
        <EuiFlexGroup
          key={d.domain}
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={css`
            margin-bottom: 6px;
          `}
        >
          <EuiFlexItem>
            <EuiToolTip content={FILTER_BY_DOMAIN_HINT}>
              <EuiLink
                data-test-subj="syntheticsFailingDomainsCardLink"
                onClick={() => onFilter(d.domain)}
                css={css`
                  font-size: 12px;
                `}
                className="eui-textTruncate"
                title={d.domain}
              >
                {d.domain}
              </EuiLink>
            </EuiToolTip>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">{d.count}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ))}
    </EuiPanel>
  );
};

const TagBreakdownCard = ({
  tags,
  onFilter,
}: {
  tags: Array<{ tag: string; downChecks: number; totalChecks: number; errorRate: number }>;
  onFilter: (tag: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();

  if (!tags.length) {
    return (
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {TAGS_TITLE}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiText size="xs" color="subdued">
          {NO_TAGS}
        </EuiText>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {TAGS_TITLE}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {tags.slice(0, MAX_VISIBLE_TAGS).map((t) => {
          const pct = (t.errorRate * 100).toFixed(0);
          const badgeColor =
            t.errorRate >= 0.5 ? 'danger' : t.errorRate >= 0.2 ? 'warning' : 'hollow';
          return (
            <EuiFlexItem key={t.tag} grow={false}>
              <EuiToolTip
                content={`${t.downChecks} errors / ${t.totalChecks} checks (${pct}%) — ${CLICK_TO_FILTER}`}
              >
                <EuiBadge
                  color={badgeColor}
                  onClick={() => onFilter(t.tag)}
                  onClickAriaLabel={`${FILTER_BY_TAG_HINT}: ${t.tag}`}
                  css={css`
                    cursor: pointer;
                  `}
                >
                  {t.tag}: {t.downChecks}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          );
        })}
        {tags.length > MAX_VISIBLE_TAGS && (
          <EuiFlexItem grow={false}>
            <EuiToolTip
              content={tags
                .slice(MAX_VISIBLE_TAGS)
                .map((t) => `${t.tag}: ${t.downChecks}`)
                .join(', ')}
            >
              <EuiBadge color="hollow">
                +{tags.length - MAX_VISIBLE_TAGS}{' '}
                {i18n.translate('xpack.synthetics.tagBreakdownCard.moreBadgeLabel', {
                  defaultMessage: 'more',
                })}
              </EuiBadge>
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const StatusCodesCard = ({
  codes,
  onFilter,
}: {
  codes: Array<{ statusCode: number; count: number }>;
  onFilter: (query: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const totalErrors = codes.reduce((sum, c) => sum + c.count, 0);

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
      <EuiText
        size="xs"
        css={css`
          font-weight: ${euiTheme.font.weight.semiBold};
        `}
      >
        {STATUS_CODES_TITLE}
      </EuiText>
      <EuiSpacer size="xs" />
      {codes.slice(0, 5).map((c) => {
        const pct = totalErrors > 0 ? Math.round((c.count / totalErrors) * 100) : 0;
        const codeColor =
          c.statusCode >= 500 ? 'danger' : c.statusCode >= 400 ? 'warning' : 'hollow';
        return (
          <EuiToolTip key={c.statusCode} content={FILTER_BY_CODE_HINT}>
            <EuiFlexGroup
              alignItems="center"
              gutterSize="s"
              responsive={false}
              css={css`
                ${clickableRow};
                margin-bottom: 6px;
              `}
              onClick={() => onFilter(String(c.statusCode))}
            >
              <EuiFlexItem grow={false}>
                <EuiBadge color={codeColor}>{c.statusCode}</EuiBadge>
              </EuiFlexItem>
              <EuiFlexItem>
                <div
                  css={css`
                    height: 18px;
                    background: ${euiTheme.colors.lightShade};
                    border-radius: ${euiTheme.border.radius.small};
                    overflow: hidden;
                  `}
                >
                  <div
                    css={css`
                      height: 100%;
                      width: ${pct}%;
                      background: ${codeColor === 'danger'
                        ? euiTheme.colors.danger
                        : codeColor === 'warning'
                        ? euiTheme.colors.warning
                        : euiTheme.colors.mediumShade};
                      border-radius: ${euiTheme.border.radius.small};
                    `}
                  />
                </div>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">{c.count}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiToolTip>
        );
      })}
    </EuiPanel>
  );
};

const EmergingTermsCard = ({
  terms,
  onFilter,
}: {
  terms: Array<{ term: string; score: number; foregroundCount: number; backgroundCount: number }>;
  onFilter: (query: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const maxCount = terms[0]?.foregroundCount ?? 1;

  return (
    <EuiPanel hasBorder={false} hasShadow={false} paddingSize="s" color="subdued">
      <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" size="s" color="accent" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText
            size="xs"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
            `}
          >
            {EMERGING_TITLE}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xs" />
      <EuiFlexGroup direction="column" gutterSize="xs">
        {terms.slice(0, 5).map((t) => {
          const truncated = t.term.length > 80 ? t.term.substring(0, 80) + '...' : t.term;
          const intensity = t.foregroundCount / maxCount;
          const badgeColor = intensity >= 0.7 ? 'danger' : intensity >= 0.3 ? 'warning' : 'hollow';
          return (
            <EuiFlexItem key={t.term} grow={false}>
              <EuiToolTip content={`${t.foregroundCount} occurrences — ${CLICK_TO_FILTER}`}>
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  css={clickableRow}
                  onClick={() => {
                    const firstWord =
                      t.term.split(/\s+/).find((w) => w.length > 3) ?? t.term.split(/\s+/)[0];
                    onFilter(firstWord);
                  }}
                >
                  <EuiFlexItem grow={false}>
                    <EuiBadge color={badgeColor}>{t.foregroundCount}</EuiBadge>
                  </EuiFlexItem>
                  <EuiFlexItem style={{ minWidth: 0 }}>
                    <EuiText size="xs" className="eui-textTruncate" title={t.term}>
                      {truncated}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiToolTip>
            </EuiFlexItem>
          );
        })}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const TITLE = i18n.translate('xpack.synthetics.errorInsights.title', {
  defaultMessage: 'Error insights',
});

const MONITOR_TYPE_TITLE = i18n.translate('xpack.synthetics.errorInsights.monitorType', {
  defaultMessage: 'Errors by monitor type',
});

const DOMAINS_TITLE = i18n.translate('xpack.synthetics.errorInsights.failingDomains', {
  defaultMessage: 'Failing domains',
});

const TAGS_TITLE = i18n.translate('xpack.synthetics.errorInsights.errorsByTag', {
  defaultMessage: 'Errors by tag',
});

const STATUS_CODES_TITLE = i18n.translate('xpack.synthetics.errorInsights.statusCodes', {
  defaultMessage: 'HTTP status codes',
});

const NO_DATA = i18n.translate('xpack.synthetics.errorInsights.noData', {
  defaultMessage: 'No domain data',
});

const NO_TAGS = i18n.translate('xpack.synthetics.errorInsights.noTags', {
  defaultMessage: 'No tags configured',
});

const CLICK_TO_FILTER = i18n.translate('xpack.synthetics.errorInsights.clickToFilter', {
  defaultMessage: 'Click to filter',
});

const FILTER_BY_TAG_HINT = i18n.translate('xpack.synthetics.errorInsights.filterByTag', {
  defaultMessage: 'Filter by tag',
});

const FILTER_BY_TYPE_HINT = i18n.translate('xpack.synthetics.errorInsights.filterByType', {
  defaultMessage: 'Click to filter by this monitor type',
});

const FILTER_BY_DOMAIN_HINT = i18n.translate('xpack.synthetics.errorInsights.filterByDomain', {
  defaultMessage: 'Click to search for this domain',
});

const FILTER_BY_CODE_HINT = i18n.translate('xpack.synthetics.errorInsights.filterByCode', {
  defaultMessage: 'Click to search for this status code',
});

const EMERGING_TITLE = i18n.translate('xpack.synthetics.errorInsights.emergingSignals', {
  defaultMessage: 'New in this period',
});
