import { AIMessage, BaseMessage } from "@langchain/core/messages"
import { requireFirstInspectIndexMappingCallWithEmptyKey } from "./common";

const aiMessage1 = new AIMessage({
    content: "test",
    tool_calls: [
        {
            name: "inspect_index_mapping",
            args: {
                property: "",
            },
        },
    ],
});

const aiMessage2 = new AIMessage({
    content: "test",
    tool_calls: [
        {
            name: "inspect_index_mapping",
            args: {
                property: "",
            },
        },
        {
            name: "inspect_index_mapping",
            args: {
                property: "test",
            },
        },
    ],
});

const aiMessage3 = new AIMessage({
    content: "test",
    tool_calls: [
        {
            name: "inspect_index_mapping",
            args: {
                property: "test",
            },
        },
    ],
});

const aiMessage4 = new AIMessage({
    content: "test",
    tool_calls: [
        {
            name: "inspect_index_mapping",
            args: {
                property: "foo",
            },
        },
        {
            name: "inspect_index_mapping",
            args: {
                property: "test",
            },
        },
    ],
});



describe("common", () => {
    it.each(
        [
            [
                aiMessage3, [], aiMessage1
            ],
            [
                aiMessage2, [], aiMessage2
            ],
            [
                aiMessage4, [], aiMessage2
            ]
        ]
    )("requireFirstInspectIndexMappingCallWithEmptyKey", (newMessage: AIMessage, oldMessage: BaseMessage[], expected: AIMessage) => {

        const result = requireFirstInspectIndexMappingCallWithEmptyKey(newMessage, oldMessage);

        expect(result).toEqual(expected);
    })
})