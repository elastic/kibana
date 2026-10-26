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

export const EntityStoreMissingPrivilegesCallout = ({
  privileges,
}: {
  privileges: EntityAnalyticsPrivileges;
}) => (
  <MissingPrivilegesCallout
    // Enabling the Entity Store enforces the install privilege set (manage/cluster/SO/source),
    // not entity-index read+write, so surface that breakdown when the server provides it.
    privileges={{
      ...privileges,
      privileges: privileges.install_privileges ?? privileges.privileges,
    }}
    title={
      <FormattedMessage
        id="xpack.securitySolution.riskEngine.missingPrivilegesCallOut.title"
        defaultMessage="Insufficient privileges to enable the Entity Store"
      />
    }
  />
);
