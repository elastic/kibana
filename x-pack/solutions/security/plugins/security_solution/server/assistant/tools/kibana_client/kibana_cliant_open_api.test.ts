import { AssistantToolParams } from "@kbn/elastic-assistant-plugin/server";
import { KibanaClientTool } from "./kibana_client_open_api";

describe("", ()=>{
    it("should be true", async () => {

        const kibanaClientTool = new KibanaClientTool({
            assistantToolParams: {
                createLlmInstance: jest.fn(),
                esClient: {} as any,
                request: {} as any,
                logger: {} as any,
                connectorId: 'fake-connector',
            } as unknown as AssistantToolParams,
        })

        await kibanaClientTool.getTool();
        expect(true).toBe(true);
    });
})