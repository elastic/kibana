/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty, EuiContextMenuItem, EuiContextMenuPanel, EuiPopover } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const connectionTypeLabels = {
  elasticsearch: i18n.translate('vectordbOnboarding.connectionType.elasticsearchLabel', {
    defaultMessage: 'Elasticsearch',
  }),
  mcpServer: i18n.translate('vectordbOnboarding.connectionType.mcpServerLabel', {
    defaultMessage: 'Agent Builder MCP',
  }),
};

export type ConnectionType = keyof typeof connectionTypeLabels;

const CONNECTION_TYPES = Object.keys(connectionTypeLabels) as ConnectionType[];

interface ConnectionTypePopoverProps {
  connectionType: ConnectionType;
  onConnectionTypeChange: (connectionType: ConnectionType) => void;
  telemetryPage: string;
}

export const ConnectionTypePopover = ({
  connectionType,
  onConnectionTypeChange,
  telemetryPage,
}: ConnectionTypePopoverProps) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const telemetryPrefix = `vectordbOnboarding-${telemetryPage}`;

  const selectConnectionType = (type: ConnectionType) => {
    setIsPopoverOpen(false);
    onConnectionTypeChange(type);
  };

  const items = CONNECTION_TYPES.map((type) => (
    <EuiContextMenuItem
      key={type}
      icon={connectionType === type ? 'check' : 'empty'}
      onClick={() => selectConnectionType(type)}
      data-test-subj={`vectordbConnectionTypeOption-${type}`}
      data-telemetry-id={`${telemetryPrefix}-connectionType-${type}`}
    >
      {connectionTypeLabels[type]}
    </EuiContextMenuItem>
  ));

  return (
    <EuiPopover
      button={
        <EuiButtonEmpty
          size="s"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsPopoverOpen((open) => !open)}
          data-test-subj="vectordbConnectionTypeButton"
          data-telemetry-id={`${telemetryPrefix}-connectionType-openPopover`}
          aria-label={i18n.translate('vectordbOnboarding.connectionType.buttonAriaLabel', {
            defaultMessage: 'Select connection details type',
          })}
        >
          {connectionTypeLabels[connectionType]}
        </EuiButtonEmpty>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      aria-label={i18n.translate('vectordbOnboarding.connectionType.popoverAriaLabel', {
        defaultMessage: 'Connection details type menu',
      })}
    >
      <EuiContextMenuPanel items={items} />
    </EuiPopover>
  );
};
