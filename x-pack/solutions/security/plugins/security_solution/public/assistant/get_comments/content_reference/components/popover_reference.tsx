/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';
import { ContentReferenceButton } from './content_reference_button';

interface Props {
  contentReferenceCount: number;
  'data-test-subj'?: string;
}

export const PopoverReference: React.FC<React.PropsWithChildren<Props>> = ({
  contentReferenceCount,
  children,
  ...rest
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);
  const openPopover = () => setIsPopoverOpen(true);

  const button = (
    <ContentReferenceButton
      onClick={togglePopover}
      onMouseEnter={openPopover}
      contentReferenceCount={contentReferenceCount}
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      onMouseLeave={closePopover}
      anchorPosition="upCenter"
      style={{
        verticalAlign: "baseline",
      }}
      {...rest}
    >
      {children}
    </EuiPopover>
  );
};
