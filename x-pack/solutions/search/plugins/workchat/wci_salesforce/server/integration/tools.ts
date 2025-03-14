import { ESDocumentSource, QueryResult } from "../constants";
import type { Logger } from '@kbn/core/server';
import { Client } from "elasticsearch-8.x";

export async function caseRetrieval(
    logger: Logger,
    indexName: string,
    id?: string,
    size?: number,
    owner?: string,
    priority?: string,
    closed? : boolean,
    case_number?: string,
    created_after?: string,
    created_before?: string,
    semanticQuery?: string,
  ): Promise<QueryResult[]> {

    logger.info(`Retrieving cases from ${indexName}`)
    
    if (size === undefined) {
        size = 10;
      }
      
      const must_clauses: any[] = [];
      if (id) {
        must_clauses.push({ match: { "id": id } });
      }
      
      if (owner) {
        must_clauses.push({ match: { "owner": owner } });
      }
      
      if (priority) {
        must_clauses.push({ match: { "metadata.priority": priority } });
      }
  
      if (closed) {
        must_clauses.push({ match: { "metadata.closed": closed } });
      }
  
      if (case_number) {
        must_clauses.push({ match: { "metadata.case_number": case_number } });
      }
      
      if (created_after || created_before) {
        const range_query: any = { range: { "created_at": {} } };
        
        if (created_after) {
          range_query.range.created_at.gte = created_after;
        }
        
        if (created_before) {
          range_query.range.created_at.lte = created_before;
        }
        
        must_clauses.push(range_query);
      }
    
      let queryBody = {
        
          bool: {
            must: [
              {
                match: {
                  "object_type": "SupportCase"
                }
              }
            ]
          }
        
      };
  
      if (must_clauses.length > 0) {
        queryBody.bool.must.push(...must_clauses); 
      }

        const ES_URL = ''; 
        const API_KEY = '';
        
        const esClient = new Client({
        node: ES_URL,
        auth: {
            apiKey: API_KEY,
        },
        });

        if (semanticQuery) {
        queryBody.bool.must.push({
            semantic: {
            field: "content_semantic",
            query: semanticQuery,
            boost: 2.0
            }
        } as any);
        }

      try {
        const response = await esClient.search({
          index: indexName,
          query: queryBody
        });

        const results: QueryResult[] = [];
        for (const hit of response.hits?.hits) {
            const source = hit._source as ESDocumentSource
            const body = {
                "Title" : source.title,
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
            const result: QueryResult[] = [{
                type: 'text',
                text: `Search failed: ${error}`
            }];

            return result
        }
}
