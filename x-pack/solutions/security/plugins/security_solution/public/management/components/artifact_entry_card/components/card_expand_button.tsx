/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import type { CommonProps, EuiButtonIconPropsForButton } from '@elastic/eui';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import {
  COLLAPSE_ACTION,
  COLLAPSE_ITEM_ACTION,
  EXPAND_ACTION,
  EXPAND_ITEM_ACTION,
} from './translations';

export interface CardExpandButtonProps extends Pick<CommonProps, 'data-test-subj'> {
  expanded: boolean;
  onClick: EuiButtonIconPropsForButton['onClick'];
  /** Name of the artifact this button toggles. Included in the button's accessible name */
  itemName: string;
  /**
   * The `id` of the section this button toggles. Referenced only while `expanded` is `true`, as the
   * section is not rendered while collapsed
   */
  controlsId?: string;
}

export const CardExpandButton = memo<CardExpandButtonProps>(
  ({ expanded, onClick, itemName, controlsId, 'data-test-subj': dataTestSubj }) => {
    return (
      <EuiToolTip content={expanded ? COLLAPSE_ACTION : EXPAND_ACTION} disableScreenReaderOutput>
        <EuiButtonIcon
          iconType={expanded ? 'chevronSingleUp' : 'chevronSingleDown'}
          onClick={onClick}
          data-test-subj={dataTestSubj}
          aria-label={expanded ? COLLAPSE_ITEM_ACTION(itemName) : EXPAND_ITEM_ACTION(itemName)}
          aria-expanded={expanded}
          aria-controls={expanded ? controlsId : undefined}
        />
      </EuiToolTip>
    );
  }
);
CardExpandButton.displayName = 'CardExpandButton';
