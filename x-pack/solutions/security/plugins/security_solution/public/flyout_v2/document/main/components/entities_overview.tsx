/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useCallback, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { ExpandablePanel } from '../../../shared/components/expandable_panel';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import { noopCellActionRenderer } from '../../../shared/components/cell_actions';
import type { CellActionRenderer } from '../../../shared/components/cell_actions';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';
import { useEntitiesOverview } from '../hooks/use_entities_overview';

export interface EntitiesOverviewProps {
  /**
   * Document record used to retrieve host and user fields.
   */
  hit: DataTableRecord;
  /**
   * Whether to show the navigation icon in the panel header.
   */
  showIcon?: boolean;
  /**
   * Scope id forwarded to the host/user sub-overviews for cell actions and preview links.
   */
  scopeId?: string;
  /**
   * Renderer for cell actions on field values. Falls back to a no-op (no actions) when not provided.
   */
  renderCellActions?: CellActionRenderer;
  /**
   * Callback to navigate to the entities details panel. When omitted, the header link is hidden.
   */
  onShowEntitiesDetails?: () => void;
  /**
   * Callback to open the user entity right flyout (`flyout/entity_details/user_right`).
   * Invoked when the user name link is clicked.
   */
  onShowUserDetails?: (userName: string, entityId?: string) => void;
  /**
   * Callback to open the host entity right flyout (`flyout/entity_details/host_right`).
   * Invoked when the host name link is clicked.
   */
  onShowHostDetails?: (hostName: string, entityId?: string) => void;
  /**
   * Callback invoked when the alert count badge is clicked. Receives the entity type, name, and
   * optional entity-store ID so the caller can open the appropriate alerts list.
   */
  onShowEntityAlertsDetails?: (entityType: 'host' | 'user', name: string, entityId?: string) => void;
  /**
   * Whether to render legacy PreviewLink and expandable-flyout navigation callbacks.
   */
  useLegacyExpandableFlyout?: boolean;
}

const HEADER_TITLE = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.entities.entitiesTitle"
    defaultMessage="Entities"
  />
);
const HEADER_TOOLTIP = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.entities.entitiesTooltip"
    defaultMessage="Show all entities"
  />
);
const NO_DATA = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.document.insights.entities.noDataDescription"
    defaultMessage="Host and user information are unavailable for this alert."
  />
);

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: FC<EntitiesOverviewProps> = memo(
  ({
    hit,
    showIcon = true,
    scopeId = '',
    renderCellActions = noopCellActionRenderer,
    onShowEntitiesDetails,
    onShowUserDetails,
    onShowHostDetails,
    onShowEntityAlertsDetails,
    useLegacyExpandableFlyout = false,
  }) => {
    const { user, host, hasAnyEntity } = useEntitiesOverview({ hit });

    const link = useMemo(
      () =>
        onShowEntitiesDetails
          ? {
              callback: onShowEntitiesDetails,
              tooltip: HEADER_TOOLTIP,
            }
          : undefined,
      [onShowEntitiesDetails]
    );

    const onShowUserDetailsClick = useCallback(
      () =>
        user && onShowUserDetails
          ? onShowUserDetails(user.name, user.entityRecord?.entity?.id)
          : undefined,
      [onShowUserDetails, user]
    );

    const onShowHostDetailsClick = useCallback(
      () =>
        host && onShowHostDetails
          ? onShowHostDetails(host.name, host.entityRecord?.entity?.id)
          : undefined,
      [onShowHostDetails, host]
    );

    const onShowUserAlertsDetails = useCallback(
      () =>
        user && onShowEntityAlertsDetails
          ? onShowEntityAlertsDetails('user', user.name, user.entityRecord?.entity?.id)
          : undefined,
      [onShowEntityAlertsDetails, user]
    );

    const onShowHostAlertsDetails = useCallback(
      () =>
        host && onShowEntityAlertsDetails
          ? onShowEntityAlertsDetails('host', host.name, host.entityRecord?.entity?.id)
          : undefined,
      [onShowEntityAlertsDetails, host]
    );

    return (
      <ExpandablePanel
        header={{
          title: HEADER_TITLE,
          link,
          iconType: showIcon ? 'chevronLimitLeft' : undefined,
        }}
        data-test-subj={INSIGHTS_ENTITIES_TEST_ID}
      >
        {hasAnyEntity ? (
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {user && (
              <EuiFlexItem>
                <UserEntityOverview
                  userName={user.name}
                  identityFields={user.identityFields}
                  entityRecord={user.entityRecord}
                  scopeId={scopeId}
                  renderCellActions={renderCellActions}
                  useLegacyExpandableFlyout={useLegacyExpandableFlyout}
                  onShowUserDetails={onShowUserDetails ? onShowUserDetailsClick : undefined}
                  onShowEntityAlertsDetails={
                    onShowEntityAlertsDetails ? onShowUserAlertsDetails : undefined
                  }
                />
              </EuiFlexItem>
            )}
            {host && (
              <EuiFlexItem>
                <HostEntityOverview
                  hostName={host.name}
                  identityFields={host.identityFields}
                  entityRecord={host.entityRecord}
                  scopeId={scopeId}
                  renderCellActions={renderCellActions}
                  useLegacyExpandableFlyout={useLegacyExpandableFlyout}
                  onShowHostDetails={onShowHostDetails ? onShowHostDetailsClick : undefined}
                  onShowEntityAlertsDetails={
                    onShowEntityAlertsDetails ? onShowHostAlertsDetails : undefined
                  }
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          NO_DATA
        )}
      </ExpandablePanel>
    );
  }
);

EntitiesOverview.displayName = 'EntitiesOverview';
