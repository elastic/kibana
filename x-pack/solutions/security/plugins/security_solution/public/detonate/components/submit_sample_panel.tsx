/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';

import {
  SUBMIT_BODY,
  SUBMIT_BUTTON,
  SUBMIT_COMING_SOON,
  SUBMIT_TITLE,
  SUBMIT_UNAVAILABLE_TOOLTIP,
} from '../translations';

/**
 * Call to action inviting users to detonate their own sample. There is no upload backend yet, so
 * the button is deliberately disabled and labelled rather than linking somewhere that would fail.
 */
const SubmitSamplePanelComponent: React.FC = () => (
  <EuiPanel hasBorder paddingSize="m" color="primary" data-test-subj="detonateSubmitPanel">
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiIcon type="upload" size="l" aria-hidden={true} />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h3>{SUBMIT_TITLE}</h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{SUBMIT_COMING_SOON}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
    <EuiSpacer size="s" />
    <EuiText size="s">
      <p>{SUBMIT_BODY}</p>
    </EuiText>
    <EuiSpacer size="m" />
    <EuiToolTip content={SUBMIT_UNAVAILABLE_TOOLTIP}>
      <EuiButton fill isDisabled iconType="upload" data-test-subj="detonateSubmitButton">
        {SUBMIT_BUTTON}
      </EuiButton>
    </EuiToolTip>
  </EuiPanel>
);

export const SubmitSamplePanel = React.memo(SubmitSamplePanelComponent);
