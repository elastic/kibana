/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const CONSOLE_DEFAULT_CONTENT = `# Welcome to the Dev Tools Console!
#
# You can use Console to explore the Elasticsearch vector search APIs. See the reference to learn more:
# https://www.elastic.co/docs/solutions/search/vector
#
# Here are a few examples to get you started.


# Create an index that generates embeddings for you
PUT /my_vectors
{
  "mappings": {
    "properties": {
      "content": { "type": "text", "copy_to": "semantic_content" },
      "semantic_content": { "type": "semantic_text" }
    }
  }
}


# Add documents to my_vectors
POST /my_vectors/_bulk
{ "index": {} }
{ "content": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." }
{ "index": {} }
{ "content": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." }
{ "index": {} }
{ "content": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." }


# Run a semantic search using natural language
POST /my_vectors/_search
{
  "query": {
    "match": { "semantic_content": "What is a good national park for backpacking?" }
  }
}


# Combine semantic and lexical matches in a hybrid search
POST /my_vectors/_search
{
  "retriever": {
    "linear": {
      "query": "What is a good national park for backpacking?",
      "fields": ["content", "semantic_content"],
      "normalizer": "minmax"
    }
  }
}`;
