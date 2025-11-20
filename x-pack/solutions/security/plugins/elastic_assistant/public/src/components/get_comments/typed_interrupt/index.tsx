/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  InterruptType,
  InterruptValue,
  InterruptResumeValue,
  SelectOptionInterruptResumeValue,
  InputTextInterruptResumeValue,
} from '@kbn/elastic-assistant-common';
import React from 'react';
import { SelectOption } from './typed_interrupts/select_option';
import { InputText } from './typed_interrupts/input_text';

interface Props<T extends InterruptType> {
  interruptValue: { type: T } & InterruptValue;
  resumeGraph: (threadId: string, resumeValue: { type: T } & InterruptResumeValue) => void;
  interruptResumeValue?: { type: T } & InterruptResumeValue;
  isLastInConversation: boolean;
}

export const InterruptFactory = ({
  interruptValue: interrupt,
  resumeGraph,
  interruptResumeValue: resumedValue,
  isLastInConversation,
}: Props<InterruptType>) => {
  switch (interrupt.type) {
    case 'SELECT_OPTION':
      return (
        <SelectOption
          interrupt={interrupt}
          resumeGraph={resumeGraph}
          resumedValue={resumedValue as SelectOptionInterruptResumeValue}
          isLastInConversation={isLastInConversation}
        />
      );
    case 'INPUT_TEXT':
      return (
        <InputText
          interruptValue={interrupt}
          resumeGraph={resumeGraph}
          resumeValue={resumedValue as InputTextInterruptResumeValue}
          isLastInConversation={isLastInConversation}
        />
      );
    default:
      const neverValue: never = interrupt;
      throw new Error(`Unhandled typed interrupt type: ${JSON.stringify(neverValue)}`);
  }
};
