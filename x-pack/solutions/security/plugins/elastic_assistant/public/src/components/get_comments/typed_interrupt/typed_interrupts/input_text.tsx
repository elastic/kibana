import React from 'react'

import { InputTextInterruptValue, InputTextInterruptResumeValue } from "@kbn/elastic-assistant-common"
import { EuiBadge, EuiButton, EuiFieldText, EuiFlexGroup, EuiSpacer } from '@elastic/eui'

type Props = {
    interruptValue: InputTextInterruptValue
    resumeGraph: (threadId: string, resumeValue: InputTextInterruptResumeValue) => void
    resumeValue?: InputTextInterruptResumeValue
    isLastMessage: boolean
}

export const InputText = ({ interruptValue: interrupt, resumeGraph, resumeValue: initialResumeValue, isLastMessage }: Props) => {
    const [input, setInput] = React.useState<string>(initialResumeValue?.value ?? '');
    const [resumeValue, setResumeValue] = React.useState<InputTextInterruptResumeValue | undefined>(initialResumeValue);

    const onSubmit = () => {
        const resumeValue: InputTextInterruptResumeValue = { type:"INPUT_TEXT", value: input };
        setResumeValue(resumeValue);
        resumeGraph(interrupt.threadId, resumeValue);
    }

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    };

    const getOutcome = () => {
        switch (true) {
            case isLastMessage === false && resumeValue === undefined:
            case interrupt.expired:
                return 'Expired';
            case resumeValue === undefined:
                return undefined;
            case resumeValue !== undefined:
                return resumeValue?.value ?? "Actioned";
        }
    }

    const outcome = getOutcome();
    const disabled = resumeValue !== undefined || interrupt.expired === true || !isLastMessage;

    return <>
        <div>{interrupt.description}</div>
        <EuiSpacer size="s" />
        <EuiFieldText
            disabled={disabled}
            placeholder={interrupt.placeholder ?? 'Enter text to continue...'}
            value={input}
            onChange={(e) => onChange(e)}
        />
        <EuiSpacer size="s" />

        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" justifyContent='flexStart'>
            <EuiButton color="success" size="s" onClick={onSubmit} disabled={disabled}>Submit</EuiButton>

            {outcome && <EuiBadge>{outcome}</EuiBadge>}
        </EuiFlexGroup>

    </>
}