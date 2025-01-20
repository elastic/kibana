/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButtonIcon } from '@elastic/eui';

interface CopyActionButtonProps {
  copyText: string;
  ariaLabel: string;
}

export const CopyActionButton: React.FC<CopyActionButtonProps> = ({ copyText, ariaLabel }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(copyText);
  };

  return (
    <EuiButtonIcon
      aria-label={ariaLabel}
      color="text"
      iconType="copyClipboard"
      onClick={handleCopy}
    />
  );
};
