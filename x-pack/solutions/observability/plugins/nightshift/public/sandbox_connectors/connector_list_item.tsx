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
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SandboxConnector } from '@kbn/nightshift-investigations-plugin/common';

const ACTIONS_CLASS = 'nightshiftConnectorListItem__actions';

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

  const rowStyles = css`
    display: flex;
    align-items: center;
    gap: ${euiTheme.size.s};
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
    border-radius: ${euiTheme.border.radius.medium};

    &:hover,
    &:focus-within {
      background: ${euiTheme.colors.backgroundBaseSubdued};

      .${ACTIONS_CLASS} {
        opacity: 1;
      }
    }
  `;
  const labelStyles = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.s};
  `;

  const actionsStyles = css`
    display: flex;
    gap: ${euiTheme.size.xs};
    margin-left: auto;
    opacity: 0;
    transition: opacity ${euiTheme.animation.fast};
  `;

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
        <span css={labelStyles}>
          {connector.name}
          {connector.is_preconfigured && (
            <EuiBadge color="hollow">
              {i18n.translate('xpack.nightshift.connectorList.preconfiguredBadge', {
                defaultMessage: 'Preconfigured',
              })}
            </EuiBadge>
          )}
        </span>
      }
      data-test-subj={`nightshiftConnectorListToggle-${connector.id}`}
    />
  );

  return (
    <li css={rowStyles} data-test-subj={`nightshiftConnectorListItem-${connector.id}`}>
      {toggleDisabledReason === undefined ? (
        checkbox
      ) : (
        <EuiToolTip position="top" content={toggleDisabledReason}>
          {checkbox}
        </EuiToolTip>
      )}
      <div className={ACTIONS_CLASS} css={actionsStyles}>
        <EuiToolTip
          content={openDetailsDisabledReason ?? openDetailsLabel}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            iconType="maximize"
            aria-label={openDetailsLabel}
            isDisabled={openDetailsDisabledReason !== undefined}
            onClick={onOpenDetails}
            data-test-subj={`nightshiftConnectorListOpenDetails-${connector.id}`}
          />
        </EuiToolTip>
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
      </div>
    </li>
  );
}
