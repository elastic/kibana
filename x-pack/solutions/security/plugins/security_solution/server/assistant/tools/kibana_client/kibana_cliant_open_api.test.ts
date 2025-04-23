import { KibanaClientTool, kibanaOpenApiSpec, kibanaServerlessOpenApiSpec } from "./kibana_client_open_api";
import { KibanaClientToolParams } from "./kibana_client_tool";

describe("kibana_client_open_api", () => {
    it("Can initialize KibanaClientTool", async () => {

        const kibanaClientTool = new KibanaClientTool({
            assistantToolParams: {
                createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
                esClient: {} as any,
                request: {} as any,
                logger: {} as any,
                connectorId: 'fake-connector',
            } as unknown as KibanaClientToolParams,
            opts: {
                "apiSpecPath": kibanaOpenApiSpec,
            }
        })

        await expect(kibanaClientTool.getTool()).resolves.toBeDefined();
    });

    it("Can initialize KibanaClientTool serverless", async () => {

        const kibanaClientTool = new KibanaClientTool({
            assistantToolParams: {
                createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
                esClient: {} as any,
                request: {} as any,
                logger: {} as any,
                connectorId: 'fake-connector',
            } as unknown as KibanaClientToolParams,
            opts: {
                "apiSpecPath": kibanaServerlessOpenApiSpec,
            }
        })

        await expect(kibanaClientTool.getTool()).resolves.toBeDefined();
    });

    it("Can not initialize KibanaClientTool if yaml file does not exist", async () => {
        const promise = new Promise(async (resolve, reject) => {
            try {
                const kibanaClientTool = new KibanaClientTool({
                    assistantToolParams: {
                        createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
                        esClient: {} as any,
                        request: {} as any,
                        logger: {} as any,
                        connectorId: 'fake-connector',
                    } as unknown as KibanaClientToolParams,
                    opts: {
                        "apiSpecPath": "fake-path",
                    }
                })

                await kibanaClientTool.getTool()
                resolve(kibanaClientTool);
            }
            catch (error) {
                reject(error);
            }
        })

        await expect(promise).rejects.toThrow();
    });
})