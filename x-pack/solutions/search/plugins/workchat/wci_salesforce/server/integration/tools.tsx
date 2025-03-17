import type { ElasticsearchClient, Logger } from '@kbn/core/server';

export async function caseRetrieval(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexName: string,
  id?: string,
  size?: number,
  owner?: string,
  priority?: string,
  closed?: boolean,
  case_number?: string,
  created_after?: string,
  created_before?: string,
  semanticQuery?: string,
  status?: string
): Promise<any> {
  logger.info(`Retrieving cases from ${indexName}`);

  if (size === undefined) {
    size = 10;
  }

  const must_clauses: any[] = [];
  if (id) {
    must_clauses.push({ term: { id: id } });
  }

  if (owner) {
    must_clauses.push({ term: { owner: owner } });
  }

  if (priority) {
    must_clauses.push({ term: { 'metadata.priority': priority } });
  }

  if (status) {
    must_clauses.push({ term: { 'metadata.status': status } });
  }

  if (closed !== undefined) {
    must_clauses.push({ term: { 'metadata.closed': closed } });
  }

  if (case_number) {
    must_clauses.push({ term: { 'metadata.case_number': case_number } });
  }

  if (created_after || created_before) {
    const range_query: any = { range: { created_at: {} } };

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
        field: 'content_semantic',
        query: semanticQuery,
        boost: 2.0,
      },
    });
  }

  try {
    logger.info(`Querying Elasticsearch with: ${JSON.stringify(queryBody)}`);
    const response = await esClient.search({
      index: indexName,
      query: queryBody,
      size: size,
    });

    logger.info(`Retrieved ${response.hits.total.value} support cases`);

    const results = [];

    if (response.hits && response.hits.hits) {
      for (const hit of response.hits.hits) {
        const source = hit._source;

        // Format as markdown instead of JSON
        const markdownText = `
          Support Case: #${source.metadata.case_number}
          - **Priority:** ${source.metadata.priority}
          - **Status:** ${source.metadata.status}
          - **Owner:** ${source.owner}
          - **Created:** ${source.created_at}
          - **URL:** ${source.url}
        `;

        const result = {
          type: 'text',
          text: markdownText,
        };

        results.push(result);
      }
    }

    return results;
  } catch (error) {
    logger.error(`Search failed: ${error}`);

    const result = [
      {
        type: 'text',
        text: `## Error\nSearch failed: ${error}`,
      },
    ];

    return result;
  }
}
