/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiCallOut,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type {
  AttachmentUIDefinition,
  AttachmentRenderProps,
  AttachmentServiceStartContract,
} from '@kbn/agent-builder-browser/attachments';
import { ActionButtonType } from '@kbn/agent-builder-browser/attachments';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { ApplicationStart } from '@kbn/core-application-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { AiWatchlistService, AiCreatedWatchlist } from '../../detection_engine/common/ai_watchlist_service';

type WatchlistAttachment = Attachment<string, { text: string; attachmentLabel?: string }>;

const ENTITY_ANALYTICS_PATH = '/entity_analytics';

const parseWatchlistFromAttachment = (attachment: WatchlistAttachment): AiCreatedWatchlist | null => {
  try {
    const parsed = JSON.parse(attachment.data.text);
    if (!parsed || !parsed.name) return null;
    return parsed as AiCreatedWatchlist;
  } catch {
    return null;
  }
};

const getWatchlistName = (attachment: WatchlistAttachment): string | undefined =>
  attachment?.data?.attachmentLabel ?? parseWatchlistFromAttachment(attachment)?.name;

const EmptyWatchlistContent: React.FC = () => (
  <EuiCallOut
    size="s"
    title={i18n.translate('xpack.securitySolution.agentBuilder.watchlistAttachment.emptyTitle', {
      defaultMessage: 'New Watchlist',
    })}
    iconType="info"
    color="primary"
  >
    <EuiText size="xs">
      {i18n.translate(
        'xpack.securitySolution.agentBuilder.watchlistAttachment.emptyDescription',
        { defaultMessage: 'Describe the entities you want to monitor.' }
      )}
    </EuiText>
  </EuiCallOut>
);

const SectionHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EuiText size="s">
    <strong>{children}</strong>
  </EuiText>
);

const EntityNameBadges: React.FC<{ names: string[]; limit?: number }> = ({
  names,
  limit = 10,
}) => {
  const visible = names.slice(0, limit);
  const overflow = names.length - visible.length;

  return (
    <EuiFlexGroup responsive={false} gutterSize="xs" wrap>
      {visible.map((name) => (
        <EuiFlexItem grow={false} key={name}>
          <EuiBadge color="hollow">{name}</EuiBadge>
        </EuiFlexItem>
      ))}
      {overflow > 0 && (
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.watchlistAttachment.moreEntities',
              { defaultMessage: '+{count} more', values: { count: overflow } }
            )}
          </EuiBadge>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const WatchlistInlineContent: React.FC<AttachmentRenderProps<WatchlistAttachment>> = ({
  attachment,
}) => {
  const watchlist = parseWatchlistFromAttachment(attachment);

  if (!watchlist) {
    return <EmptyWatchlistContent />;
  }

  const { name, description, riskModifier, entityCount, entityNames, generatedEsql } = watchlist;

  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={false}>
      {description && (
        <>
          <SectionHeading>
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.watchlistAttachment.descriptionHeading',
              { defaultMessage: 'Description' }
            )}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EuiText size="xs">{description}</EuiText>
          <EuiSpacer size="s" />
        </>
      )}

      <EuiText size="xs">
        {entityCount != null && (
          <>
            <strong>
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.watchlistAttachment.entityCountLabel',
                { defaultMessage: 'Entities matched:' }
              )}
            </strong>{' '}
            {entityCount}
          </>
        )}
        {riskModifier != null && (
          <>
            {entityCount != null && ' | '}
            <strong>
              {i18n.translate(
                'xpack.securitySolution.agentBuilder.watchlistAttachment.riskModifierLabel',
                { defaultMessage: 'Risk modifier:' }
              )}
            </strong>{' '}
            {riskModifier}×
          </>
        )}
      </EuiText>

      {entityNames && entityNames.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.watchlistAttachment.entitiesHeading',
              { defaultMessage: 'Entities' }
            )}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EntityNameBadges names={entityNames} />
        </>
      )}

      {generatedEsql && (
        <>
          <EuiSpacer size="s" />
          <SectionHeading>
            {i18n.translate(
              'xpack.securitySolution.agentBuilder.watchlistAttachment.esqlHeading',
              { defaultMessage: 'Generated ES|QL' }
            )}
          </SectionHeading>
          <EuiSpacer size="xs" />
          <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" overflowHeight={120}>
            {generatedEsql}
          </EuiCodeBlock>
        </>
      )}
    </EuiPanel>
  );
};

export const registerWatchlistAttachment = ({
  attachments,
  application,
  aiWatchlist,
}: {
  attachments: AttachmentServiceStartContract;
  application: ApplicationStart;
  aiWatchlist: AiWatchlistService;
}): void => {
  attachments.addAttachmentType(
    SecurityAgentBuilderAttachments.watchlist,
    createWatchlistAttachmentDefinition({ application, aiWatchlist })
  );
};

export const createWatchlistAttachmentDefinition = ({
  application,
  aiWatchlist,
}: {
  application: ApplicationStart;
  aiWatchlist: AiWatchlistService;
}): AttachmentUIDefinition<WatchlistAttachment> => ({
  getLabel: (attachment) =>
    getWatchlistName(attachment) ??
    i18n.translate('xpack.securitySolution.agentBuilder.watchlistAttachment.label', {
      defaultMessage: 'Security Watchlist',
    }),
  getIcon: () => 'list',
  renderInlineContent: (props) => <WatchlistInlineContent {...props} />,
  getActionButtons: ({ attachment }) => {
    const watchlist = parseWatchlistFromAttachment(attachment);
    if (!watchlist) return [];

    return [
      {
        label: i18n.translate(
          'xpack.securitySolution.agentBuilder.watchlistAttachment.viewWatchlists',
          { defaultMessage: 'View watchlists' }
        ),
        icon: 'list',
        type: ActionButtonType.PRIMARY,
        handler: () => {
          aiWatchlist.setAiCreatedWatchlist(watchlist);
          application.navigateToApp('securitySolutionUI', {
            path: ENTITY_ANALYTICS_PATH,
          });
        },
      },
    ];
  },
});
