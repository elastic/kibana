/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationsStringTermsAggregate } from "@elastic/elasticsearch/lib/api/types";
import { InternalIntegrationServices } from "@kbn/wci-common";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface SearchResult {
}

/**
 * 
 *  configuration: {
            index: "support-hub-questions",
            description: "Knowledge base articles",
            fields: {
                filterFields: [
                    { field: "status", type: "keyword", aggs: true, description: "Status of the article" },
                    { field: "tags", type: "keyword", aggs: true, description: "Tags of the article" },
                    { field: "created", type: "date", aggs: false, description: "Date the article was created" }
                ],
                contextFields: [
                    { field: "description", type: "keyword", description: "Description of the article" }
                ]
            },
            queryTemplate: '{"query":{"semantic":{"query":"{query}","field":"content"}}}'
        }
 * 
 */

interface CustomIndexConfiguration {
  index: string;
  description: string;
  fields: {
    filterFields: CustomIndexField[];
    contextFields: CustomIndexField[];
  };
  queryTemplate: string;
}

interface CustomIndexField {
  field: string;
  type: string;
  aggs: boolean;
  description: string;
}

export async function getMcpServer(configuration: CustomIndexConfiguration, services: InternalIntegrationServices): Promise<McpServer> {
  const server = new McpServer({
    name: "wci-custom-index",
    version: "1.0.0"
  });

  const { index, fields } = configuration;

  const aggFields = fields.filterFields.filter(field => field.aggs);
  let fieldValues = fields.filterFields.map(field => ({ field: field.field, values: [] }));

  if (aggFields.length > 0) {
    try {
      const aggResult = await services.elasticsearchClient.search({
        index,
        size: 0,
        aggs: Object.fromEntries(
          aggFields.map(field => [
            field.field,
            {
              terms: {
                field: field.field,
                size: 100 // Limit to top 100 values
              }
            }
          ])
        )
      });

      fieldValues = fieldValues.map(fieldValue => {
        const buckets = (aggResult.aggregations?.[fieldValue.field] as AggregationsStringTermsAggregate)?.buckets;
        if (buckets) {
          return {
            field: fieldValue.field,
            // @ts-ignore
            values: buckets.map(bucket => bucket.key as string)
          };
        }
        return fieldValue;
      });

    } catch (error) {
      services.logger.error(`Failed to get aggregations: ${error}`);
    }
  }

  server.tool("search", { query: z.string() }, async ({ query }) => {
    const { index,  } = configuration;
    
    services.logger.info(`Searching for "${query}" in index "${index}"`);

    const result = await services.elasticsearchClient.search<SearchResult>({
      index: index || "custom_index",
      query: JSON.parse(configuration.queryTemplate.replace("{query}", query)),
      "_source": {
        "includes": ""
      },
      "highlight": {
        "fields": {
          [highlightField || field || "content"]: {
            "type": "semantic"
          }
        }
      }
    });

    services.logger.info(`Found ${result.hits.hits.length} hits`);

    const contentFragments = result.hits.hits.map((hit) => {
      const highlightField = Object.keys(hit.highlight || {})[0];
      return {
        type: "text" as const,
        text: hit.highlight?.[highlightField]?.flat().join("\n") || ""
      }
    });

    return {
      content: contentFragments
    }
  });

  return server;
} 