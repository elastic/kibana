import { ElasticsearchClient, KibanaRequest, Logger } from '@kbn/core/server';
import { EditorError, parse } from '@kbn/esql-ast';
import { InferenceServerStart, naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { lastValueFrom } from 'rxjs';
import { getEsqlFromContent } from './common';
import { isEmpty, pick } from 'lodash';
import { z, ZodSchema } from 'zod';
import { JsonSchema7Type, zodToJsonSchema } from 'zod-to-json-schema';
import { OpenAPIV3 } from 'openapi-types';
import { ToolSchema } from '@kbn/inference-common';
import { keyword } from '@kbn/fleet-plugin/server/services/epm/elasticsearch/template/mappings';

interface NlToEsqlCommand {
    query: string;
}

interface NlToEsqlCommandWithError extends NlToEsqlCommand {
    parsingErrors?: EditorError[];
    executeError?: unknown;
}

export class NaturalLanguageToEsqlValidator {
    private readonly inference: InferenceServerStart
    private readonly connectorId: string
    private readonly logger: Logger
    private readonly request: KibanaRequest
    private readonly esClient: ElasticsearchClient

    constructor(
        params: {
            inference: InferenceServerStart,
            connectorId: string,
            logger: Logger
            request: KibanaRequest
            esClient: ElasticsearchClient
        }
    ) {
        this.inference = params.inference;
        this.connectorId = params.connectorId;
        this.logger = params.logger;
        this.request = params.request;
        this.esClient = params.esClient;
    }

    private async callNaturalLanguageToEsql(question: string) {
        return lastValueFrom(
            naturalLanguageToEsql({
                client: this.inference.getClient({ request: this.request }),
                connectorId: this.connectorId,
                input: question,
                functionCalling: 'auto',
                logger: this.logger,
                tools:{
                    "get_available_indecies": {
                        "description": "Get the available indecies in the elastic search cluster. Use this when there is an unknown index error.",
                        "schema": zodSchemaToInference(z.object({
                            keyword: z.string()
                        }))
                    }
                }
            })
        );
    }

    private esqlParsingErrors(esqlQuery: string): NlToEsqlCommand | undefined {
        const { errors: parsingErrors, root } = parse(esqlQuery)

        console.log(root)

        if (!isEmpty(parsingErrors)) {
            return {
                query: esqlQuery,
                parsingErrors
            } as NlToEsqlCommandWithError
        }
        return
    }

    private async testRunQuery(esqlQuery: string) {
        try {
            await this.esClient.esql.query(
                {
                    query: esqlQuery,
                    format: 'json',
                },
            )
        } catch (e) {
            return {
                query: esqlQuery,
                executeError: e
            } as NlToEsqlCommandWithError
        }
        return
    }

    private async getAvailableIndeciesPrompt() {
        return this.esClient.cat.indices({
            format:'json'
        }).then((response) => {
            return `The available indecies are\n${response.map((index: any) => index.index).join('\n')}`
        })
    }

    private async recursivlyGenerateAndValidateEsql(question: string, depth = 0): Promise<(string | undefined)[]> {
        if (depth > 3) {
            return [question];
        }
        const generateEvent = await this.callNaturalLanguageToEsql(question);
        console.log("generateEvent")
        console.log(JSON.stringify(generateEvent))
        if(!generateEvent.content){
            return [`Unable to generate query.\n${question}`];
        }
        const queries = getEsqlFromContent(generateEvent.content);
        if(isEmpty(queries)){
            return [generateEvent.content];
        }

        const results = await Promise.all(
            queries.map(async (query) => {
                if (isEmpty(query)) return undefined;

                let errors = this.esqlParsingErrors(query);

                if (this.isNlToEsqlCommandWithError(errors)) {
                    return this.recursivlyGenerateAndValidateEsql(await this.formatEsqlQueryErrorForPrompt(errors), depth + 1);
                }

                errors = await this.testRunQuery(query);

                if (this.isNlToEsqlCommandWithError(errors)) {
                    return this.recursivlyGenerateAndValidateEsql(await this.formatEsqlQueryErrorForPrompt(errors), depth + 1);
                }

                return query;
            })
        )

        return results.flat().filter((result) => result !== undefined);
    }

    public async generateEsqlFromNaturalLanguage(question: string) {
        return this.recursivlyGenerateAndValidateEsql(question)
    }

    private isNlToEsqlCommandWithError(command: undefined | NlToEsqlCommand | NlToEsqlCommandWithError): command is NlToEsqlCommandWithError {
        return (command as undefined | NlToEsqlCommandWithError)?.parsingErrors !== undefined || (command as undefined | NlToEsqlCommandWithError)?.executeError !== undefined;
    }

    private async formatEsqlQueryErrorForPrompt(error: NlToEsqlCommand): Promise<string> {
        if (!this.isNlToEsqlCommandWithError(error)) {
            throw new Error('Error is not an NlToEsqlCommandWithError');
        }

        let errorString = `The query bellow could not be executed due to the following errors. Try again or reply with debugging instructions\n\`\`\`esql${error.query}\`\`\`\n`;
        if (error.parsingErrors) {
            errorString += 'Parsing Errors:\n';
            error.parsingErrors.forEach((parsingError) => {
                errorString += `${parsingError.message}\n`;
            });
        }

        if (error.executeError) {
            errorString += `Execution Errors:\n${(error.executeError as any).message}\n`;
        }

        if(false && errorString.includes('Unknown index')) {
            errorString += await this.getAvailableIndeciesPrompt();
        }

        console.log(errorString);
        this.logger.error(errorString);
        
        return errorString;
    }


}

function zodSchemaToInference(schema: ZodSchema): ToolSchema {
  return pick(zodToJsonSchema(schema), ['type', 'properties', 'required']) as ToolSchema;
}
