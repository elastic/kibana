/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  CreateConnectorButton,
  ManageConnectorsLink,
  SandboxConnectorsTable,
} from '../../sandbox_connectors/sandbox_connectors';
import { SettingsSection } from './settings_section';

/** The connectors the investigation agent can use from its sandbox in this space. */
export function ConnectorsSection(): React.ReactElement {
  return (
    <SettingsSection
      title={i18n.translate('xpack.nightshift.settings.connectors.sectionTitle', {
        defaultMessage: 'Connectors',
      })}
      headerAction={<ManageConnectorsLink />}
      data-test-subj="nightshiftConnectorsSection"
    >
      <SandboxConnectorsTable />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" responsive={false}>
        <EuiFlexItem grow={false}>
          <CreateConnectorButton />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SettingsSection>
  );
}
