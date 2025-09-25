/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  SelectOptionInterruptValue,
  SelectOptionInterruptResumeValue,
} from '@kbn/elastic-assistant-common';
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiBadge } from '@elastic/eui';
import { useInterruptResumeValue } from './use_persisted_interrupt_resume_value';

interface Props {
  interrupt: SelectOptionInterruptValue;
  resumeGraph: (threadId: string, resumeValue: SelectOptionInterruptResumeValue) => void;
  resumedValue?: SelectOptionInterruptResumeValue;
  isLastInConversation: boolean;
  disableAction: boolean;
}

export const SelectOption = ({
  interrupt,
  resumeGraph,
  resumedValue: liveInterruptResumeValue,
  isLastInConversation,
  disableAction,
}: Props) => {
  const { resumeValue, setCachedResumeValue } = useInterruptResumeValue(
    interrupt,
    liveInterruptResumeValue
  );

  const handleOnSelect = (value: SelectOptionInterruptValue['options'][number]['value']) => {
    const newResumeValue: SelectOptionInterruptResumeValue = {
      type: 'SELECT_OPTION',
      value,
      interruptId: interrupt.id,
    };
    setCachedResumeValue(newResumeValue);
    resumeGraph(interrupt.threadId, newResumeValue);
  };

  const disabled =
    disableAction ||
    resumeValue !== undefined ||
    interrupt.expired === true ||
    !isLastInConversation;

  const getOutcome = () => {
    switch (true) {
      case isLastInConversation === false && resumeValue === undefined:
      case interrupt.expired:
        return 'Expired';
      case resumeValue === undefined:
        return undefined;
      case resumeValue !== undefined:
        return (
          interrupt.options?.find((option) => option.value === resumeValue.value)?.label ??
          'Actioned'
        );
    }
  };
  const outcome = getOutcome();

  return (
    <div data-test-subj="select-option-interrupt">
      <div>{interrupt.description}</div>
      <EuiSpacer size="s" />
      <EuiFlexGroup
        responsive={false}
        gutterSize="s"
        alignItems="center"
        justifyContent="flexStart"
      >
        {interrupt.options?.map((option) => {
          return (
            <EuiFlexItem key={option.value} grow={false}>
              <EuiButton
                color={option.buttonColor}
                size="s"
                onClick={() => handleOnSelect(option.value)}
                disabled={disabled}
                data-test-subj={`select-option-${option.value}`}
              >
                {option.label}
              </EuiButton>
            </EuiFlexItem>
          );
        })}
        {outcome && <EuiBadge>{outcome}</EuiBadge>}
      </EuiFlexGroup>
    </div>
  );
};
