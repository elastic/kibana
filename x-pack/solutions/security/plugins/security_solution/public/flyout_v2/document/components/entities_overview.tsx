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
   * When true, host/user names render as preview links and the alert/misconfig/vuln chips
   * become clickable. The legacy expandable flyout sets this; Flyout v2 and Discover leave
   * it off so everything renders as plain text.
   */
  enableEntityLinks?: boolean;
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
    enableEntityLinks = false,
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
    // Fall back to a `<entity>.name`-only identity when EUID can't extract identifiers from the
    // document (e.g. alerts that carry just `host.name` / `user.name`), so the entity store still
    // gets queried.
    const legacyUserIdentityForStore =
      userName != null && userName !== ''
        ? ({ 'user.name': userName } as IdentityFields)
        : undefined;
    const legacyHostIdentityForStore =
      hostName != null && hostName !== ''
        ? ({ 'host.name': hostName } as IdentityFields)
        : undefined;
    const hostEntityId = euidApi?.euid.getEuidFromObject('host', dataAsNestedObject);
    const userEntityId = euidApi?.euid.getEuidFromObject('user', dataAsNestedObject);

    const userEntityFromStore = useEntityFromStore({
      entityId: userEntityId,
      identityFields: userEntityIdentifiers ?? legacyUserIdentityForStore,
      entityType: 'user',
      skip:
        !entityStoreV2Enabled ||
        (userEntityIdentifiers == null && legacyUserIdentityForStore == null),
    });
    const hostEntityFromStore = useEntityFromStore({
      entityId: hostEntityId,
      identityFields: hostEntityIdentifiers ?? legacyHostIdentityForStore,
      entityType: 'host',
      skip:
        !entityStoreV2Enabled ||
        (hostEntityIdentifiers == null && legacyHostIdentityForStore == null),
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
                    enableEntityLinks={enableEntityLinks}
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
                  enableEntityLinks={enableEntityLinks}
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
