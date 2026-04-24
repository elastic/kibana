/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiInMemoryTable,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
} from '@elastic/eui';
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
import type { CriticalityLevelWithUnassigned } from '../../../common/entity_analytics/asset_criticality/types';
import type { EntityType } from '../../../common/entity_analytics/types';
import { RiskSeverity } from '../../../common/search_strategy';
import { APP_UI_ID, SecurityAgentBuilderAttachments } from '../../../common/constants';
import { FormattedRelativePreferenceDate } from '../../common/components/formatted_date';
import { getEmptyTagValue } from '../../common/components/empty_value';
import {
  navigateToSecurityEntityInApp,
  type SecurityAgentBuilderChrome,
} from './entity_explore_navigation';
import { formatRiskScore } from '../../entity_analytics/common';
import { CRITICALITY_LEVEL_TITLE } from '../../entity_analytics/components/asset_criticality/translations';
import { RiskScoreLevel } from '../../entity_analytics/components/severity/common';
import {
  EntityIconByType,
  sourceFieldToText,
} from '../../entity_analytics/components/entity_store/helpers';

export interface EntityListRow {
  entity_type: 'host' | 'user' | 'service' | 'generic';
  entity_id: string;
  entity_name?: string;
  source?: unknown;
  risk_score_norm?: number;
  risk_level?: string;
  criticality?: string;
  first_seen?: string;
  last_activity?: string;
}

export type EntityListAttachment = Attachment<
  typeof SecurityAgentBuilderAttachments.entityList,
  { attachmentLabel?: string; entities: EntityListRow[] }
>;

const rootCanvasStyles = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 400,
});

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

const criticalityLabel = (raw?: string): string | undefined => {
  if (!raw) {
    return undefined;
  }
  return CRITICALITY_LEVEL_TITLE[raw as CriticalityLevelWithUnassigned] ?? raw;
};

const EntityListInlineContent: React.FC<AttachmentRenderProps<EntityListAttachment>> = ({
  attachment,
}) => {
  const entities = attachment.data.entities ?? [];
  const preview = entities.slice(0, 5);

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      <EuiText size="xs">
        <strong>
          {i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.countLabel', {
            defaultMessage: '{count, plural, one {# entity} other {# entities}}',
            values: { count: entities.length },
          })}
        </strong>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup direction="column" gutterSize="xs">
        {preview.map((row) => {
          const icon = EntityIconByType[row.entity_type as EntityType] ?? 'globe';
          const label = row.entity_name ?? row.entity_id;
          return (
            <EuiFlexGroup
              key={`${row.entity_type}-${row.entity_id}`}
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <EuiIcon type={icon} size="s" aria-hidden />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  {row.risk_score_norm != null
                    ? `${label} · ${formatRiskScore(row.risk_score_norm)}`
                    : label}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        })}
      </EuiFlexGroup>
      {entities.length > preview.length && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.entityListAttachment.moreInCanvas',
              {
                defaultMessage: 'Open Canvas to see the full list.',
              }
            )}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

export const EntityListTable: React.FC<{
  entities: EntityListRow[];
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
  openSidebarConversation?: () => void;
}> = ({ entities, application, agentBuilder, chrome, openSidebarConversation }) => {
  const { euiTheme } = useEuiTheme();

  const columns: Array<EuiBasicTableColumn<EntityListRow>> = useMemo(
    () => [
      {
        field: 'entity_name',
        name: i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.col.name', {
          defaultMessage: 'Name',
        }),
        render: (_: string, row: EntityListRow) => {
          const icon = EntityIconByType[row.entity_type as EntityType] ?? 'globe';
          const label = row.entity_name ?? row.entity_id;
          return (
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType={icon}
                  display="empty"
                  aria-label={i18n.translate(
                    'xpack.securitySolution.agentBuilder.entityListAttachment.openEntityAria',
                    {
                      defaultMessage: 'Open entity in Security',
                    }
                  )}
                  onClick={() => {
                    navigateToSecurityEntityInApp({
                      application,
                      appId: APP_UI_ID,
                      row,
                      agentBuilder,
                      chrome,
                      openSidebarConversation,
                    });
                  }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">{label}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          );
        },
      },
      {
        field: 'source',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.source',
          {
            defaultMessage: 'Source',
          }
        ),
        render: (source: unknown) =>
          source == null ? getEmptyTagValue() : sourceFieldToText(source),
      },
      {
        field: 'criticality',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.criticality',
          {
            defaultMessage: 'Criticality',
          }
        ),
        render: (c: string | undefined) => {
          const title = criticalityLabel(c);
          return title ? <EuiText size="s">{title}</EuiText> : getEmptyTagValue();
        },
      },
      {
        field: 'risk_score_norm',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.riskScore',
          {
            defaultMessage: 'Risk score',
          }
        ),
        dataType: 'number',
        render: (score: number | undefined) =>
          score != null ? (
            <EuiText size="s" data-test-subj="entity-list-risk-score">
              {formatRiskScore(score)}
            </EuiText>
          ) : (
            getEmptyTagValue()
          ),
      },
      {
        field: 'risk_level',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.riskLevel',
          {
            defaultMessage: 'Risk level',
          }
        ),
        render: (_: string | undefined, row: EntityListRow) => (
          <RiskScoreLevel severity={parseRiskLevel(row.risk_level)} />
        ),
      },
      {
        field: 'first_seen',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.firstSeen',
          {
            defaultMessage: 'First seen',
          }
        ),
        render: (value: string | undefined) =>
          value ? <FormattedRelativePreferenceDate value={value} /> : getEmptyTagValue(),
      },
      {
        field: 'last_activity',
        name: i18n.translate(
          'xpack.securitySolution.agentBuilder.entityListAttachment.col.lastActivity',
          {
            defaultMessage: 'Last activity',
          }
        ),
        render: (value: string | undefined) =>
          value ? <FormattedRelativePreferenceDate value={value} /> : getEmptyTagValue(),
      },
      {
        field: 'entity_id',
        name: i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.col.euid', {
          defaultMessage: 'Entity ID (EUID)',
        }),
        truncateText: true,
        render: (id: string) => (
          <EuiText size="xs" css={{ fontFamily: euiTheme.font.familyCode }}>
            {id}
          </EuiText>
        ),
      },
    ],
    [agentBuilder, application, chrome, euiTheme.font.familyCode, openSidebarConversation]
  );

  return (
    <EuiInMemoryTable<EntityListRow>
      tableCaption={i18n.translate(
        'xpack.securitySolution.agentBuilder.entityListAttachment.tableCaption',
        {
          defaultMessage: 'Security entities referenced in this conversation',
        }
      )}
      items={entities}
      columns={columns}
      pagination={entities.length > 10 ? { pageSizeOptions: [10, 25, 50] } : false}
      sorting={true}
    />
  );
};

const EntityListCanvasContent: React.FC<
  AttachmentRenderProps<EntityListAttachment> & {
    application: ApplicationStart;
    agentBuilder?: AgentBuilderPluginStart;
    chrome?: SecurityAgentBuilderChrome;
  }
> = ({ attachment, application, agentBuilder, chrome, openSidebarConversation }) => {
  const entities = attachment.data.entities ?? [];
  const title =
    attachment.data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.defaultTitle', {
      defaultMessage: 'Entities',
    });

  return (
    <div css={rootCanvasStyles}>
      <EuiTitle size="s">
        <h2>{title}</h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EntityListTable
        entities={entities}
        application={application}
        agentBuilder={agentBuilder}
        chrome={chrome}
        openSidebarConversation={openSidebarConversation}
      />
    </div>
  );
};

export const registerEntityListAttachment = ({
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
    SecurityAgentBuilderAttachments.entityList,
    createEntityListAttachmentDefinition({ application, agentBuilder, chrome })
  );
};

export const createEntityListAttachmentDefinition = ({
  application,
  agentBuilder,
  chrome,
}: {
  application: ApplicationStart;
  agentBuilder?: AgentBuilderPluginStart;
  chrome?: SecurityAgentBuilderChrome;
}): AttachmentUIDefinition<EntityListAttachment> => ({
  getLabel: (attachment) =>
    attachment.data.attachmentLabel ??
    i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.pillLabel', {
      defaultMessage: 'Entity list',
    }),
  getIcon: () => 'list',
  renderInlineContent: (props) => <EntityListInlineContent {...props} />,
  renderCanvasContent: (props) => (
    <EntityListCanvasContent
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
        label: i18n.translate('xpack.securitySolution.agentBuilder.entityListAttachment.preview', {
          defaultMessage: 'Preview',
        }),
        icon: 'eye',
        type: ActionButtonType.SECONDARY,
        handler: openCanvas,
      },
    ];
  },
});
