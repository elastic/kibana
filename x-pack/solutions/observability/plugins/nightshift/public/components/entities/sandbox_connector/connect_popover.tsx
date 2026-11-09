/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiContextMenuItem,
  EuiHorizontalRule,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';
import { ConnectorList } from './connector_list';

/**
 * The "Connect" control of a type that already has connectors in the space: a popover listing
 * them to tick for the investigation agent, and "Create connector" for a new one.
 */
export function ConnectPopover({
  typeId,
  typeName,
  connectors,
  canOpenDetails,
  onOpenDetails,
  canDelete,
  onDelete,
  createDisabledReason,
  onCreate,
}: {
  typeId: string;
  typeName: string;
  connectors: SandboxConnector[];
  canOpenDetails: boolean;
  onOpenDetails: (connector: SandboxConnector) => void;
  canDelete: boolean;
  onDelete: (connector: SandboxConnector) => void;
  createDisabledReason?: string;
  onCreate: () => void;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);

  const connectLabel = i18n.translate('xpack.nightshift.connectPopover.connectButton', {
    defaultMessage: 'Connect',
  });

  return (
    <EuiPopover
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          aria-label={`${connectLabel} ${typeName}`}
          data-test-subj={`${typeId}-connect`}
        >
          {connectLabel}
        </EuiButton>
      }
      isOpen={isOpen}
      closePopover={close}
      aria-label={i18n.translate('xpack.nightshift.connectPopover.label', {
        defaultMessage: '{typeName} connectors',
        values: { typeName },
      })}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      ownFocus
      panelProps={{ 'data-test-subj': `${typeId}-connectPopover` }}
    >
      <div
        css={css`
          min-width: 320px;
          padding: ${euiTheme.size.xs} 0;
        `}
      >
        <ConnectorList
          connectors={connectors}
          canOpenDetails={canOpenDetails}
          onOpenDetails={(connector) => {
            close();
            onOpenDetails(connector);
          }}
          canDelete={canDelete}
          onDelete={(connector) => {
            close();
            onDelete(connector);
          }}
          data-test-subj={`${typeId}-connectors`}
        />
        <EuiHorizontalRule margin="xs" />
        <EuiContextMenuItem
          icon="plusCircle"
          disabled={createDisabledReason !== undefined}
          toolTipContent={createDisabledReason}
          onClick={() => {
            close();
            onCreate();
          }}
          data-test-subj={`${typeId}-create`}
        >
          {i18n.translate('xpack.nightshift.connectPopover.createConnector', {
            defaultMessage: 'Create connector',
          })}
        </EuiContextMenuItem>
      </div>
    </EuiPopover>
  );
}
