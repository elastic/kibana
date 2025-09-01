import { InterruptType, InterruptValue, InterruptResumeValue, SelectOptionInterruptResumeValue, InputTextInterruptResumeValue } from "@kbn/elastic-assistant-common";
import { SelectOption } from "./typed_interrupts/select_option";
import React from 'react'
import { InputText } from "./typed_interrupts/input_text";

interface Props<T extends InterruptType> {
    interruptValue?: {type: T} & InterruptValue
    resumeGraph: (threadId: string, resumeValue: {type: T} & InterruptResumeValue) => void
    interruptResumeValue?: {type: T} & InterruptResumeValue
    isLastMessage: boolean
}

export const InterruptFactory = ({ interruptValue: interrupt, resumeGraph, interruptResumeValue: resumedValue, isLastMessage }: Props<InterruptType>) => {
    if (!interrupt) {
        return;
    }

    switch (interrupt.type) {
        case "SELECT_OPTION":
            return <SelectOption interrupt={interrupt} resumeGraph={resumeGraph} resumedValue={resumedValue as SelectOptionInterruptResumeValue} isLastMessage={isLastMessage} />;
        case "INPUT_TEXT":
            return <InputText interruptValue={interrupt} resumeGraph={resumeGraph} resumeValue={resumedValue as InputTextInterruptResumeValue} isLastMessage={isLastMessage} />;
        default:
            const neverValue: never = interrupt;
            throw new Error(`Unhandled typed interrupt type: ${JSON.stringify(neverValue)}`);
    }
};
