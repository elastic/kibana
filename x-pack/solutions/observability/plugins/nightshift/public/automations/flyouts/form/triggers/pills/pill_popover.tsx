/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFormControlButton, EuiPopover } from '@elastic/eui';

export const PillPopover = ({
  label,
  ariaLabel,
  children,
  testSubject,
  isInvalid = false,
}: {
  label: string;
  ariaLabel: string;
  children: (close: () => void) => React.ReactNode;
  testSubject: string;
  isInvalid?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <EuiPopover
      aria-label={ariaLabel}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downLeft"
      button={
        <EuiFormControlButton
          compressed
          fullWidth={false}
          isInvalid={isInvalid}
          aria-invalid={isInvalid}
          value={label}
          aria-label={ariaLabel}
          iconType="chevronSingleDown"
          iconSide="right"
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj={testSubject}
        />
      }
    >
      {children(() => setIsOpen(false))}
    </EuiPopover>
  );
};
