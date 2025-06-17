import { DETECTION_RULES_CREATE_FORM_CONVERSATION_ID } from "../../detection_engine/rule_creation_ui/components/ai_assistant/translations"
import { sendToTimelineEligibleQueryTypes } from "../helpers"
import { SendToTimelineButton } from "../send_to_timeline"
import React from 'react'
import { UpdateQueryInFormButton } from "../update_query_in_form"
import { EuiIcon } from "@elastic/eui"
import { CodeBlockDetails, Conversation } from "@kbn/elastic-assistant"

type Props = {
    currentConversation: Conversation
    codeBlockDetails: CodeBlockDetails
}

export const AugmentMessageCodeBlockButton = ({
    currentConversation,
    codeBlockDetails,
}: Props) => {

    const sendToTimeline = sendToTimelineEligibleQueryTypes.includes(codeBlockDetails.type) && <SendToTimelineButton
        asEmptyButton={true}
        dataProviders={[
            {
                id: 'assistant-data-provider',
                name: `Assistant Query from conversation ${currentConversation.id}`,
                enabled: true,
                excluded: false,
                queryType: codeBlockDetails.type,
                kqlQuery: codeBlockDetails.content ?? '',
                queryMatch: {
                    field: 'host.name',
                    operator: ':',
                    value: 'test',
                },
                and: [],
            },
        ]}
        keepDataView={true}
    >
        <EuiIcon type="timeline" />
    </SendToTimelineButton>

    const updateQueryInForm = DETECTION_RULES_CREATE_FORM_CONVERSATION_ID === currentConversation.title && <UpdateQueryInFormButton query={codeBlockDetails.content ?? ''} />

    return (<>
        {sendToTimeline}
        {updateQueryInForm}
    </>)
}