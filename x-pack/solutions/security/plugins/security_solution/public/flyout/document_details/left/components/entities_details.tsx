/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useDocumentDetailsContext } from '../../shared/context';
import { getField, getUserEntityIdentifiers, getHostEntityIdentifiers } from '../../shared/utils';
import { UserDetails } from './user_details';
import { HostDetails } from './host_details';
import { ENTITIES_DETAILS_TEST_ID } from './test_ids';

export const ENTITIES_TAB_ID = 'entity';

/**
 * Entities displayed in the document details expandable flyout left section under the Insights tab
 */
export const EntitiesDetails: React.FC = () => {
  const { getFieldsData, scopeId, dataAsNestedObject } = useDocumentDetailsContext();
  const timestamp = getField(getFieldsData('@timestamp'));

  const userEntityIdentifiers = getUserEntityIdentifiers(dataAsNestedObject, getFieldsData);
  const hostEntityIdentifiers = getHostEntityIdentifiers(dataAsNestedObject, getFieldsData);

  const showDetails = timestamp && (hostEntityIdentifiers || userEntityIdentifiers);
  const showUserDetails = userEntityIdentifiers && timestamp;
  const showHostDetails = hostEntityIdentifiers && timestamp;

  return (
    <>
      {showDetails ? (
        <EuiFlexGroup direction="column" gutterSize="m" data-test-subj={ENTITIES_DETAILS_TEST_ID}>
          {showUserDetails && (
            <EuiFlexItem>
              <UserDetails
                entityIdentifiers={userEntityIdentifiers}
                timestamp={timestamp}
                scopeId={scopeId}
              />
            </EuiFlexItem>
          )}
          {showHostDetails && (
            <EuiFlexItem>
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
