import { OpenApiTool } from "@kbn/security-solution-plugin/server/utils/open_api_tool/open_api_tool";
import fs from 'node:fs';
import { StructuredToolInterface, tool } from "@langchain/core/tools";
import { Operation } from "../../../utils/open_api_tool/utils";
import { pickBy } from 'lodash';
import { parse as parseTemplate } from 'uri-template';
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import path from 'path';
import { KibanaClientToolParams } from "./kibana_client_tool";
import Oas from "oas";
import { parse } from 'yaml';
import { BuildFlavor } from "@kbn/config";

// TODO: Handle serverless case
export const kibanaServerlessOpenApiSpec = path.join(__dirname, '../../../../../../../../../oas_docs/output/kibana.serverless.yaml');
export const kibanaOpenApiSpec = path.join(__dirname, '../../../../../../../../../oas_docs/output/kibana.yaml');

const defaultOptions: Options = {
    apiSpecPath: kibanaOpenApiSpec
}

type Options = {
    apiSpecPath: string;
}

type RuntimeOptions = {
    assistantToolParams: KibanaClientToolParams
}
export class KibanaClientTool extends OpenApiTool<RuntimeOptions> {
    private copiedHeaderNames = [
        'accept-encoding',
        'accept-language',
        'accept',
        'content-type',
        'cookie',
        'kbn-build-number',
        'kbn-version',
        'origin',
        'referer',
        'user-agent',
        'x-elastic-internal-origin',
        'x-elastic-product-origin',
        'x-kbn-context',
    ];
    protected options: Options;

    protected constructor({
        options = defaultOptions,
        dereferencedOas
    }: {
        options: Options;
        dereferencedOas: Oas;
    }) {

        super({
            dereferencedOas: dereferencedOas
        });

        this.options = options;
    }

    static getKibanaOpenApiSpec(buildFlavor: BuildFlavor) {
        if (buildFlavor === 'serverless') {
            return kibanaServerlessOpenApiSpec;
        }
        if (buildFlavor === 'traditional') {
            return kibanaOpenApiSpec;
        }
        return undefined
    }

    static async create(args?: {
        options?: Options;
    }) {
        const options = {
            ...defaultOptions,
            ...args?.options ?? {}
        }
        const yamlOpenApiSpec = await fs.promises.readFile(options.apiSpecPath, 'utf8');
        const jsonOpenApiSpec = await parse(yamlOpenApiSpec);
        const fixedJsonOpenApiSpec = super.fixOpenApiSpecIteratively(jsonOpenApiSpec);
        const dereferencedOas = new Oas(fixedJsonOpenApiSpec);
        await dereferencedOas.dereference();
        return new KibanaClientTool({
            options: options,
            dereferencedOas
        });
    }

    protected async getToolForOperation({ operation, assistantToolParams }: RuntimeOptions & { operation: Operation }) {
        return tool(async (input) => {

            const { request, assistantContext } = assistantToolParams
            const { origin } = request.rewrittenUrl || request.url;

            const serializedQuery = Object.entries(input.query ?? {}).map(([key, value]) => {
                const shouldStringify =
                    typeof value === "object" && value !== null;
                return [key, shouldStringify ? JSON.stringify(value) : value] as [string, string];
            });

            const params = new URLSearchParams(serializedQuery);
            const pathname = parseTemplate(operation.path).expand(input.path)
            const pathnameWithBasePath = path.posix.join(assistantContext.getServerBasePath(), pathname);

            const url = new URL(pathnameWithBasePath, origin);
            url.search = params.toString()

            const headers = pickBy(request.headers, (value, key) => {
                return (
                    this.copiedHeaderNames.includes(key.toLowerCase()) || key.toLowerCase().startsWith('sec-')
                );
            });

            const requestOptions = {
                method: operation.method.toUpperCase(),
                headers: { ...input.header, ...headers },
                body: JSON.stringify(input.body)
            }

            return fetch(url.toString(), requestOptions).then((res) => res.text())
        }, {
            name: operation.getOperationId(),
            description: [operation.getDescription(), ...operation.getTags().map(tag => tag.description).filter(tag => !!tag)].join('\n'),
            tags: operation.getTags().map(tag => tag.name),
            schema: this.getParametersAsZodSchema({
                operation
            }),
        })
    }

    protected async getInternalNode(args: RuntimeOptions & {
        tools: Promise<StructuredToolInterface[]>
        name: string
        description: string
    }): Promise<StructuredToolInterface> {
        const { tools, name, description, assistantToolParams } = args;
        const agent = createReactAgent({
            llm: assistantToolParams.createLlmInstance(),
            tools: await tools,
        })
        return tool(async ({ input }) => {
            const inputs = {
                messages: [new SystemMessage({ content: "You are Kibana Client agent. You are an expert in using functions. Try to use the functions at your disposal to perform the task requested. In your final response include as much information as possible about the tool results." }),
                new HumanMessage({ content: input })],
            };
            const result = await agent.invoke(inputs)
            const lastMessage = result.messages[result.messages.length - 1];
            return lastMessage.content;
        }, {
            name: name,
            description: description,
            schema: z.object({
                input: z.string().describe('The action that should be performed relevant parameters. Include as much detail as possible.'),
            })
        })
    }
}