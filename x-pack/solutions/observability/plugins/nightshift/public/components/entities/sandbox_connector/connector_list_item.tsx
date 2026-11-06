/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiListGroupItem,
  EuiLoadingSpinner,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';

export function ConnectorListItem({
  connector,
  isAssigned,
  onToggle,
  isUpdating = false,
  toggleDisabledReason,
  onOpenDetails,
  openDetailsDisabledReason,
  onDelete,
  deleteDisabledReason,
}: {
  connector: SandboxConnector;
  isAssigned: boolean;
  onToggle: (isAssigned: boolean) => void;
  isUpdating?: boolean;
  toggleDisabledReason?: string;
  onOpenDetails: () => void;
  openDetailsDisabledReason?: string;
  onDelete: () => void;
  deleteDisabledReason?: string;
}): React.ReactElement {
  const { euiTheme } = useEuiTheme();
  const checkboxId = useGeneratedHtmlId({ prefix: 'nightshiftConnectorListItem' });

  const openDetailsLabel = i18n.translate('xpack.nightshift.connectorList.openDetails', {
    defaultMessage: 'Open details for {name}',
    values: { name: connector.name },
  });
  const deleteLabel = i18n.translate('xpack.nightshift.connectorList.delete', {
    defaultMessage: 'Delete {name}',
    values: { name: connector.name },
  });

  const checkbox = (
    <EuiCheckbox
      id={checkboxId}
      checked={isAssigned}
      onChange={(event) => onToggle(event.target.checked)}
      disabled={isUpdating || toggleDisabledReason !== undefined}
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{connector.name}</EuiFlexItem>
          {isUpdating && (
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner
                size="s"
                data-test-subj={`nightshiftConnectorListUpdating-${connector.id}`}
              />
            </EuiFlexItem>
          )}
          {connector.is_preconfigured && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">
                {i18n.translate('xpack.nightshift.connectorList.preconfiguredBadge', {
                  defaultMessage: 'Preconfigured',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      data-test-subj={`nightshiftConnectorListToggle-${connector.id}`}
    />
  );

  return (
    <EuiListGroupItem
      data-test-subj={`nightshiftConnectorListItem-${connector.id}`}
      // EUI only paints hover on interactive (button/link) rows. This row can't be a
      // button — it nests a checkbox and action icons — so apply the same hover token.
      css={css`
        &:hover,
        &:focus-within {
          background-color: ${euiTheme.colors.backgroundBaseInteractiveHover};
        }
      `}
      label={
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={true}>
            {toggleDisabledReason === undefined ? (
              checkbox
            ) : (
              <EuiToolTip position="top" content={toggleDisabledReason}>
                {checkbox}
              </EuiToolTip>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={openDetailsDisabledReason ?? openDetailsLabel}
                  disableScreenReaderOutput
                >
                  <EuiButtonIcon
                    iconType="maximize"
                    color="text"
                    aria-label={openDetailsLabel}
                    isDisabled={openDetailsDisabledReason !== undefined}
                    onClick={onOpenDetails}
                    data-test-subj={`nightshiftConnectorListOpenDetails-${connector.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content={deleteDisabledReason ?? deleteLabel} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={deleteLabel}
                    isDisabled={deleteDisabledReason !== undefined}
                    onClick={onDelete}
                    data-test-subj={`nightshiftConnectorListDelete-${connector.id}`}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
}
