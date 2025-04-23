import { KibanaClientTool, kibanaOpenApiSpec, kibanaServerlessOpenApiSpec } from "./kibana_client_open_api";
import { KibanaClientToolParams } from "./kibana_client_tool";

const assistantToolParams = {
    createLlmInstance: jest.fn().mockReturnValue({ bindTools: jest.fn().mockReturnValue({}) }),
    esClient: {} as any,
    request: {} as any,
    logger: {} as any,
    connectorId: 'fake-connector',
} as unknown as KibanaClientToolParams

describe("kibana_client_open_api", () => {
    it("Can initialize KibanaClientTool", async () => {

        const kibanaClientTool = await KibanaClientTool.create({
            options: {
                "apiSpecPath": kibanaOpenApiSpec,
            }
        })

        await expect(kibanaClientTool.getTool({ assistantToolParams })).resolves.toBeDefined();
    });

    it("Can initialize KibanaClientTool serverless", async () => {

        const kibanaClientTool = await KibanaClientTool.create({
            options: {
                "apiSpecPath": kibanaServerlessOpenApiSpec,
            }
        })

        await expect(kibanaClientTool.getTool({
            assistantToolParams
        })).resolves.toBeDefined();
    });

    it("Can not initialize KibanaClientTool if yaml file does not exist", async () => {
        const promise = new Promise(async (resolve, reject) => {
            try {
                const kibanaClientTool = await KibanaClientTool.create({
                    options: {
                        "apiSpecPath": "fake-path",
                    }
                })

                await kibanaClientTool.getTool({
                    assistantToolParams
                })
                resolve(kibanaClientTool);
            }
            catch (error) {
                reject(error);
            }
        })

        await expect(promise).rejects.toThrow();
    });
})