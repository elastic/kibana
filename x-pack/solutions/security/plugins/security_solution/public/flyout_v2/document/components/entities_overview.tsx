/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo, useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { ExpandablePanel } from '../../shared/components/expandable_panel';
import { HostEntityOverview } from './host_entity_overview';
import { UserEntityOverview } from './user_entity_overview';
import type { EntityDetailsPath } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { CspInsightLeftPanelSubTab } from '../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import type { IdentityFields } from '../../../flyout/document_details/shared/utils';
import { useEntityFromStore } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { useEventDetails } from '../../../flyout/document_details/shared/hooks/use_event_details';
import { noopCellActionRenderer } from '../../shared/components/cell_actions';
import type { CellActionRenderer } from '../../shared/components/cell_actions';
import { INSIGHTS_ENTITIES_TEST_ID } from './test_ids';

export interface EntitiesOverviewProps {
  /**
   * Document record used to retrieve host and user fields.
   */
  hit: DataTableRecord;
  /**
   * Pre-fetched ECS-nested object. When provided the internal fetch is skipped.
   * The old flyout passes this from its context to avoid a duplicate network request.
   * When omitted (new flyout) the data is fetched internally via useEventDetails.
   */
  dataAsNestedObject?: Ecs | null;
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
   * Callback invoked when the user name is clicked or an alert/misconfiguration link is followed.
   * Required in flyout_v2; without it the sub-overviews fall back to expandable-flyout actions
   * which are no-ops outside the legacy flyout.
   */
  onShowUserDetails?: (params: { userName: string; entityId?: string }) => void;
  /**
   * Same as `onShowUserDetails` but for host entities.
   */
  onShowHostDetails?: (params: { hostName: string; entityId?: string }) => void;
  /**
   * Callback invoked when the user clicks the alerts insight chip on the user card.
   * When omitted, the click falls back to `onShowUserDetails`.
   */
  onShowUserAlertsDetails?: (params: { userName: string; entityId?: string }) => void;
  /**
   * Same as `onShowUserAlertsDetails` but for host entities.
   */
  onShowHostAlertsDetails?: (params: { hostName: string; entityId?: string }) => void;
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

type ShowUserHandler = NonNullable<EntitiesOverviewProps['onShowUserDetails']>;
type ShowHostHandler = NonNullable<EntitiesOverviewProps['onShowHostDetails']>;

const buildShowUserDetailsHandler = (
  userName: string,
  entityId: string | undefined,
  onShowDetails: ShowUserHandler | undefined,
  onShowAlerts: ShowUserHandler | undefined
) => {
  if (!onShowDetails || !userName) return undefined;
  return (path?: EntityDetailsPath) => {
    if (path?.subTab === CspInsightLeftPanelSubTab.ALERTS && onShowAlerts) {
      onShowAlerts({ userName, entityId });
      return;
    }
    onShowDetails({ userName, entityId });
  };
};

const buildShowHostDetailsHandler = (
  hostName: string,
  entityId: string | undefined,
  onShowDetails: ShowHostHandler | undefined,
  onShowAlerts: ShowHostHandler | undefined
) => {
  if (!onShowDetails || !hostName) return undefined;
  return (path?: EntityDetailsPath) => {
    if (path?.subTab === CspInsightLeftPanelSubTab.ALERTS && onShowAlerts) {
      onShowAlerts({ hostName, entityId });
      return;
    }
    onShowDetails({ hostName, entityId });
  };
};

/**
 * Entities section under Insights section, overview tab. It contains a preview of host and user information.
 */
export const EntitiesOverview: FC<EntitiesOverviewProps> = memo(
  ({
    hit,
    dataAsNestedObject: dataAsNestedObjectProp,
    showIcon = true,
    scopeId = '',
    renderCellActions = noopCellActionRenderer,
    onShowEntitiesDetails,
    onShowUserDetails,
    onShowHostDetails,
    onShowUserAlertsDetails,
    onShowHostAlertsDetails,
  }) => {
    const hostName = getFieldValue(hit, 'host.name') as string | null;
    const userName = getFieldValue(hit, 'user.name') as string | null;

    const euidApi = useEntityStoreEuidApi();
    const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);

    // The old flyout supplies dataAsNestedObject from its context. The new flyout (and Discover)
    // does not, so we fetch it here. The fetch is skipped when the prop is provided.
    const { dataAsNestedObject: fetchedData } = useEventDetails({
      eventId: hit.raw._id,
      indexName: hit.raw._index,
      skip: dataAsNestedObjectProp !== undefined,
    });
    const dataAsNestedObject =
      dataAsNestedObjectProp !== undefined ? dataAsNestedObjectProp : fetchedData;

    // Memoize identifier extraction so AlertCountInsight (deep inside the host/user cards)
    // doesn't churn on referential changes — `getEntityIdentifiersFromDocument` returns a fresh
    // object every call. Same pattern as `highlighted_fields.tsx`.
    const hostEntityIdentifiers = useMemo(
      () =>
        (euidApi?.euid.getEntityIdentifiersFromDocument('host', dataAsNestedObject) ??
          undefined) as IdentityFields | undefined,
      [euidApi?.euid, dataAsNestedObject]
    );
    const userEntityIdentifiers = useMemo(
      () =>
        (euidApi?.euid.getEntityIdentifiersFromDocument('user', dataAsNestedObject) ??
          undefined) as IdentityFields | undefined,
      [euidApi?.euid, dataAsNestedObject]
    );
    const hostEntityId = euidApi?.euid.getEuidFromObject('host', dataAsNestedObject);
    const userEntityId = euidApi?.euid.getEuidFromObject('user', dataAsNestedObject);

    const userEntityFromStore = useEntityFromStore({
      entityId: userEntityId,
      identityFields: userEntityIdentifiers ?? undefined,
      entityType: 'user',
      skip: !entityStoreV2Enabled,
    });
    const hostEntityFromStore = useEntityFromStore({
      entityId: hostEntityId,
      identityFields: hostEntityIdentifiers ?? undefined,
      entityType: 'host',
      skip: !entityStoreV2Enabled,
    });

    const userEntityRecord = userEntityFromStore.entityRecord;
    const hostEntityRecord = hostEntityFromStore.entityRecord;
    // Fall back to the store record's name when the document doesn't carry user/host.name —
    // happens when the entity exists only in the store.
    const resolvedUserName = userName || userEntityRecord?.entity?.name || '';
    const resolvedHostName = hostName || hostEntityRecord?.entity?.name || '';

    const showUserOverview =
      (!entityStoreV2Enabled && userName != null) || (entityStoreV2Enabled && !!resolvedUserName);
    const showHostOverview =
      (!entityStoreV2Enabled && hostName != null) || (entityStoreV2Enabled && !!resolvedHostName);
    const hasAnyEntity = showUserOverview || showHostOverview;

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

    // `AlertCountInsight` calls back with `{ tab: CSP_INSIGHTS, subTab: ALERTS }` when the alerts
    // chip is clicked; route those clicks to the dedicated alerts flyout. Other tabs fall through
    // to the entity details flyout — flyout_v2 entity flyouts are single-body views, so the rest
    // of the path is intentionally not forwarded.
    const userEntityRecordId = userEntityRecord?.entity?.id;
    const handleShowUserDetails = useMemo(
      () =>
        buildShowUserDetailsHandler(
          resolvedUserName,
          userEntityRecordId,
          onShowUserDetails,
          onShowUserAlertsDetails
        ),
      [onShowUserDetails, onShowUserAlertsDetails, resolvedUserName, userEntityRecordId]
    );

    const hostEntityRecordId = hostEntityRecord?.entity?.id;
    const handleShowHostDetails = useMemo(
      () =>
        buildShowHostDetailsHandler(
          resolvedHostName,
          hostEntityRecordId,
          onShowHostDetails,
          onShowHostAlertsDetails
        ),
      [onShowHostDetails, onShowHostAlertsDetails, resolvedHostName, hostEntityRecordId]
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
            {showUserOverview && (
              <>
                <EuiFlexItem>
                  <UserEntityOverview
                    userName={resolvedUserName}
                    identityFields={userEntityIdentifiers}
                    entityRecord={entityStoreV2Enabled ? userEntityRecord : undefined}
                    scopeId={scopeId}
                    renderCellActions={renderCellActions}
                    onShowDetails={handleShowUserDetails}
                  />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </>
            )}
            {showHostOverview && (
              <EuiFlexItem>
                <HostEntityOverview
                  hostName={resolvedHostName}
                  identityFields={hostEntityIdentifiers}
                  entityRecord={entityStoreV2Enabled ? hostEntityRecord : undefined}
                  scopeId={scopeId}
                  renderCellActions={renderCellActions}
                  onShowDetails={handleShowHostDetails}
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
