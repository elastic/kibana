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
  ManageConnectorsLink,
  SandboxConnectorsTable,
} from '../../sandbox_connectors/sandbox_connectors';
import { InvestigationAgentAddConnectorMenu } from '../../sandbox_connectors/add_connector_menu';
import { SettingsSection } from './settings_section';

/** The connectors assigned to the investigation agent, the same list Agent Builder manages. */
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
          <InvestigationAgentAddConnectorMenu fill={false} size="s" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SettingsSection>
  );
}
