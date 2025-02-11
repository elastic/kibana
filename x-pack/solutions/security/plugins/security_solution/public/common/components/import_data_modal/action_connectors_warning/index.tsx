/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { FC } from 'react';

import { EuiButton, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import type { WarningSchema } from '../../../../../common/api/detection_engine';
import { useKibana } from '../../../lib/kibana/kibana_react';
import * as i18n from '../translations';

interface ActionConnectorWarningsComponentProps {
  actionConnectorsWarnings: WarningSchema[];
  importedActionConnectorsCount?: number;
}
const ActionConnectorWarningsComponent: FC<ActionConnectorWarningsComponentProps> = ({
  actionConnectorsWarnings,
  importedActionConnectorsCount,
}) => {
  const { http } = useKibana().services;

  if (!importedActionConnectorsCount || !actionConnectorsWarnings.length) return null;
  const { actionPath, message, buttonLabel } = actionConnectorsWarnings[0];

  return (
    <EuiCallOut
      data-test-subj="actionConnectorsWarningsCallOut"
      size="m"
      heading="h2"
      iconType="warning"
      title={
        <span data-test-subj="actionConnectorsWarningsCallOutTitle">
          {i18n.ACTION_CONNECTORS_WARNING_TITLE(importedActionConnectorsCount)}
        </span>
      }
      color="warning"
    >
      <EuiFlexGroup direction="column" gutterSize="none">
        <EuiFlexItem data-test-subj="actionConnectorsWarningsCallOutMessage">
          <EuiText size="xs">{message}</EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup gutterSize="none" direction="columnReverse" alignItems="flexEnd">
            <EuiButton
              data-test-subj="actionConnectorsWarningsCallOutButton"
              color="warning"
              href={http.basePath.prepend(actionPath)}
            >
              {buttonLabel || i18n.ACTION_CONNECTORS_WARNING_BUTTON}
            </EuiButton>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiCallOut>
  );
};

ActionConnectorWarningsComponent.displayName = 'ActionConnectorWarningsComponent';

export const ActionConnectorWarnings = React.memo(ActionConnectorWarningsComponent);

ActionConnectorWarnings.displayName = 'ActionConnectorWarnings';
