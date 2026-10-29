/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ManageConnectorsLink,
  SandboxConnectorsTable,
} from '../../sandbox_connectors/sandbox_connectors';
import { useAgentConnectors } from '../../sandbox_connectors/use_agent_connectors';
import { AddConnectorFlyout } from '../../sandbox_connectors/add_connector_flyout';
import { SettingsSection } from './settings_section';

export function ConnectorsSection(): React.ReactElement {
  const { hasConnectorsAllPrivileges, canEditAgent } = useAgentConnectors();
  const [isAdding, setIsAdding] = useState(false);

  return (
    <SettingsSection
      title={i18n.translate('xpack.nightshift.settings.connectors.sectionTitle', {
        defaultMessage: 'Connectors',
      })}
      headerAction={<ManageConnectorsLink />}
      data-test-subj="nightshiftConnectorsSection"
    >
      <SandboxConnectorsTable />
      {hasConnectorsAllPrivileges && canEditAgent && (
        <>
          <EuiSpacer size="m" />
          <EuiButton
            size="s"
            iconType="plusCircle"
            onClick={() => setIsAdding(true)}
            data-test-subj="nightshiftAddConnectorButton"
          >
            {i18n.translate('xpack.nightshift.settings.connectors.addButton', {
              defaultMessage: 'Add connector',
            })}
          </EuiButton>
          {isAdding && <AddConnectorFlyout onClose={() => setIsAdding(false)} />}
        </>
      )}
    </SettingsSection>
  );
}
