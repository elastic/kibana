/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField, getUserEntityIdentifiers, getHostEntityIdentifiers } from '../../shared/utils';
import { UserDetails } from './user_details';
import { HostDetails } from './host_details';
import { ENTITIES_DETAILS_TEST_ID } from './test_ids';
import { FF_ENABLE_ENTITY_STORE_V2 } from '../../../../../common/entity_analytics/entity_store/constants';
import { useUiSetting } from '../../../../common/lib/kibana';
import { useEntityFromStore } from '../../../entity_details/shared/hooks/use_entity_from_store';

export const ENTITIES_TAB_ID = 'entity';

/**
 * Entities displayed in the document details expandable flyout left section under the Insights tab
 */
export const EntitiesDetails: React.FC = () => {
  const { getFieldsData, scopeId, dataAsNestedObject } = useDocumentDetailsContext();
  const timestamp = getField(getFieldsData('@timestamp'));

  const userEntityIdentifiers = getUserEntityIdentifiers(dataAsNestedObject, getFieldsData);
  const hostEntityIdentifiers = getHostEntityIdentifiers(dataAsNestedObject, getFieldsData);

  const entityStoreV2Enabled = useUiSetting<boolean>(FF_ENABLE_ENTITY_STORE_V2, false);
  const userEntityFromStore = useEntityFromStore({
    entityIdentifiers: userEntityIdentifiers ?? {},
    entityType: 'user',
    skip: !userEntityIdentifiers || !entityStoreV2Enabled,
  });
  const hostEntityFromStore = useEntityFromStore({
    entityIdentifiers: hostEntityIdentifiers ?? {},
    entityType: 'host',
    skip: !hostEntityIdentifiers || !entityStoreV2Enabled,
  });

  const showUserDetails =
    userEntityIdentifiers &&
    timestamp &&
    (!entityStoreV2Enabled || userEntityFromStore.entityRecord != null);
  const showHostDetails =
    hostEntityIdentifiers &&
    timestamp &&
    (!entityStoreV2Enabled || hostEntityFromStore.entityRecord != null);
  const showDetails = timestamp && (showUserDetails || showHostDetails);

  return (
    <>
      {showDetails ? (
        <EuiFlexGroup direction="column" gutterSize="m" data-test-subj={ENTITIES_DETAILS_TEST_ID}>
          {showUserDetails && (
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.insights.entities.userDetailsTitle"
                    defaultMessage="User"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />
              <UserDetails
                entityIdentifiers={userEntityIdentifiers}
                timestamp={timestamp}
                scopeId={scopeId}
              />
            </EuiFlexItem>
          )}
          {showHostDetails && (
            <EuiFlexItem>
              <EuiTitle size="xs">
                <h3>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.left.insights.entities.hostDetailsTitle"
                    defaultMessage="Host"
                  />
                </h3>
              </EuiTitle>
              <EuiSpacer size="s" />

              <HostDetails
                entityIdentifiers={hostEntityIdentifiers}
                timestamp={timestamp}
                scopeId={scopeId}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      ) : (
        <FormattedMessage
          id="xpack.securitySolution.flyout.left.insights.entities.noDataDescription"
          defaultMessage="Host and user information are unavailable for this alert."
        />
      )}
    </>
  );
};

EntitiesDetails.displayName = 'EntitiesDetails';
