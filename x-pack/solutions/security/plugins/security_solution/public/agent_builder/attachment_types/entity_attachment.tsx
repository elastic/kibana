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
import type { EntityType } from '../../../common/entity_analytics/types';
import type { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { useKibana } from '../../common/lib/kibana/kibana_react';
import { SECURITY_UI_APP_ID, SecurityPageName } from '@kbn/security-solution-navigation';
import { encode } from '@kbn/rison';
import { EntityPanelKeyByType } from '../../flyout/entity_details/shared/constants';

const HEADER_HEIGHT = 72;

interface Entity {
  entityType: string;
  entityId: string;
}

export type EntityAttachment = Attachment<
  SecurityAgentBuilderAttachments.entity,
  { entities: Array<Entity> }
>;

const SingleEntityAction = ({ entityType, entityId }: Entity) => {
  const { application } = useKibana().services;
  const id = EntityPanelKeyByType[entityType as EntityType];

  const navigateToEntity = useCallback(() => {
    if (id) {
      application.navigateToApp(SECURITY_UI_APP_ID, {
        deepLinkId: SecurityPageName.entityAnalyticsHomePage,
        path: `?flyout=${encodeURIComponent(encode({
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
        }))}`,
      });
    }
  }, [application, id, entityId]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiButton color="text" size="s" iconType="inspect" onClick={navigateToEntity}>
          {i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.open', {
            defaultMessage: 'Explore {type}',
            values: { type: capitalize(entityType) },
          })}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const LinkedEntityAction = ({ entityType, entityId }: Entity) => {
  const { application } = useKibana().services;
  const id = EntityPanelKeyByType[entityType as EntityType];

  const navigateToEntity = useCallback(() => {
    if (id) {
      application.navigateToApp(SECURITY_UI_APP_ID, {
        deepLinkId: SecurityPageName.entityAnalyticsHomePage,
        path: `?flyout=${encodeURIComponent(encode({
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
        }))}`,
      });
    }
  }, [application, id, entityId]);

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLink onClick={navigateToEntity}>{entityId}</EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const SingleEntityInlineContent: React.FC<AttachmentRenderProps<EntityAttachment>> = ({
  attachment,
}) => {
  const { euiTheme } = useEuiTheme();

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

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText css={textStyles} size="s">
            {attachment.data.entities[0].entityId}
          </EuiText>
        </EuiFlexItem>
        <SingleEntityAction {...attachment.data.entities[0]} />
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
};

const MultiEntityInlineContent: React.FC<AttachmentRenderProps<EntityAttachment>> = ({
  attachment,
}) => {
  const { euiTheme } = useEuiTheme();

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

  return (
    <EuiSplitPanel.Inner color="subdued" css={headerStyles} paddingSize="m">
      <EuiFlexGroup responsive={false} justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiText css={textStyles} size="s">
            {attachment.data.entities.map((entity) => (
              <LinkedEntityAction {...entity} />
            ))}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiSplitPanel.Inner>
  );
};

const EntityInlineContent: React.FC<AttachmentRenderProps<EntityAttachment>> = (props) => {
  const { attachment } = props;
  const entities = attachment.data.entities ?? [];
  if (entities.length === 1) {
    return <SingleEntityInlineContent {...props} />;
  } else if (attachment.data.entities.length > 1) {
    return <MultiEntityInlineContent {...props} />;
  } else {
    return null;
  }
};

/**
 * UI definition for entity attachments
 */
export const entityAttachmentDefinition: AttachmentUIDefinition<EntityAttachment> = {
  getLabel: (attachment) => {
    const entities = attachment.data.entities ?? [];
    if (entities.length === 1) {
      return `${entities[0].entityId}`;
    }

    return '';
  },
  getIcon: () => 'user',
  renderInlineContent: (props) => <EntityInlineContent {...props} />,
  // getActionButtons: ({ attachment, isCanvas, isSidebar }) => {
  //   console.log(`getActionButtons for entity attachment: ${JSON.stringify(attachment)}`);
  //   // const buttons = [];

  //   // if (isSidebar) {
  //   // }

  //   // if (isCanvas) {
  //   // }
  //   const entities = attachment.data.entities ?? [];
  //   if (entities.length === 1) {
  //     const type = entities[0].entityType as EntityType;
  //     const id = entities[0].entityId;
  //     return [
  //       {
  //         label: i18n.translate('xpack.securitySolution.agentBuilder.attachments.entity.open', {
  //           defaultMessage: 'Explore {type}',
  //           values: { type: capitalize(type) },
  //         }),
  //         icon: 'inspect',
  //         type: ActionButtonType.PRIMARY,
  //         handler: async () => {
  //           window.open(`/app/security/${type}s/${id}`, '_self');
  //         },
  //       },
  //     ];
  //   }
  //   return [];
  // },
};
