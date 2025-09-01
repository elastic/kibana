import React from 'react'

import { SelectOptionInterruptValue, SelectOptionInterruptResumeValue } from "@kbn/elastic-assistant-common"
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiBadge } from '@elastic/eui'

type Props = {
    interrupt: SelectOptionInterruptValue
    resumeGraph: (threadId: string, resumeValue: SelectOptionInterruptResumeValue) => void
    resumedValue?: SelectOptionInterruptResumeValue
    isLastMessage: boolean
}

export const SelectOption = ({ interrupt, resumeGraph, resumedValue: initialResumeValue, isLastMessage }: Props) => {
    const [resumeValue, setResumeValue] = React.useState<SelectOptionInterruptResumeValue | undefined>(initialResumeValue);

    const handleOnSelect = (value: SelectOptionInterruptValue['options'][number]['value']) => {
        const resumeValue: SelectOptionInterruptResumeValue = { type: "SELECT_OPTION", value };
        setResumeValue(resumeValue);
        resumeGraph(interrupt.threadId, resumeValue);
    }

    const disabled = resumeValue !== undefined || interrupt.expired === true || !isLastMessage;

    const getOutcome = () => {
        switch (true) {
            case isLastMessage === false && resumeValue === undefined:
            case interrupt.expired:
                return 'Expired';
            case resumeValue === undefined:
                return undefined;
            case resumeValue !== undefined:
                return interrupt.options?.find(option => option.value === resumeValue.value)?.label ?? "Actioned";
        }
    }
    const outcome = getOutcome()

    return <>
        <div>{interrupt.description}</div>
        <EuiSpacer size="s" />
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" justifyContent='flexStart'>
            {interrupt.options?.map(option => {
                return <EuiFlexItem grow={false}>
                    <EuiButton color={option.buttonColor} size="s" onClick={()=>handleOnSelect(option.value)} disabled={disabled}>{option.label}</EuiButton>
                </EuiFlexItem>
            })}
            {outcome && <EuiBadge>{outcome}</EuiBadge>}
        </EuiFlexGroup>
    </>
}