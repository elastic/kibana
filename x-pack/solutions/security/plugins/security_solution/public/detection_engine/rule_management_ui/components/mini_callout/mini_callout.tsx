/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, type EuiCallOutProps } from '@elastic/eui';
import React, { memo } from 'react';
import { useBoolean } from '@kbn/react-hooks';
import * as i18n from './translations';

export interface MiniCalloutProps {
  color?: EuiCallOutProps['color'];
  dismissible?: boolean;
  title: EuiCallOutProps['title'];
  text?: EuiCallOutProps['text'];
  'data-test-subj'?: string;
}

/**
 * A customized mini variant of the EuiCallOut component. Includes additional styling overrides
 * for displaying rich titles when callout size="s", and an option enabling dismissal.
 *
 * @param color color for the callout, defaults to 'primary'
 * @param dismissible whether the callout can be dismissed, defaults to 'true'
 * @param title ReactNode or string title text to be displayed
 * @param text ReactNode or string description text to be displayed
 * @param dataTestSubj data-test-subj attribute for testing purposes, defaults to 'mini-callout'
 */
export const MiniCallout = memo(function MiniCallout({
  color = 'primary',
  dismissible = true,
  title,
  text,
  'data-test-subj': dataTestSubj = 'mini-callout',
}: MiniCalloutProps): JSX.Element | null {
  const [isDismissed, { on: dismiss }] = useBoolean(false);

  if (isDismissed) {
    return null;
  }

  return (
    <EuiCallOut
      size="s"
      title={title}
      text={text}
      color={color}
      onDismiss={dismissible ? dismiss : undefined}
      dismissButtonProps={{ 'aria-label': i18n.DISMISS }}
      data-test-subj={dataTestSubj}
    />
  );
});
