/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  InputTextInterruptValue,
  InputTextInterruptResumeValue,
} from '@kbn/elastic-assistant-common';
import { EuiBadge, EuiButton, EuiFieldText, EuiFlexGroup, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  interruptValue: InputTextInterruptValue;
  resumeGraph: (threadId: string, resumeValue: InputTextInterruptResumeValue) => void;
  resumeValue?: InputTextInterruptResumeValue;
  isLastInConversation: boolean;
}

export const InputText = ({
  interruptValue: interrupt,
  resumeGraph,
  resumeValue: initialResumeValue,
  isLastInConversation,
}: Props) => {
  const [input, setInput] = React.useState<string>(initialResumeValue?.value ?? '');
  const [resumeValue, setResumeValue] = React.useState<InputTextInterruptResumeValue | undefined>(
    initialResumeValue
  );

  const onSubmit = () => {
    const newResumeValue: InputTextInterruptResumeValue = { type: 'INPUT_TEXT', value: input };
    setResumeValue(newResumeValue);
    resumeGraph(interrupt.threadId, newResumeValue);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const getOutcome = () => {
    switch (true) {
      case isLastInConversation === false && resumeValue === undefined:
      case interrupt.expired:
        return 'Expired';
      case resumeValue === undefined:
        return undefined;
      case resumeValue !== undefined:
        return resumeValue?.value ?? 'Actioned';
    }
  };

  const outcome = getOutcome();
  const disabled = resumeValue !== undefined || interrupt.expired === true || !isLastInConversation;

  return (
    <div data-test-subj="input-text-interrupt">
      <div>{interrupt.description}</div>
      <EuiSpacer size="s" />
      <EuiFieldText
        disabled={disabled}
        placeholder={interrupt.placeholder ?? 'Enter text to continue...'}
        value={input}
        onChange={(e) => onChange(e)}
      />
      <EuiSpacer size="s" />

      <EuiFlexGroup
        responsive={false}
        gutterSize="s"
        alignItems="center"
        justifyContent="flexStart"
      >
        <EuiButton color="success" size="s" onClick={onSubmit} disabled={disabled}>
          <FormattedMessage
            id="xpack.elasticAssistantPlugin.typed_interrupt.input_text.submit.label"
            defaultMessage="Submit"
          />
        </EuiButton>

        {outcome && <EuiBadge>{outcome}</EuiBadge>}
      </EuiFlexGroup>
    </div>
  );
};
