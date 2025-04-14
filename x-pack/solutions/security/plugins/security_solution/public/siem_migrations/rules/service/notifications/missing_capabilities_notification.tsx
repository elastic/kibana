/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import type { ToastInput } from '@kbn/core-notifications-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiCode, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { MissingCapability } from '../capabilities';

export const getMissingCapabilitiesToast = (
  missingCapabilities: MissingCapability[],
  core: CoreStart
): ToastInput => ({
  color: 'danger',
  iconType: 'alert',
  title: i18n.translate(
    'xpack.securitySolution.siemMigrations.rulesService.missingCapabilities.title',
    { defaultMessage: 'Insufficient privileges.' }
  ),
  text: toMountPoint(
    <EuiFlexGroup gutterSize="m" direction="column" data-test-subj="missingPrivilegesGroup">
      <EuiFlexItem>
        {i18n.translate(
          'xpack.securitySolution.siemMigrations.rulesService.missingCapabilities.description',
          { defaultMessage: 'The privileges required to start a rule migration are:' }
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiCode>
          <ul>
            {missingCapabilities.map(({ capability, description }) => (
              <li key={capability}>{description}</li>
            ))}
          </ul>
        </EuiCode>
      </EuiFlexItem>
      <EuiFlexItem>
        {i18n.translate(
          'xpack.securitySolution.siemMigrations.rulesService.missingCapabilities.contactAdministrator',
          { defaultMessage: 'Contact your administrator for assistance.' }
        )}
      </EuiFlexItem>
    </EuiFlexGroup>,
    core
  ),
});
