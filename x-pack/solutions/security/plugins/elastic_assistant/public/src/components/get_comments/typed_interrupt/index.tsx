import { RequestApprovalResumeSchema, RequestTextResumeSchema, TypedInterruptResumeValue, TypedInterruptValue } from "@kbn/elastic-assistant-common";
import { RequestApproval } from "./typed_interrupts/request_approval";
import React from 'react'
import { RequestText } from "./typed_interrupts/request_text";

interface Props<I extends TypedInterruptValue, R extends TypedInterruptResumeValue> {
    interrupt?: TypedInterruptValue
    resumeGraph: (threadId: string, resumeValue: TypedInterruptResumeValue) => void
    resumedValue?: TypedInterruptResumeValue
    isLastMessage: boolean
}

export const TypedInterruptFactory = ({ interrupt, resumeGraph, resumedValue, isLastMessage }: Props<TypedInterruptValue, TypedInterruptResumeValue>) => {
    if (!interrupt) {
        return;
    }

    switch (interrupt.type) {
        case "REQUEST_APPROVAL":
            return <RequestApproval interrupt={interrupt} resumeGraph={resumeGraph} resumedValue={resumedValue as RequestApprovalResumeSchema} isLastMessage={isLastMessage} />;
        case "REQUEST_TEXT":
            return <RequestText interrupt={interrupt} resumeGraph={resumeGraph} resumedValue={resumedValue as RequestTextResumeSchema} isLastMessage={isLastMessage} />;
        default:
            const neverValue: never = interrupt;
            throw new Error(`Unhandled typed interrupt type: ${JSON.stringify(neverValue)}`);
    }
};
