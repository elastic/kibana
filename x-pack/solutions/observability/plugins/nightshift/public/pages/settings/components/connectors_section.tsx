/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../../common/ebt_constants';
import {
  ManageConnectorsLink,
  SandboxConnectorsTable,
} from '../../../components/entities/sandbox_connector/sandbox_connectors';
import { useAgentConnectors } from '../../../data/sandbox_connectors/use_agent_connectors';
import { AddConnectorFlyout } from '../../../components/entities/sandbox_connector/add_connector_flyout';
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
            iconType="plus"
            onClick={() => setIsAdding(true)}
            data-test-subj="nightshiftAddConnectorButton"
            {...getEbtProps({
              action: NIGHTSHIFT_EBT_ACTIONS.OPEN_ADD_CONNECTOR,
              element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
            })}
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
