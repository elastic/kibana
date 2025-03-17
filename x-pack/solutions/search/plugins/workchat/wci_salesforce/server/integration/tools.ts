import { Client } from 'elasticsearch-8.x';
import { ESDocumentSource, QueryResult } from "../constants";
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function caseRetrieval(
    logger: Logger,
    esClient: Client,
    indexName: string,
    id?: string,
    size?: number,
    owner?: string,
    status?: string,
    priority?: string,
    closed? : boolean,
    case_number?: string,
    created_after?: string,
    created_before?: string,
    semanticQuery?: string,
  ): Promise<QueryResult[]> {
    
    if (size === undefined) {
        size = 10;
      }
      
      const must_clauses: any[] = [];
      if (id) {
        must_clauses.push({ term: { "id": id } });
      }
      
      if (owner) {
        must_clauses.push({ term: { "owner": owner } });
      }

      if (status) {
        must_clauses.push({ term: { "status": status } });
      }
      
      if (priority) {
        must_clauses.push({ term: { "metadata.priority": priority } });
      }
  
      if (closed) {
        must_clauses.push({ term: { "metadata.closed": closed } });
      }
  
      if (case_number) {
        must_clauses.push({ term: { "metadata.case_number": case_number } });
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
    
      let queryBody: any = {
        bool: {
          must: [
            {
              term: {
                object_type: 'support_case',
              },
            },
          ],
        },
      };
  
      if (must_clauses.length > 0) {
        queryBody.bool.must.push(...must_clauses); 
      }

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
        logger.info(`Querying Elasticsearch with: ${JSON.stringify(queryBody)}`);
        const response = await esClient.search({
          index: indexName,
          query: queryBody,
          size: size
        });

        const results: QueryResult[] = [];

        if (response.hits && response.hits.hits) {
            for (const hit of response.hits?.hits) {
                const source = hit._source as ESDocumentSource
                const markdownText = `
                    Support Case: #${source.metadata.case_number}
                    - **Title:** ${source.title}
                    - **Priority:** ${source.metadata.priority}
                    - **Owner:** ${source.owner}
                    - **Status:** ${source.metadata.status}
                    - **Created:** ${source.created_at}
                    - **URL:** ${source.url}
                    `;
            
                const result: QueryResult = {
                    type: 'text',
                    text: markdownText
                }

                results.push(result)
            }
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
