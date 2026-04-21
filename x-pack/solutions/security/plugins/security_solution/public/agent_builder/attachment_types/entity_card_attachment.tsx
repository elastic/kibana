/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiBasicTable,
  EuiBadge,
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiLink,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { capitalize } from 'lodash/fp';
import { i18n } from '@kbn/i18n';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
  AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-plugin/public';
import type { EntityCardAttachmentData } from '../../../common/agent_builder/entity_card_attachment_schema';
import type { CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
import { EntityType } from '../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../common/search_strategy';
import {
  APP_UI_ID,
  SecurityAgentBuilderAttachments,
  SecurityPageName,
} from '../../../common/constants';
import {
  FormattedRelativePreferenceDate,
  PreferenceFormattedDate,
} from '../../common/components/formatted_date';
import { getEmptyTagValue } from '../../common/components/empty_value';
import { getHostDetailsUrl, getTabsOnUsersDetailsUrl } from '../../common/components/link_to';
import { FlyoutBody } from '../../flyout/shared/components/flyout_body';
import { FlyoutHeader } from '../../flyout/shared/components/flyout_header';
import { EntitySourceBadge } from '../../flyout/entity_details/shared/components/entity_source_badge';
import { RiskLevelBadge } from '../../flyout/entity_details/shared/components/risk_level_badge';
import { ONE_WEEK_IN_HOURS } from '../../flyout/entity_details/shared/constants';
import type { IdentityFields } from '../../flyout/document_details/shared/utils';
import { FlyoutTitle } from '../../flyout_v2/shared/components/flyout_title';
import { ExpandablePanel } from '../../flyout_v2/shared/components/expandable_panel';
import { formatRiskScore } from '../../entity_analytics/common';
import { AssetCriticalityBadge } from '../../entity_analytics/components/asset_criticality/asset_criticality_badge';
import { CRITICALITY_LEVEL_TITLE } from '../../entity_analytics/components/asset_criticality/translations';
import {
  columnsArray,
  SUMMARY_TABLE_MIN_WIDTH,
} from '../../entity_analytics/components/risk_summary_flyout/common';
import {
  RESOLUTION_GROUP_LINK_TITLE,
  RESOLUTION_SECTION_TITLE,
} from '../../entity_analytics/components/entity_resolution/translations';
import { EntityIconByType } from '../../entity_analytics/components/entity_store/helpers';
import { UsersTableType } from '../../explore/users/store/model';
import {
  getHostNameForHostDetailsUrl,
  getUserNameForUserDetailsUrl,
  navigateToSecurityEntityInApp,
  type SecurityAgentBuilderChrome,
} from './entity_explore_navigation';

export type EntityCardAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.entityCard,
  EntityCardAttachmentData
>;

const rootCanvasStyles = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minWidth: 0,
  minHeight: 400,
});

const linkTitleCSS = { width: 'fit-content' as const };

const parseRiskLevel = (raw?: string): RiskSeverity => {
  if (!raw) {
    return RiskSeverity.Unknown;
  }
  const normalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  const allowed = Object.values(RiskSeverity) as string[];
  if (allowed.includes(normalized)) {
    return normalized as RiskSeverity;
  }
  return RiskSeverity.Unknown;
};

const parseCriticalityLevel = (raw?: string): CriticalityLevelWithUnassigned => {
  if (!raw) {
    return 'unassigned';
  }
  if (raw in CRITICALITY_LEVEL_TITLE) {
    return raw as CriticalityLevelWithUnassigned;
  }
  return 'unassigned';
};

const getIdentityFields = (data: EntityCardAttachmentData): IdentityFields | undefined => {
  const exploreRow = {
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    entity_name: data.entity_name,
    source: data.source,
  };
  if (data.entity_type === EntityType.host) {
    return { 'host.name': getHostNameForHostDetailsUrl(exploreRow) };
  }
  if (data.entity_type === EntityType.user) {
    return { 'user.name': getUserNameForUserDetailsUrl(exploreRow) };
  }
  const name = data.entity_name ?? data.entity_id;
  if (data.entity_type === EntityType.service) {
    return { 'service.name': name };
  }
  return undefined;
};

const SummaryTile: React.FC<{ label: React.ReactNode; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <EuiPanel hasBorder paddingSize="m" css={{ minWidth: 0 }}>
    <EuiText size="s">
      <strong>{label}</strong>
    </EuiText>
    <EuiSpacer size="xs" />
    {children}
  </EuiPanel>
);

const EntityCardFlyoutPrimaryTitle: React.FC<{
  data: EntityCardAttachmentData;
  application: ApplicationStart;
}> = ({ data, application }) => {
  const exploreRow = {
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    entity_name: data.entity_name,
    source: data.source,
  };
  const displayName = data.entity_name ?? data.entity_id;
  const resolvedEntityLabel =
    data.entity_type === EntityType.host
      ? getHostNameForHostDetailsUrl(exploreRow)
      : data.entity_type === EntityType.user
      ? getUserNameForUserDetailsUrl(exploreRow)
      : displayName;
  const iconType = EntityIconByType[data.entity_type as EntityType] ?? 'globe';
  const identityFields = getIdentityFields(data);
  const urlIdentityFields =
    identityFields != null && Object.keys(identityFields).length > 0 ? identityFields : undefined;

  const hostTitleHref = useMemo(() => {
    if (data.entity_type !== EntityType.host) {
      return undefined;
    }
    const path = getHostDetailsUrl(
      resolvedEntityLabel,
      undefined,
      data.entity_id,
      urlIdentityFields
    );
    return application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.hosts,
      path,
    });
  }, [application, data.entity_id, data.entity_type, resolvedEntityLabel, urlIdentityFields]);

  const userTitleHref = useMemo(() => {
    if (data.entity_type !== EntityType.user) {
      return undefined;
    }
    const path = getTabsOnUsersDetailsUrl(
      resolvedEntityLabel,
      UsersTableType.events,
      undefined,
      data.entity_id,
      urlIdentityFields
    );
    return application.getUrlForApp(APP_UI_ID, {
      deepLinkId: SecurityPageName.users,
      path,
    });
  }, [application, data.entity_id, data.entity_type, resolvedEntityLabel, urlIdentityFields]);

  if (data.entity_type === EntityType.host && hostTitleHref != null) {
    return (
      <EuiLink
        href={hostTitleHref}
        target="_blank"
        rel="noopener"
        external={false}
        css={linkTitleCSS}
      >
        <FlyoutTitle title={resolvedEntityLabel} iconType={iconType} isLink />
      </EuiLink>
    );
  }
  if (data.entity_type === EntityType.user && userTitleHref != null) {
    return (
      <EuiLink
        href={userTitleHref}
        target="_blank"
        rel="noopener"
        external={false}
        css={linkTitleCSS}
      >
        <FlyoutTitle title={resolvedEntityLabel} iconType={iconType} isLink />
      </EuiLink>
    );
  }
  return <FlyoutTitle title={displayName} iconType={iconType} />;
};

const EntityCardFlyoutHeader: React.FC<{
  data: EntityCardAttachmentData;
  application: ApplicationStart;
}> = ({ data, application }) => {
  const lastActivityDate =
    data.last_activity != null && data.last_activity !== ''
      ? new Date(data.last_activity)
      : undefined;
  const isEntityInStore =
    data.is_entity_in_store ??
    Boolean(data.watchlist_names?.length || data.criticality || data.data_source);
  const riskLevelParsed = parseRiskLevel(data.risk_level);

  return (
    <FlyoutHeader data-test-subj="entity-card-flyout-header">
      <EuiFlexGroup gutterSize="s" responsive={false} direction="column">
        <EuiFlexItem grow={false}>
          <EuiText size="xs" data-test-subj="entity-card-header-lastSeen">
            {lastActivityDate != null && !Number.isNaN(lastActivityDate.getTime()) ? (
              <PreferenceFormattedDate value={lastActivityDate} />
            ) : (
              getEmptyTagValue()
            )}
            <EuiSpacer size="xs" />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            gutterSize="xs"
            responsive={false}
            direction="column"
            alignItems="flexStart"
          >
            <EuiFlexItem grow={false}>
              <EntityCardFlyoutPrimaryTitle data={data} application={application} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" wrap responsive={false}>
            <EuiFlexItem grow={false}>
              <EntitySourceBadge
                isEntityInStore={isEntityInStore}
                hasLastSeenDate={
                  lastActivityDate != null && !Number.isNaN(lastActivityDate.getTime())
                }
                data-test-subj="entity-card-source-badge"
              />
            </EuiFlexItem>
            {data.risk_level != null && data.risk_level !== '' && (
              <EuiFlexItem grow={false}>
                <RiskLevelBadge riskLevel={riskLevelParsed} />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </FlyoutHeader>
  );
};

const EntityCardSummaryGrid: React.FC<{ data: EntityCardAttachmentData }> = ({ data }) => {
  const criticality = parseCriticalityLevel(data.criticality);
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGrid columns={2} gutterSize="s">
        <SummaryTile
          label={
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.grid.entityIdLabel"
              defaultMessage="Entity ID"
            />
          }
        >
          <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} wrap={false}>
            <EuiFlexItem className="eui-textTruncate" grow={true}>
              <EuiText size="s" className="eui-textTruncate">
                {data.entity_id}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </SummaryTile>
        <SummaryTile
          label={
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.grid.dataSourceLabel"
              defaultMessage="Data source"
            />
          }
        >
          <EuiText size="s">{data.data_source ?? getEmptyTagValue()}</EuiText>
        </SummaryTile>
        <SummaryTile
          label={
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.grid.assetCriticalityLabel"
              defaultMessage="Asset criticality"
            />
          }
        >
          <AssetCriticalityBadge criticalityLevel={criticality} />
        </SummaryTile>
        <SummaryTile
          label={
            <FormattedMessage
              id="xpack.securitySolution.flyout.entityDetails.grid.watchlistsLabel"
              defaultMessage="Watchlists"
            />
          }
        >
          {data.watchlist_names && data.watchlist_names.length > 0 ? (
            <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
              {data.watchlist_names.map((name) => (
                <EuiFlexItem grow={false} key={name}>
                  <EuiBadge color="hollow">{name}</EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          ) : (
            getEmptyTagValue()
          )}
        </SummaryTile>
      </EuiFlexGrid>
      {(data.first_seen != null || data.last_activity != null) && (
        <>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="xl" responsive={true}>
            {data.first_seen != null && data.first_seen !== '' && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.agentBuilder.entityCard.firstSeen', {
                      defaultMessage: 'First seen',
                    })}
                  </strong>
                  <br />
                  <FormattedRelativePreferenceDate value={data.first_seen} />
                </EuiText>
              </EuiFlexItem>
            )}
            {data.last_activity != null && data.last_activity !== '' && (
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.securitySolution.agentBuilder.entityCard.lastActivity', {
                      defaultMessage: 'Last activity',
                    })}
                  </strong>
                  <br />
                  <FormattedRelativePreferenceDate value={data.last_activity} />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </>
      )}
      <EuiSpacer size="s" />
    </>
  );
};

const EntityCardRiskSummary: React.FC<{ data: EntityCardAttachmentData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xxs').fontSize;
  const entityType = data.entity_type as EntityType;

  const tableItems = useMemo(
    () =>
      (data.risk_inputs ?? []).map((r) => ({
        category: r.title,
        score: r.category_score ?? 0,
        count: r.alert_count,
      })),
    [data.risk_inputs]
  );

  const showAccordion =
    (data.risk_note != null && data.risk_note !== '') ||
    tableItems.length > 0 ||
    data.risk_score_norm != null ||
    (data.risk_level != null && data.risk_level !== '') ||
    (data.risk_score_updated_at != null && data.risk_score_updated_at !== '');

  if (!showAccordion) {
    return null;
  }

  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="entity-card-risk-summary"
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.title"
                defaultMessage="{entity} risk summary"
                values={{ entity: capitalize(entityType) }}
              />
            </h3>
          </EuiTitle>
        }
        extraAction={
          data.risk_score_updated_at != null && data.risk_score_updated_at !== '' ? (
            <span
              css={css`
                font-size: ${xsFontSize};
              `}
            >
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.riskUpdatedTime"
                defaultMessage="Updated {time}"
                values={{
                  time: (
                    <FormattedRelativePreferenceDate
                      value={data.risk_score_updated_at}
                      dateFormat="MMM D, YYYY"
                      relativeThresholdInHrs={ONE_WEEK_IN_HOURS}
                    />
                  ),
                }}
              />
            </span>
          ) : undefined
        }
      >
        <EuiSpacer size="m" />
        {data.risk_note != null && data.risk_note !== '' && (
          <>
            <EuiText size="s">{data.risk_note}</EuiText>
            <EuiSpacer size="m" />
          </>
        )}
        {tableItems.length > 0 && (
          <ExpandablePanel
            data-test-subj="entity-card-risk-inputs"
            header={{
              title: (
                <FormattedMessage
                  id="xpack.securitySolution.flyout.entityDetails.riskInputs"
                  defaultMessage="View risk contributions"
                />
              ),
            }}
            expand={{ expandable: false }}
          >
            <div
              css={css`
                min-width: ${SUMMARY_TABLE_MIN_WIDTH}px;
              `}
            >
              <EuiBasicTable
                tableCaption={i18n.translate(
                  'xpack.securitySolution.flyout.entityDetails.riskSummaryTableCaption',
                  {
                    defaultMessage: 'Risk summary for {entity}',
                    values: { entity: capitalize(entityType) },
                  }
                )}
                data-test-subj="entity-card-risk-summary-table"
                responsiveBreakpoint={false}
                columns={columnsArray}
                items={tableItems}
                compressed
              />
            </div>
          </ExpandablePanel>
        )}
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

const EntityCardResolution: React.FC<{ data: EntityCardAttachmentData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  const resolution = data.resolution;
  if (
    resolution == null ||
    (resolution.headline == null &&
      resolution.status == null &&
      (resolution.items == null || resolution.items.length === 0))
  ) {
    return null;
  }
  return (
    <>
      <EuiAccordion
        id="entity-card-resolution"
        initialIsOpen
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>{RESOLUTION_SECTION_TITLE}</h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m" />
        <ExpandablePanel
          data-test-subj="entity-card-resolution-panel"
          header={{
            title: RESOLUTION_GROUP_LINK_TITLE,
          }}
          expand={{ expandable: false }}
        >
          {resolution.headline != null && resolution.headline !== '' && (
            <>
              <EuiText size="s">{resolution.headline}</EuiText>
              <EuiSpacer size="m" />
            </>
          )}
          {resolution.status != null && resolution.status !== '' && (
            <>
              <EuiBadge color="primary">{resolution.status}</EuiBadge>
              <EuiSpacer size="m" />
            </>
          )}
          {resolution.items != null && resolution.items.length > 0 && (
            <EuiDescriptionList
              compressed
              type="responsiveColumn"
              listItems={resolution.items.map((row) => ({
                title: row.label,
                description: row.value,
              }))}
            />
          )}
        </ExpandablePanel>
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

const EntityCardInsights: React.FC<{ data: EntityCardAttachmentData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  if (data.insights == null || data.insights.length === 0) {
    return null;
  }
  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="entity-card-insights"
        data-test-subj="entity-card-insights-accordion"
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.insightsTitle"
                defaultMessage="Insights"
              />
            </h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m" />
        <EuiFlexGroup direction="column" gutterSize="m">
          {data.insights.map((insight, idx) => (
            <EuiPanel
              key={`${insight.title}-${idx}`}
              hasBorder
              hasShadow={false}
              paddingSize="m"
              css={{
                borderLeftWidth: euiTheme.border.width.thick,
                borderLeftStyle: 'solid',
                borderLeftColor:
                  insight.emphasis === 'danger'
                    ? euiTheme.colors.borderBaseDanger
                    : insight.emphasis === 'warning'
                    ? euiTheme.colors.borderBaseWarning
                    : euiTheme.colors.borderBasePrimary,
              }}
            >
              <EuiText size="s">
                <strong>{insight.title}</strong>
              </EuiText>
              {insight.body != null && insight.body !== '' && (
                <>
                  <EuiSpacer size="xs" />
                  <EuiText size="s" color="subdued">
                    {insight.body}
                  </EuiText>
                </>
              )}
            </EuiPanel>
          ))}
        </EuiFlexGroup>
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

const EntityCardObservedSection: React.FC<{ data: EntityCardAttachmentData }> = ({ data }) => {
  const { euiTheme } = useEuiTheme();
  if (data.observed_rows == null || data.observed_rows.length === 0) {
    return null;
  }
  return (
    <>
      <EuiAccordion
        initialIsOpen
        id="entity-card-observed"
        buttonProps={{
          css: css`
            color: ${euiTheme.colors.primary};
          `,
        }}
        buttonContent={
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="xpack.securitySolution.flyout.entityDetails.observedDataTitle"
                defaultMessage="Observed data"
              />
            </h3>
          </EuiTitle>
        }
      >
        <EuiSpacer size="m" />
        <EuiDescriptionList
          compressed
          type="responsiveColumn"
          listItems={data.observed_rows.map((row) => ({
            title: row.label,
            description: row.value,
          }))}
        />
      </EuiAccordion>
      <EuiHorizontalRule />
    </>
  );
};

const EntityCardFieldsSection: React.FC<{ data: EntityCardAttachmentData }> = ({ data }) => {
  if (!data.field_rows?.length) {
    return null;
  }
  return (
    <>
      <EuiTitle size="xs">
        <h3>
          <FormattedMessage
            id="xpack.securitySolution.agentBuilder.entityCard.entityFieldsTitle"
            defaultMessage="Highlighted fields"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList
        listItems={data.field_rows.map((row) => ({
          title: row.label,
          description: row.value,
        }))}
        compressed
        type="responsiveColumn"
      />
      <EuiHorizontalRule margin="l" />
    </>
  );
};

const EntityCardInlineContent: React.FC<AttachmentRenderProps<EntityCardAttachment>> = ({
  attachment,
}) => {
  const data = attachment.data;
  const icon = EntityIconByType[data.entity_type as EntityType] ?? 'globe';
  const title = data.entity_name ?? data.entity_id;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} size="l" aria-hidden />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiText size="s">
            <strong>{title}</strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <EuiFlexGroup gutterSize="s" wrap responsive={false}>
            {data.risk_score_norm != null && (
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued">
                  {i18n.translate('xpack.securitySolution.agentBuilder.entityCard.inlineRisk', {
                    defaultMessage: 'Risk {score}',
                    values: { score: formatRiskScore(data.risk_score_norm) },
                  })}
                </EuiText>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <AssetCriticalityBadge criticalityLevel={parseCriticalityLevel(data.criticality)} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

const EntityCardCanvasContent: React.FC<
  AttachmentRenderProps<EntityCardAttachment> & {
    application: ApplicationStart;
    agentBuilder?: AgentBuilderPluginStart;
    chrome?: SecurityAgentBuilderChrome;
  }
> = ({ attachment, application, agentBuilder, chrome }) => {
  const data = attachment.data;

  return (
    <div css={rootCanvasStyles}>
      <EuiPanel paddingSize="none" hasBorder css={{ overflow: 'auto' }}>
        <EntityCardFlyoutHeader data={data} application={application} />
        <FlyoutBody>
          <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="popout"
                onClick={() => {
                  navigateToSecurityEntityInApp({
                    application,
                    appId: APP_UI_ID,
                    row: data,
                    agentBuilder,
                    chrome,
                  });
                }}
              >
                {i18n.translate('xpack.securitySolution.agentBuilder.entityCard.openInSecurity', {
                  defaultMessage: 'Open in Security',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EntityCardSummaryGrid data={data} />
          <EntityCardFieldsSection data={data} />
          <EntityCardRiskSummary data={data} />
          <EntityCardResolution data={data} />
          <EntityCardInsights data={data} />
          <EntityCardObservedSection data={data} />
        </FlyoutBody>
      </EuiPanel>
    </div>
  );
};

export const registerEntityCardAttachment = ({
  attachments,
  application,
  agentBuilder,
  chrome,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.entityCard,
    createEntityCardAttachmentDefinition({ application, agentBuilder, chrome })
  );
};

export const createEntityCardAttachmentDefinition = ({
  application,
  agentBuilder,
  chrome,
}: {
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
}): AttachmentUIDefinition<EntityCardAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.attachmentLabel ?? attachment.data.entity_name ?? attachment.data.entity_id,
  getIcon: () => 'inspect',
  renderInlineContent: (props) => <EntityCardInlineContent {...props} />,
  renderCanvasContent: (props) => (
    <EntityCardCanvasContent
      {...props}
      application={application}
      agentBuilder={agentBuilder}
      chrome={chrome}
    />
  ),
  getActionButtons: ({ openCanvas, isCanvas }) => {
    if (isCanvas || !openCanvas) {
      return [];
    }
    return [
      {
        label: i18n.translate('xpack.securitySolution.agentBuilder.entityCard.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: openCanvas,
      },
    ];
  },
});
