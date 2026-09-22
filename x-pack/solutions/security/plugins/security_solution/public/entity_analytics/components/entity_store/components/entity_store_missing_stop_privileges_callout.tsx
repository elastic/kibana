/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EntityAnalyticsPrivileges } from '../../../../../common/api/entity_analytics';
import { MissingPrivilegesCallout } from '../../missing_privileges_callout';

/**
 * Shown when Entity Analytics is on but the user does not have the necessary privileges to stop it.
 */
export const EntityStoreMissingStopPrivilegesCallout = ({
  privileges,
}: {
  privileges: EntityAnalyticsPrivileges;
}) => (
  <MissingPrivilegesCallout
    privileges={{
      has_all_required: false,
      privileges: {
        elasticsearch: {},
        // Stop only needs the Kibana SO write checked under install_privileges. see `userHasEntityStoreStopPrivileges` for more details.
        kibana: privileges.install_privileges?.kibana ?? {},
      },
    }}
    title={
      <FormattedMessage
        id="xpack.securitySolution.entityAnalytics.missingStopPrivilegesCallOut.title"
        defaultMessage="Insufficient privileges to turn off Entity Analytics"
      />
    }
  />
);
