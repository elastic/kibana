/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAccordion, EuiCodeBlock, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import * as i18n from '../../translations';
import { AccordionButtonContent } from '../shared';

interface MessageSectionProps {
  message: string;
}

export const MessageSection: React.FC<MessageSectionProps> = ({ message }) => {
  const accordionId = useGeneratedHtmlId({ prefix: 'executionSummary' });

  return (
    <EuiAccordion
      id={accordionId}
      data-test-subj="executionDetailsFlyoutMessageSection"
      buttonContent={
        <AccordionButtonContent>{i18n.FLYOUT_ACCORDION_MESSAGE}</AccordionButtonContent>
      }
      initialIsOpen
    >
      <EuiSpacer size="s" />
      <EuiCodeBlock isCopyable whiteSpace="pre-wrap" paddingSize="m">
        {message}
      </EuiCodeBlock>
    </EuiAccordion>
  );
};
