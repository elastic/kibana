import React from 'react'

import { RequestTextResumeSchema, RequestTextTypedInterruptValue } from "@kbn/elastic-assistant-common"
import { EuiBadge, EuiButton, EuiFieldText, EuiFlexGroup, EuiSpacer } from '@elastic/eui'

type Props = {
    interrupt: RequestTextTypedInterruptValue
    resumeGraph: (threadId: string, resumeValue: RequestTextResumeSchema) => void
    resumedValue?: RequestTextResumeSchema
    isLastMessage: boolean
}

export const RequestText = ({ interrupt, resumeGraph, resumedValue, isLastMessage }: Props) => {
    const [value, setValue] = React.useState<string>(resumedValue?.content ?? '');

    const onSubmit = () => {
        const resumeValue = { content: value };
        resumeGraph(interrupt.threadId, resumeValue);
    }

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    const getOutcome = () => {
        switch (true) {
            case isLastMessage === false && resumedValue === undefined:
            case interrupt.expired:
                return 'Expired';
            case resumedValue === undefined:
                return undefined;
            case resumedValue?.content !== undefined:
                return resumedValue?.content;
        }
    }

    const outcome = getOutcome();
    const disabled = resumedValue !== undefined || interrupt.expired === true || !isLastMessage;

    return <>
        <div>{interrupt.content}</div>
        <EuiSpacer size="s" />
        <EuiFieldText
            disabled={disabled}
            placeholder="Enter text to continue..."
            value={value}
            onChange={(e) => onChange(e)}
        />
        <EuiSpacer size="s" />

        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" justifyContent='flexStart'>
            <EuiButton color="success" size="s" onClick={onSubmit} disabled={disabled}>Submit</EuiButton>

            {outcome && <EuiBadge>{outcome}</EuiBadge>}
        </EuiFlexGroup>

    </>
}