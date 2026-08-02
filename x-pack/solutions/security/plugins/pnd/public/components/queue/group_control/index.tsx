/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPopover,
  useEuiTheme,
} from '@elastic/eui';

import { readQueueGroupMode, writeQueueGroupMode } from '../helpers/persist_group_mode';
import * as i18n from '../translations';
import { QUEUE_GROUP_MODES, type QueueGroupMode } from '../types';

export interface GroupControlProps {
  onChange: (mode: QueueGroupMode) => void;
  value: QueueGroupMode;
}

/**
 * "Group by: Type" switch. Persists the selected mode in sessionStorage so the
 * choice survives navigating away and back within the session.
 */
export const GroupControl: React.FC<GroupControlProps> = ({ onChange, value }) => {
  const { euiTheme } = useEuiTheme();
  const [isOpen, setIsOpen] = useState(false);
  const currentLabel = i18n.GROUP_MODE_LABELS[value];

  const onSelectMode = useCallback(
    (mode: QueueGroupMode) => {
      writeQueueGroupMode(mode);
      onChange(mode);
      setIsOpen(false);
    },
    [onChange]
  );

  const trigger = (
    <EuiButtonEmpty
      aria-expanded={isOpen}
      aria-haspopup="menu"
      aria-label={i18n.groupControlAriaLabel(currentLabel)}
      color="text"
      css={css`
        .euiButtonEmpty__text {
          font-size: 12px;
          line-height: 16px;
        }
      `}
      data-test-subj="pndQueueGroupControl"
      flush="both"
      iconSide="right"
      iconType="chevronSingleDown"
      onClick={() => setIsOpen((open) => !open)}
      size="s"
    >
      <span
        css={css`
          color: ${euiTheme.colors.textSubdued};
          font-weight: ${euiTheme.font.weight.regular};
        `}
      >
        {i18n.GROUP_BY}
      </span>
      <span
        css={css`
          color: ${euiTheme.colors.textHeading};
          font-weight: ${euiTheme.font.weight.semiBold};
          margin-inline-start: 4px;
        `}
      >
        {currentLabel}
      </span>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      anchorPosition="downRight"
      aria-label={i18n.groupControlAriaLabel(currentLabel)}
      button={trigger}
      closePopover={() => setIsOpen(false)}
      isOpen={isOpen}
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        items={QUEUE_GROUP_MODES.map((mode) => (
          <EuiContextMenuItem
            data-test-subj={`pndQueueGroupModeOption-${mode}`}
            icon={mode === value ? 'check' : 'empty'}
            key={mode}
            onClick={() => onSelectMode(mode)}
          >
            {i18n.GROUP_MODE_LABELS[mode]}
          </EuiContextMenuItem>
        ))}
      />
    </EuiPopover>
  );
};

export const useQueueGroupMode = (): {
  mode: QueueGroupMode;
  onChange: (mode: QueueGroupMode) => void;
} => {
  const [mode, setMode] = useState<QueueGroupMode>(readQueueGroupMode);

  const onChange = useCallback((next: QueueGroupMode) => {
    writeQueueGroupMode(next);
    setMode(next);
  }, []);

  return { mode, onChange };
};
