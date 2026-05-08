/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils';
import { getFieldValue } from '@kbn/discover-utils';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { FF_ENABLE_ENTITY_STORE_V2, useEntityStoreEuidApi } from '@kbn/entity-store/public';
import { useUiSetting } from '../../../common/lib/kibana';
import type { IdentityFields } from '../../../flyout/document_details/shared/utils';
import { getField } from '../../../flyout/document_details/shared/utils';
import { useEventDetails } from '../../../flyout/document_details/shared/hooks/use_event_details';
import { useEntityFromStore } from '../../../flyout/entity_details/shared/hooks/use_entity_from_store';
import { ENTITIES_DETAILS_VIEW_TEST_ID } from '../test_ids';
import { HostDetailsView } from './host_details_view';
import { UserDetailsView } from './user_details_view';

const NO_DATA = (
  <FormattedMessage
    id="xpack.securitySolution.flyout.entities.details.noDataDescription"
    defaultMessage="Host and user information are unavailable for this alert."
  />
);

export interface EntitiesDetailsViewProps {
  /**
   * Alert/event document used to resolve entity identifiers.
   */
  hit: DataTableRecord;
  /**
   * Pre-fetched ECS-nested object. The legacy expandable flyout passes this from context.
   */
  dataAsNestedObject?: Ecs | null;
  /**
   * Scope id used by cell actions and entity drill-ins.
   */
  scopeId: string;
  /**
   * Optional field values supplied by the legacy expandable flyout context.
   */
  timestamp?: string | null;
  hostName?: string | null;
  userName?: string | null;
}

/**
 * Chrome-free entities details body shared by legacy and v2 entity flyouts.
 */
export const EntitiesDetailsView: FC<EntitiesDetailsViewProps> = memo(
  ({
    hit,
    dataAsNestedObject: dataAsNestedObjectProp,
    scopeId,
    timestamp: timestampProp,
    hostName: hostNameProp,
    userName: userNameProp,
  }) => {
    const timestamp =
      timestampProp !== undefined ? timestampProp : getField(getFieldValue(hit, '@timestamp'));
    const hostName =
      hostNameProp !== undefined ? hostNameProp : getField(getFieldValue(hit, 'host.name'));
    const userName =
      userNameProp !== undefined ? userNameProp : getField(getFieldValue(hit, 'user.name'));

    const { dataAsNestedObject: fetchedData } = useEventDetails({
      eventId: hit.raw._id,
      indexName: hit.raw._index,
      skip: dataAsNestedObjectProp !== undefined,
    });
    const dataAsNestedObject =
      dataAsNestedObjectProp !== undefined ? dataAsNestedObjectProp : fetchedData;

    const euidApi = useEntityStoreEuidApi();
    const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2);

    const userEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
      'user',
      dataAsNestedObject
    ) as IdentityFields;
    const legacyUserIdentityForStore =
      userName != null && userName !== ''
        ? ({ 'user.name': userName } as IdentityFields)
        : undefined;
    const userEntityId = euidApi?.euid.getEuidFromObject('user', dataAsNestedObject);
    const userEntityFromStore = useEntityFromStore({
      entityId: userEntityId,
      identityFields: userEntityIdentifiers ?? legacyUserIdentityForStore,
      entityType: 'user',
      skip:
        !entityStoreV2Enabled ||
        (userEntityIdentifiers == null && legacyUserIdentityForStore == null),
    });

    const hostEntityIdentifiers = euidApi?.euid.getEntityIdentifiersFromDocument(
      'host',
      dataAsNestedObject
    ) as IdentityFields;
    const hostEntityId = euidApi?.euid.getEuidFromObject('host', dataAsNestedObject);
    const hostEntityFromStore = useEntityFromStore({
      entityId: hostEntityId,
      identityFields: hostEntityIdentifiers ?? undefined,
      entityType: 'host',
      skip: !hostEntityIdentifiers || !entityStoreV2Enabled,
    });
    const hostRecord = hostEntityFromStore.entityRecord;
    const hostNameFromStore =
      hostRecord != null && 'host' in hostRecord ? hostRecord.host?.name : undefined;

    const userDisplayName = userEntityFromStore.entityRecord?.entity?.name ?? userName;
    const hostDisplayName =
      hostEntityFromStore.entityRecord?.entity?.name ?? hostName ?? hostNameFromStore;

    const showUserDetails = timestamp != null && userDisplayName != null;
    const showHostDetails = timestamp != null && hostDisplayName != null;
    const showDetails = showUserDetails || showHostDetails;

    return (
      <>
        {showDetails ? (
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            data-test-subj={ENTITIES_DETAILS_VIEW_TEST_ID}
          >
            {showUserDetails && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entities.details.userDetailsTitle"
                      defaultMessage="User"
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <UserDetailsView
                  userName={userDisplayName}
                  entityId={userEntityFromStore.entityRecord?.entity?.id}
                  timestamp={timestamp ?? ''}
                  scopeId={scopeId}
                />
              </EuiFlexItem>
            )}
            {showHostDetails && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.securitySolution.flyout.entities.details.hostDetailsTitle"
                      defaultMessage="Host"
                    />
                  </h3>
                </EuiTitle>
                <EuiSpacer size="s" />
                <HostDetailsView
                  hostName={hostDisplayName}
                  entityId={hostEntityFromStore.entityRecord?.entity?.id}
                  timestamp={timestamp ?? ''}
                  scopeId={scopeId}
                  hostEntityFromStoreResult={entityStoreV2Enabled ? hostEntityFromStore : undefined}
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        ) : (
          NO_DATA
        )}
      </>
    );
  }
);

EntitiesDetailsView.displayName = 'EntitiesDetailsView';
