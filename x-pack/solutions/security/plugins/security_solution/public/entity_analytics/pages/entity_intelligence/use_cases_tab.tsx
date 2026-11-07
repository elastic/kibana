/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiIcon,
  EuiLink,
  EuiSkeletonText,
  EuiSpacer,
  EuiText,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import { SecurityPageName } from '../../../app/types';
import { useGetSecuritySolutionUrl } from '../../../common/components/link_to';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useLicense } from '../../../common/hooks/use_license';
import { useIsExperimentalFeatureEnabled } from '../../../common/hooks/use_experimental_features';
import { useSecurityMlModuleJobIds } from '../../../common/components/ml/hooks/use_security_ml_module_job_ids';
import { useEntityAnalyticsRoutes } from '../../api/api';
import { useGetWatchlists } from '../../api/hooks/use_get_watchlists';
import { useRiskEngineStatus } from '../../api/hooks/use_risk_engine_status';
import { usePrivilegedMonitoringEngineStatus } from '../../hooks/use_privileged_monitoring_health';
import { useHuntingLeads } from '../../components/threat_hunting/top_threat_hunting_leads/use_hunting_leads';
import { EntityType } from '../../../../common/entity_analytics/types';
import { TabId } from '../entity_analytics_management_page';
import { useEntityStoreStats } from './hooks/use_entity_store_stats';
import { useDefaultAiConnector } from './hooks/use_default_ai_connector';
import { getUseCaseStatus } from './use_cases_status';

const ACTIVE_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.useCases.statusActive',
  { defaultMessage: 'Active' }
);

const NOT_CONFIGURED_LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.intelligence.useCases.statusNotConfigured',
  { defaultMessage: 'Not configured' }
);

interface UseCaseCard {
  id: string;
  icon: string;
  title: string;
  description: string;
  stat: string | undefined;
  statLabel: string;
  isLoading: boolean;
  isActive: boolean | undefined;
  isError?: boolean;
  activeLabel?: string;
  linkText: string;
  href: string;
}

const UseCaseCardView: React.FC<{ card: UseCaseCard }> = ({ card }) => {
  const { euiTheme } = useEuiTheme();
  const status = getUseCaseStatus(card);

  const cardStyle = css`
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: ${euiTheme.size.base};
    border: ${euiTheme.border.thin};
    border-radius: ${euiTheme.border.radius.medium};
    background: linear-gradient(
      160deg,
      ${transparentize(euiTheme.colors.primary, card.isActive ? 0.06 : 0.02)},
      transparent 55%
    );
  `;

  const headerStyle = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;

  const iconWrapperStyle = css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: ${euiTheme.size.xl};
    height: ${euiTheme.size.xl};
    border-radius: ${euiTheme.border.radius.small};
    background: ${transparentize(euiTheme.colors.primary, 0.12)};
  `;

  const titleStyle = css`
    flex: 1;
    font-size: ${euiTheme.font.scale.s * 16}px;
    font-weight: ${euiTheme.font.weight.semiBold};
    color: ${euiTheme.colors.textHeading};
  `;

  const statStyle = css`
    font-size: 24px;
    font-weight: ${euiTheme.font.weight.bold};
    font-variant-numeric: tabular-nums;
    color: ${euiTheme.colors.textHeading};
  `;

  const statLabelStyle = css`
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${euiTheme.colors.textSubdued};
  `;

  const footerStyle = css`
    margin-top: auto;
    padding-top: ${euiTheme.size.m};
  `;

  return (
    <div css={cardStyle} data-test-subj={`entityIntelligenceUseCase-${card.id}`}>
      <div css={headerStyle}>
        <span css={iconWrapperStyle}>
          <EuiIcon type={card.icon} size="m" color="primary" aria-hidden={true} />
        </span>
        <span css={titleStyle}>{card.title}</span>
        <EuiBadge color={status === 'active' ? 'success' : 'hollow'}>
          {status === 'loading'
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.useCases.statusLoading',
                { defaultMessage: 'Loading' }
              )
            : status === 'unavailable'
            ? i18n.translate(
                'xpack.securitySolution.entityAnalytics.intelligence.useCases.statusUnavailable',
                { defaultMessage: 'Unavailable' }
              )
            : status === 'active'
            ? card.activeLabel ?? ACTIVE_LABEL
            : NOT_CONFIGURED_LABEL}
        </EuiBadge>
      </div>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued">
        <p>{card.description}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <div>
        <div css={statStyle}>
          {card.isLoading ? <EuiSkeletonText lines={2} /> : card.isError ? '—' : card.stat ?? '—'}
        </div>
        <div css={statLabelStyle}>{card.statLabel}</div>
      </div>
      <div css={footerStyle}>
        <EuiLink href={card.href}>{card.linkText}</EuiLink>
      </div>
    </div>
  );
};

export const UseCasesTab: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const spaceId = useSpaceId();
  const resolvedSpaceId = spaceId ?? 'default';
  const getSecuritySolutionUrl = useGetSecuritySolutionUrl();

  const {
    data: watchlists,
    isLoading: isWatchlistsLoading,
    isError: isWatchlistsError,
  } = useGetWatchlists();
  const {
    data: riskEngineStatus,
    isLoading: isRiskEngineLoading,
    isError: isRiskEngineError,
  } = useRiskEngineStatus();
  const {
    data: privMonHealth,
    isLoading: isPrivMonLoading,
    isError: isPrivMonError,
  } = usePrivilegedMonitoringEngineStatus();
  const { jobIds, loading: isJobsLoading } = useSecurityMlModuleJobIds();
  const { stats, isLoading: isStatsLoading, isError: isStatsError } = useEntityStoreStats(spaceId);

  const isEnterprise = useLicense().isEnterprise();
  const leadGenerationEnabled =
    useIsExperimentalFeatureEnabled('leadGenerationEnabled') && isEnterprise;
  const { connectorId } = useDefaultAiConnector();
  const {
    totalCount: leadsCount,
    isLoading: isLeadsLoading,
    hasGenerated,
    isError: isLeadsError,
  } = useHuntingLeads(connectorId, leadGenerationEnabled, resolvedSpaceId);

  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();
  const {
    data: criticalityAssigned,
    isLoading: isCriticalityLoading,
    isError: isCriticalityError,
  } = useQuery(
    ['entityIntelligenceCriticalityCoverage'],
    ({ signal }) =>
      fetchEntitiesListV2({
        signal,
        params: {
          entityTypes: [EntityType.user, EntityType.host, EntityType.service],
          page: 1,
          perPage: 1,
          filterQuery: 'asset.criticality: * and not asset.criticality: "deleted"',
        },
      }),
    { retry: 1, refetchOnWindowFocus: false }
  );

  const cards = useMemo<UseCaseCard[]>(() => {
    const riskEngineEnabled = riskEngineStatus?.risk_engine_status === 'ENABLED';
    const privMonUserCount = privMonHealth?.users?.current_count;
    const criticalityCount = criticalityAssigned?.total;
    const totalEntities = stats?.totalEntities;

    return [
      {
        id: 'privileged_user_monitoring',
        icon: 'user',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.privMon.title',
          { defaultMessage: 'Privileged User Monitoring' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.privMon.description',
          {
            defaultMessage:
              'Track high-value accounts for misuse, dormant activity, and privilege abuse.',
          }
        ),
        stat: privMonUserCount !== undefined ? privMonUserCount.toLocaleString() : undefined,
        statLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.privMon.statLabel',
          { defaultMessage: 'Privileged users monitored' }
        ),
        isLoading: isPrivMonLoading,
        isActive: privMonHealth ? privMonHealth.status === 'started' : undefined,
        isError: isPrivMonError,
        linkText: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.privMon.link',
          { defaultMessage: 'Open privileged user monitoring' }
        ),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.entityAnalyticsPrivilegedUserMonitoring,
        }),
      },
      {
        id: 'watchlists',
        icon: 'watchesApp',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.watchlists.title',
          { defaultMessage: 'Watchlist Monitoring' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.watchlists.description',
          {
            defaultMessage:
              'Group entities of interest — leavers, contractors, VIPs — and monitor their risk together.',
          }
        ),
        stat: watchlists !== undefined ? watchlists.length.toLocaleString() : undefined,
        statLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.watchlists.statLabel',
          { defaultMessage: 'Watchlists defined' }
        ),
        isLoading: isWatchlistsLoading,
        isActive: watchlists ? watchlists.length > 0 : undefined,
        isError: isWatchlistsError,
        linkText: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.watchlists.link',
          { defaultMessage: 'Manage watchlists' }
        ),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.entityAnalyticsManagement,
          path: `/${TabId.Watchlists}`,
        }),
      },
      {
        id: 'asset_criticality',
        icon: 'stats',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.criticality.title',
          { defaultMessage: 'Asset Criticality Coverage' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.criticality.description',
          {
            defaultMessage:
              'Assign business impact tiers so risk scoring can weight your crown jewels correctly.',
          }
        ),
        stat:
          criticalityCount !== undefined && totalEntities !== undefined
            ? `${criticalityCount.toLocaleString()} / ${totalEntities.toLocaleString()}`
            : undefined,
        statLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.criticality.statLabel',
          { defaultMessage: 'Entities with criticality assigned' }
        ),
        isLoading: isCriticalityLoading || isStatsLoading,
        isActive: criticalityCount !== undefined ? criticalityCount > 0 : undefined,
        isError: isCriticalityError || isStatsError,
        linkText: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.criticality.link',
          { defaultMessage: 'Configure asset criticality' }
        ),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.entityAnalyticsManagement,
          path: `/${TabId.AssetCriticality}`,
        }),
      },
      {
        id: 'anomaly_jobs',
        icon: 'chartAnomaly',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.anomalyJobs.title',
          { defaultMessage: 'Anomaly Detection Jobs' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.anomalyJobs.description',
          {
            defaultMessage:
              'ML jobs baseline entity behavior and surface deviations that feed risk scoring.',
          }
        ),
        stat: jobIds.length > 0 ? jobIds.length.toLocaleString() : undefined,
        statLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.anomalyJobs.statLabel',
          { defaultMessage: 'Security ML jobs available' }
        ),
        isLoading: isJobsLoading,
        isActive: jobIds.length > 0 ? true : undefined,
        activeLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.statusAvailable',
          { defaultMessage: 'Available' }
        ),
        linkText: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.anomalyJobs.link',
          { defaultMessage: 'View entity analytics dashboard' }
        ),
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.entityAnalytics }),
      },
      {
        id: 'risk_engine',
        icon: 'visGauge',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.riskEngine.title',
          { defaultMessage: 'Risk Scoring Engine' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.riskEngine.description',
          {
            defaultMessage:
              'Continuously scores every entity from alerts, anomalies, and asset criticality.',
          }
        ),
        stat: riskEngineStatus
          ? riskEngineEnabled
            ? ACTIVE_LABEL
            : NOT_CONFIGURED_LABEL
          : undefined,
        statLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.riskEngine.statLabel',
          { defaultMessage: 'Engine status' }
        ),
        isLoading: isRiskEngineLoading,
        isActive: riskEngineStatus ? riskEngineEnabled : undefined,
        isError: isRiskEngineError,
        linkText: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.riskEngine.link',
          { defaultMessage: 'Manage risk engine' }
        ),
        href: getSecuritySolutionUrl({
          deepLinkId: SecurityPageName.entityAnalyticsManagement,
          path: `/${TabId.RiskScore}`,
        }),
      },
      {
        id: 'hunting_leads',
        icon: 'bullseye',
        title: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.leads.title',
          { defaultMessage: 'Threat Hunting Leads' }
        ),
        description: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.leads.description',
          {
            defaultMessage:
              'AI-generated hunting hypotheses built from anomalies, risk shifts, and alert patterns.',
          }
        ),
        stat: leadGenerationEnabled ? leadsCount.toLocaleString() : undefined,
        statLabel: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.leads.statLabel',
          { defaultMessage: 'Open hunting leads' }
        ),
        isLoading: leadGenerationEnabled && isLeadsLoading,
        isActive: leadGenerationEnabled && hasGenerated,
        isError: isLeadsError,
        linkText: i18n.translate(
          'xpack.securitySolution.entityAnalytics.intelligence.useCases.leads.link',
          { defaultMessage: 'Open entity analytics home' }
        ),
        href: getSecuritySolutionUrl({ deepLinkId: SecurityPageName.entityAnalyticsHomePage }),
      },
    ];
  }, [
    riskEngineStatus,
    privMonHealth,
    criticalityAssigned?.total,
    stats?.totalEntities,
    watchlists,
    jobIds,
    leadsCount,
    hasGenerated,
    leadGenerationEnabled,
    isPrivMonLoading,
    isWatchlistsLoading,
    isCriticalityLoading,
    isStatsLoading,
    isJobsLoading,
    isRiskEngineLoading,
    isLeadsLoading,
    getSecuritySolutionUrl,
    isPrivMonError,
    isWatchlistsError,
    isCriticalityError,
    isStatsError,
    isRiskEngineError,
    isLeadsError,
  ]);

  const gridStyle = css`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
    gap: ${euiTheme.size.m};
  `;

  return (
    <div css={gridStyle} data-test-subj="entityIntelligenceUseCasesTab">
      {cards.map((card) => (
        <UseCaseCardView key={card.id} card={card} />
      ))}
    </div>
  );
};
