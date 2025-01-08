/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { noop } from 'lodash/fp';
import React from 'react';

import { type TimelineType, TimelineTypeEnum } from '../../../../../common/api/timeline';

import * as i18n from '../body/translations';

export type PinIcon = 'pin' | 'pinFilled';

export const getPinIcon = (pinned: boolean): PinIcon => (pinned ? 'pinFilled' : 'pin');

interface Props {
  ariaLabel?: string;
  allowUnpinning: boolean;
  isAlert: boolean;
  isDisabled?: boolean;
  timelineType?: TimelineType;
  onClick?: () => void;
  pinned: boolean;
}

export const getDefaultAriaLabel = ({
  isAlert,
  isTemplate,
  isPinned,
}: {
  isAlert: boolean;
  isTemplate: boolean;
  isPinned: boolean;
}): string => {
  if (isTemplate) {
    return i18n.DISABLE_PIN(isAlert);
  } else if (isPinned) {
    return i18n.PINNED(isAlert);
  } else {
    return i18n.UNPINNED(isAlert);
  }
};

export const Pin = React.memo<Props>(
  ({ ariaLabel, allowUnpinning, isAlert, isDisabled, onClick = noop, pinned, timelineType }) => {
    const isTemplate = timelineType === TimelineTypeEnum.template;
    const defaultAriaLabel = getDefaultAriaLabel({
      isAlert,
      isTemplate,
      isPinned: pinned,
    });
    const pinAriaLabel = ariaLabel != null && !isTemplate ? ariaLabel : defaultAriaLabel;

    return (
      <EuiButtonIcon
        aria-label={pinAriaLabel}
        data-test-subj="pin"
        iconType={getPinIcon(pinned)}
        onClick={onClick}
        isDisabled={isDisabled || isTemplate || !allowUnpinning}
        size="s"
      />
    );
  }
);

Pin.displayName = 'Pin';
