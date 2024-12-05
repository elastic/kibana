/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';

import { SHOW_API_KEY_LABEL, HIDE_API_KEY_LABEL, COPY_API_KEY_BUTTON_LABEL } from '../constants';

interface Props {
  copy: () => void;
  toggleIsHidden: () => void;
  isHidden: boolean;
  text: React.ReactNode;
}

export const ApiKey: React.FC<Props> = ({ copy, toggleIsHidden, isHidden, text }) => {
  const hideIcon = isHidden ? 'eye' : 'eyeClosed';
  const hideIconLabel = isHidden ? SHOW_API_KEY_LABEL : HIDE_API_KEY_LABEL;

  return (
    <>
      <EuiButtonIcon
        onClick={copy}
        iconType="copyClipboard"
        aria-label={COPY_API_KEY_BUTTON_LABEL}
      />
      <EuiButtonIcon
        onClick={toggleIsHidden}
        iconType={hideIcon}
        aria-label={hideIconLabel}
        aria-pressed={!isHidden}
        style={{ marginRight: '0.25em' }}
      />
      {text}
    </>
  );
};
