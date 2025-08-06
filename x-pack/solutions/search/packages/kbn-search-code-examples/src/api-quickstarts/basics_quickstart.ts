/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Provide code example built from documentation at https://www.elastic.co/docs/solutions/search/elasticsearch-basics-quickstart

import { BasicsCodeSnippetParameters, QuickstartCodeSnippetFunction } from './types';

interface BasicsQuickstartStep {
  title: string;
  content: string;
}

const DEFAULT_INDEX_NAME = 'books';

// Returns an array of quickstart steps, in order with a title and content
// Step number is not included as it may vary depending on whether an index
// will be created or not. {indexName} is replaced with the provided
// index name or 'books' if not provided.
const quickstartSteps: BasicsQuickstartStep[] = [
  {
    title: 'Create an index to store documents',
    content: `PUT /{indexName}`,
  },
  {
    title: 'Welcome to your index!',
    content: `GET /{indexName}`,
  },
  {
    title: 'Add a single document to the index',
    content: `POST /{indexName}/_doc
    {
        "name": "Snow Crash",
        "author": "Neal Stephenson",
        "release_date": "1992-06-01",
        "page_count": 470
    }`,
  },
  {
    title: 'Add multiple documents using the bulk API for efficient indexing',
    content: `POST /_bulk
    { "index" : { "_index" : "{indexName}" } }
    {"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
    { "index" : { "_index" : "{indexName}" } }
    {"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
    { "index" : { "_index" : "{indexName}" } }
    {"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
    { "index" : { "_index" : "{indexName}" } }
    {"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
    { "index" : { "_index" : "{indexName}" } }
    {"name": "The Handmaids Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}`,
  },
  {
    title: 'Add a document with a new field to demonstrate dynamic mapping',
    content: `POST /{indexName}/_doc
    {
        "name": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "release_date": "1925-04-10",
        "page_count": 180,
        "language": "EN"
    }`,
  },
  {
    title: 'View the mapping to see how Elasticsearch mapped the fields',
    content: `GET /{indexName}/_mapping`,
  },
  {
    title: 'Create an index with explicit mappings for better control',
    content: `PUT /my-explicit-mappings-{indexName}
    {
        "mappings": {
            "dynamic": false,
            "properties": {
                "name": {
                    "type": "text"
                },
                "author": {
                    "type": "text"
                },
                "release_date": {
                    "type": "date"
                },
                "page_count": {
                    "type": "integer"
                }
            } 
        }
    }`,
  },
  {
    title: 'Search all documents in the index',
    content: `GET /{indexName}/_search`,
  },
  {
    title: 'Perform a match query to search for specific text',
    content: `GET /{indexName}/_search
    {
        "query": {
            "match": {
            "name": "brave"
            }
        }
    }`,
  },
  {
    title: 'Clean up by deleting the indices (optional)',
    content: `DELETE /{indexName}
        DELETE /my-explicit-mappings-{indexName}`,
  },
];

/**
 * Returns a quickstart script for Elasticsearch basics, formatted for use in the Dev Console.
 * @param indexName - Optional. The name of the index to use in the quickstart. If not provided, defaults to 'books'.
 * If provided, this will be used in the script to reference the index.
 * @returns a string containing the quickstart script, with steps numbered and formatted
 * for use in the Dev Console.
 */
export const basicsQuickstartCommands: QuickstartCodeSnippetFunction<
  BasicsCodeSnippetParameters
> = (params) => {
  let steps = quickstartSteps;
  // Skip index creation step if an index name is provided
  if (!params.createIndex) {
    steps = steps.slice(1);
  }
  return steps
    .map(
      (step, index) => `# Step ${index + 1}: ${step.title}
${step.content.trim().replace(/{indexName}/g, params?.indexName || DEFAULT_INDEX_NAME)}`
    )
    .join('\n\n');
};
