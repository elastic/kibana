/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiSplitPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import {
  type AttachmentUIDefinition,
  type AttachmentRenderProps,
} from '@kbn/agent-builder-browser/attachments';
import { capitalize } from 'lodash';
import { SECURITY_UI_APP_ID, SecurityPageName } from '@kbn/security-solution-navigation';
import { encode } from '@kbn/rison';
import type { EntityType } from '../../../common/entity_analytics/types';
import type { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { EntityPanelKeyByType } from '../../flyout/entity_details/shared/constants';

const HEADER_HEIGHT = 72;

interface EntityActionProps {
  entityType: string;
  entityId: string;
  onClick: (entityId: string, entityType: string) => void;
}

export type EntityAttachment = Attachment<
  SecurityAgentBuilderAttachments.entity,
  {
    entities: Array<{
      entityType: string;
      entityId: string;
    }>;
  }
>;

const SingleEntityAction = ({ entityType, entityId, onClick }: EntityActionProps) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButton
          color="text"
          size="s"
          iconType="inspect"
          onClick={() => onClick(entityId, entityType)}
        >
          {i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.open', {
            defaultMessage: 'Explore {type}',
            values: { type: capitalize(entityType) },
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const LinkedEntityAction = ({ entityType, entityId, onClick }: EntityActionProps) => {
  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLink onClick={() => onClick(entityId, entityType)}>{entityId}</EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

type EntityInlineContentProps = AttachmentRenderProps<EntityAttachment> & {
  numEntities: number;
};

const EntityInlineContent: React.FC<EntityInlineContentProps> = ({
  attachment,
  openSidebarConversation,
  numEntities,
}) => {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibana().services;

  const headerStyles = css`
    position: relative;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: ${euiTheme.border.thin};
    border-color: ${euiTheme.colors.borderBaseSubdued};
    min-height: ${HEADER_HEIGHT}px;
  `;

  const textStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
  `;

  const navigateToEntity = useCallback(
    (entityId: string, entityType: string) => {
      const id = EntityPanelKeyByType[entityType as EntityType];
      if (id) {
        application.navigateToApp(SECURITY_UI_APP_ID, {
          // TODO: update when Jared's PR merges
          deepLinkId: SecurityPageName.entityAnalyticsOverview,
          path: `?flyout=${encodeURIComponent(
            encode({
              right: {
                id,
                params: {
                  userName: entityId,
                  contextID: 'entity-attachment',
                  scopeId: 'entity-attachment',
                },
              },
              left: null,
              preview: [],
            })
          )}`,
        });

        // Open the sidebar so the conversation remains accessible
        openSidebarConversation?.();
      }
    },
    [application, openSidebarConversation]
  );

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText css={textStyles} size="s">
            {numEntities === 1
              ? attachment.data.entities[0].entityId
              : attachment.data.entities.map((entity) => (
                  <LinkedEntityAction {...entity} onClick={navigateToEntity} />
                ))}
          </EuiText>
        </EuiFlexItem>
        {numEntities === 1 && (
          <SingleEntityAction {...attachment.data.entities[0]} onClick={navigateToEntity} />
        )}
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
};

const InlineEntity: React.FC<AttachmentRenderProps<EntityAttachment>> = (props) => {
  const { attachment } = props;
  const entities = attachment.data.entities ?? [];
  const numEntities = entities.length;

  if (numEntities === 0) {
    return null;
  }

  return <EntityInlineContent {...props} numEntities={numEntities} />;
};

export const entityAttachmentDefinition: AttachmentUIDefinition<EntityAttachment> = {
  getLabel: (attachment) => {
    const entities = attachment.data.entities ?? [];
    if (entities.length === 1) {
      return `${entities[0].entityId}`;
    }

    return '';
  },
  getIcon: () => 'user',
  renderInlineContent: (props) => <InlineEntity {...props} />,
};
