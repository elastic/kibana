import { ElasticsearchClient } from "@kbn/core/server";
import { PrepareIndicesForEvaluations } from "../../prepare_indices_for_evalutations";
import { indicesCreateRequests } from "./indices_create_requests";
import { Logger } from "@kbn/logging";


export class PrepareIndicesForAssistantGraphEvalusations extends PrepareIndicesForEvaluations {
    constructor({
        esClient,
        logger
    }: {
        esClient: ElasticsearchClient;
        logger: Logger
    }) {
        super({
            esClient,
            indicesCreateRequests: Object.values(indicesCreateRequests),
            logger
        })
    }
}
