import { DynamicStructuredTool } from "@langchain/core/tools";
import { SECURITY_LABS_KNOWLEDGE_BASE_TOOL } from "./security_labs_tool";
import { ContentReferencesStore, contentReferencesStoreFactoryMock, KnowledgeBaseEntryContentReference } from "@kbn/elastic-assistant-common";
import { AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";

describe('SecurityLabsTool', () => {

    const contentReferencesStore = contentReferencesStoreFactoryMock();
    const getKnowledgeBaseDocumentEntries = jest.fn().mockResolvedValue([])
    const kbDataClient = { getKnowledgeBaseDocumentEntries }
    const defaultArgs = {
        isEnabledKnowledgeBase: true,
        contentReferencesStore,
        kbDataClient
    } as unknown as AssistantToolParams;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('DynamicStructuredTool', () => {

        it('includes citations', async () => {
            const tool = SECURITY_LABS_KNOWLEDGE_BASE_TOOL.getTool(defaultArgs) as DynamicStructuredTool;

            (contentReferencesStore.add as jest.Mock).mockImplementation((creator: Parameters<ContentReferencesStore['add']>[0]) => {
                const reference = creator({ id: "exampleContentReferenceId" })
                expect(reference.type).toEqual("KnowledgeBaseEntry")
                expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryId).toEqual("securityLabsId")
                expect((reference as KnowledgeBaseEntryContentReference).knowledgeBaseEntryName).toEqual("Elastic Security Labs content")
                return reference
            })

            const result = await tool.func({ query: 'What is Kibana Security?', product: 'kibana' });

            expect(result).toContain("Citation: {reference(exampleContentReferenceId)}")
        });
    });
})