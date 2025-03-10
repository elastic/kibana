/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AggregationsStringTermsAggregate } from "@elastic/elasticsearch/lib/api/types";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { InternalIntegrationServices } from "@kbn/wci-common";

interface SearchResult {
}

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
  let fieldValues = fields.filterFields.map(field => ({ field: field.field, values: [] as string[], description: field.description, type: field.type, aggs: field.aggs }));

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
                size: 20 // Limit to top 100 values
              }
            }
          ])
        )
      });

      fieldValues = fieldValues.map(fieldValue => {
        const buckets = (aggResult.aggregations?.[fieldValue.field] as AggregationsStringTermsAggregate)?.buckets;
        if (buckets) {
          return {
            ...fieldValue,
            // @ts-ignore
            values: buckets.map(bucket => bucket.key as string) as unknown as string[],

          };
        }
        return fieldValue;
      });

    } catch (error) {
      services.logger.error(`Failed to get aggregations: ${error}`);
    }
  }

  const filterSchema = fieldValues.reduce((acc, field) => {
    if (field.type === "keyword" && field.aggs && field.values.length > 0) {
      return {
        ...acc,
        [field.field]: z.string().describe(field.description + " (one of " + field.values.join(", ") + ")")
      }
    } else if (field.type === "keyword" && !field.aggs) {
      return {
        ...acc,
        [field.field]: z.string().describe(field.description)
      }
    } else if (field.type === "date" && field.values.length > 0) {
      return {
        ...acc,
        [field.field]: z.date().describe(field.description)
      }
    }
    return {
      ...acc
    }
  }, {
    query: z.string().describe("The query to search for")
  })

  server.tool("search", configuration.description, filterSchema, async ({ query, ...filters }) => {
    const { index, } = configuration;

    services.logger.info(`Searching for "${query}" in index "${index}"`);

    let result = null

    const esFilters = Object.entries(filters).map(([field, value]) => {
      const fieldConfig = fields.filterFields.find(f => f.field === field);
      if (fieldConfig?.type === "keyword") {
        return {
          "term": { [field]: value }
        }
      } 
    })

    try {
      result = await services.elasticsearchClient.search<SearchResult>({
        index: index,
        body: {
          query: {
            "bool": {
              "must": [
                JSON.parse(configuration.queryTemplate.replace("{query}", query))
              ],
              "filter": esFilters
            }
          },
          "_source": {
            "includes": fields.contextFields.map(field => field.field)
          },
          "highlight": {
            "fields": fields.contextFields.reduce((acc: Record<string, any>, field) => {
              if (field.type === "semantic") {
                acc[field.field] = {
                  "type": "semantic"
                }
              }
              return acc;
            }, {})
          },
        }
      });
    } catch (error) {
      services.logger.error(`Failed to search: ${error}`);
      return {
        content: []
      }
    };

    services.logger.info(`Found ${result.hits.hits.length} hits`);

    const contentFragments = result.hits.hits.map((hit) => {
      const highlightField = Object.keys(hit.highlight || {})[0];
      return {
        type: "text" as const,
        text: configuration.fields.contextFields.map((field) => {
          if (field.type === "semantic") {
            return `${field.field}: ${hit.highlight?.[highlightField]?.flat().join("\n") || ""}`
          } else {
            // @ts-ignore
            return `${field.field}: ${hit._source?.[field.field] || ""}`
          }
        }).join("\n")
      }
    });

    return {
      content: contentFragments
    }
  });

  return server;
} 