/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiLink, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';

interface CustomCitationProps {
  citationLable: string;
  citationUrl: string;
  citationNumber: number;
}

export const CustomCitation: React.FC<CustomCitationProps> = ({
  citationLable,
  citationUrl,
  citationNumber,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const togglePopover = () => setIsPopoverOpen((prev) => !prev);
  const closePopover = () => setIsPopoverOpen(false);
  const openPopover = () => setIsPopoverOpen(true);

  const button = (
    <EuiButtonEmpty
      onClick={togglePopover}
      onMouseEnter={openPopover}
      size="xs"
      style={{
        padding: 0,
      }}
      contentProps={{
        style: {
          alignItems: 'start',
        },
      }}
    >
      <sup>{`[${citationNumber}]`}</sup>
    </EuiButtonEmpty>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      onMouseLeave={closePopover}
      anchorPosition="upCenter"
    >
      <EuiLink href={citationUrl} target="_blank">
        {citationLable}
      </EuiLink>
    </EuiPopover>
  );
};
