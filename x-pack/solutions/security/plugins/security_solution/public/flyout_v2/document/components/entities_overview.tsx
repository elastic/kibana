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
    dataAsNestedObject: dataAsNestedObjectProp,
    showIcon = true,
    scopeId = '',
    renderCellActions = noopCellActionRenderer,
    onShowEntitiesDetails,
    onShowUserDetails,
    onShowHostDetails,
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

    const hostEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
      'host',
      dataAsNestedObject
    ) as IdentityFields;
    const hostEntityId = euidApi?.euid.getEuidFromObject('host', dataAsNestedObject);

    const userEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
      'user',
      dataAsNestedObject
    ) as IdentityFields;
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

    const userEntityRecordId = userEntityFromStore.entityRecord?.entity?.id;
    const userEntityRecordName = userEntityFromStore.entityRecord?.entity?.name;
    const resolvedUserName = userName || userEntityRecordName || '';

    const hostEntityRecordId = hostEntityFromStore.entityRecord?.entity?.id;
    const hostEntityRecordName = hostEntityFromStore.entityRecord?.entity?.name;
    const resolvedHostName = hostName || hostEntityRecordName || '';

    const showUserOverview =
      (!entityStoreV2Enabled && userName != null) || (entityStoreV2Enabled && !!resolvedUserName);
    const showHostOverview =
      (!entityStoreV2Enabled && hostName != null) || (entityStoreV2Enabled && !!resolvedHostName);
    const hasAnyEntity = showUserOverview || (showHostOverview && !!hostEntityIdentifiers);

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

    // The host/user overview's `onShowDetails` callback can pass an `EntityDetailsPath` to deep-link
    // to a specific tab. The legacy expandable flyout consumed it via the left-panel tab API, but
    // the flyout_v2 entity flyouts (HostEntityDetails/UserEntityDetails) are single-body views with
    // no tab UI, so `path` is intentionally not forwarded. Surface tabbed details before re-introducing.
    const handleShowUserDetails = useMemo(
      () =>
        onShowUserDetails && resolvedUserName
          ? (_path?: EntityDetailsPath) =>
              onShowUserDetails({
                userName: resolvedUserName,
                entityId: userEntityRecordId,
              })
          : undefined,
      [onShowUserDetails, resolvedUserName, userEntityRecordId]
    );

    const handleShowHostDetails = useMemo(
      () =>
        onShowHostDetails && resolvedHostName
          ? (_path?: EntityDetailsPath) =>
              onShowHostDetails({
                hostName: resolvedHostName,
                entityId: hostEntityRecordId,
              })
          : undefined,
      [onShowHostDetails, resolvedHostName, hostEntityRecordId]
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
                    entityRecord={
                      entityStoreV2Enabled ? userEntityFromStore.entityRecord : undefined
                    }
                    scopeId={scopeId}
                    renderCellActions={renderCellActions}
                    onShowDetails={handleShowUserDetails}
                  />
                </EuiFlexItem>
                <EuiSpacer size="s" />
              </>
            )}
            {showHostOverview && hostEntityIdentifiers && (
              <EuiFlexItem>
                <HostEntityOverview
                  hostName={resolvedHostName}
                  identityFields={hostEntityIdentifiers}
                  entityRecord={entityStoreV2Enabled ? hostEntityFromStore.entityRecord : undefined}
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
