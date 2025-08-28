import React from 'react'

import { RequestApprovalResumeSchema, RequestApprovalTypedInterruptValue } from "@kbn/elastic-assistant-common"
import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiSpacer, EuiBadge } from '@elastic/eui'

type Props = {
    interrupt: RequestApprovalTypedInterruptValue
    resumeGraph: (threadId: string, resumeValue: RequestApprovalResumeSchema) => void
    resumedValue?: RequestApprovalResumeSchema
    isLastMessage: boolean
}

export const RequestApproval = ({ interrupt, resumeGraph, resumedValue: initialResumeValue, isLastMessage }: Props) => {
    const [resumeValue, setResumeValue] = React.useState<RequestApprovalResumeSchema | undefined>(initialResumeValue);

    const handleOnApprove = () => {
        const resumeValue = { approved: true };
        setResumeValue(resumeValue);
        resumeGraph(interrupt.threadId, resumeValue);
    }

    const handleOnReject = () => {
        const resumeValue = { approved: false };
        setResumeValue(resumeValue);
        resumeGraph(interrupt.threadId, resumeValue);
    }

    const disabled = resumeValue !== undefined || interrupt.expired === true || !isLastMessage;

    const getOutcome = () => {
        switch(true){
            case isLastMessage === false && resumeValue === undefined:
            case interrupt.expired:
                return 'Expired';
            case resumeValue === undefined:
                return undefined;
            case resumeValue?.approved:
                return 'Approved';
            case !resumeValue?.approved:
                return 'Rejected';
        }
    }
    const outcome = getOutcome()

    return <>
        <div>{interrupt.content}</div>
        <EuiSpacer size="s" />
        <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" justifyContent='flexStart'>
            <EuiFlexItem grow={false}>
                <EuiButton color="danger" size="s" onClick={handleOnReject} disabled={disabled}>Reject</EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
                <EuiButton color="success" size="s" onClick={handleOnApprove} disabled={disabled}>Approve</EuiButton>
            </EuiFlexItem>
            {outcome && <EuiBadge>{outcome}</EuiBadge>}
        </EuiFlexGroup>
    </>
}