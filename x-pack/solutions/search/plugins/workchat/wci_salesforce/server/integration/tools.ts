import { ESDocumentSource, QueryResult } from "../constants";
import type { ElasticsearchClient } from '@kbn/core/server';

export async function caseRetrieval(
    esClient: ElasticsearchClient,
    index_name: string,
  ): Promise<QueryResult[]> {

    let query_body = {
        bool: {
          must: [
            {
              match: {
                "object_type": "support_case"
              }
            },
            {
              match: {
                "metadata.deleted": false
              }
            }
          ]
        }
    };
    

      try {
        const response = await esClient.search({
          index: index_name,
          query: query_body,
        });

        const results: QueryResult[] = [];
        for (const hit of response.hits?.hits) {
            const source = hit._source as ESDocumentSource
            const body = {
                "CaseNumber" : source.metadata.case_number,
                "Priority" : source.metadata.priority,
                "Closed": source.metadata.closed,
                "Content": source.body 
            }
        
            const result: QueryResult = {
                type: 'text',
                text: JSON.stringify(body)
            }

            results.push(result)
        }
            return results
        } catch (error) {
            const results: QueryResult[] = [{
                type: 'text',
                text: `Search failed: ${error}`
            }];

            return results
        }
    
    }
