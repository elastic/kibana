/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnippetSet } from './languages';

export const HAVE_VECTORS_INGEST_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

client.indices.create(
    index="my_dense_vectors",
    mappings={
        "properties": {
            "vector": {"type": "dense_vector"},
            "text": {"type": "text"},
        }
    },
)

client.index(
    index="my_dense_vectors",
    document={
        "text": "Elasticsearch is a search engine.",
        "vector": [0.12, -0.04, 0.88, 0.21, 0.55],
    },
)`,
  javascript: `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://your-elasticsearch-url",
  auth: { apiKey: "YOUR_API_KEY" },
});

await client.indices.create({
  index: "my_dense_vectors",
  mappings: {
    properties: {
      vector: { type: "dense_vector" },
      text: { type: "text" },
    },
  },
});

await client.index({
  index: "my_dense_vectors",
  document: {
    text: "Elasticsearch is a search engine.",
    vector: [0.12, -0.04, 0.88, 0.21, 0.55],
  },
});`,
  java: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.json.jackson.JacksonJsonpMapper;
import co.elastic.clients.transport.rest_client.RestClientTransport;
import org.apache.http.HttpHost;
import org.elasticsearch.client.RestClient;

RestClient rest = RestClient.builder(HttpHost.create("https://your-elasticsearch-url"))
    .setDefaultHeaders(new Header[]{new BasicHeader("Authorization", "ApiKey YOUR_API_KEY")})
    .build();
ElasticsearchClient client = new ElasticsearchClient(
    new RestClientTransport(rest, new JacksonJsonpMapper())
);

client.indices().create(c -> c
    .index("my_dense_vectors")
    .mappings(m -> m
        .properties("vector", p -> p.denseVector(d -> d))
        .properties("text", p -> p.text(t -> t))
    )
);

Map<String, Object> doc = Map.of(
    "text", "Elasticsearch is a search engine.",
    "vector", List.of(0.12, -0.04, 0.88, 0.21, 0.55)
);
client.index(i -> i.index("my_dense_vectors").document(doc));`,
  go: `package main

import (
    "context"
    "strings"

    "github.com/elastic/go-elasticsearch/v9"
)

func main() {
    es, _ := elasticsearch.NewClient(elasticsearch.Config{
        Addresses: []string{"https://your-elasticsearch-url"},
        APIKey:    "YOUR_API_KEY",
    })

    es.Indices.Create("my_dense_vectors",
        es.Indices.Create.WithBody(strings.NewReader(\`{
            "mappings": {
                "properties": {
                    "vector": { "type": "dense_vector" },
                    "text":   { "type": "text" }
                }
            }
        }\`)),
    )

    es.Index("my_dense_vectors", strings.NewReader(\`{
        "text": "Elasticsearch is a search engine.",
        "vector": [0.12, -0.04, 0.88, 0.21, 0.55]
    }\`))
}`,
  rust: `use elasticsearch::{
    Elasticsearch, IndexParts, indices::IndicesCreateParts,
    auth::Credentials, http::transport::Transport,
};
use serde_json::json;

let creds = Credentials::ApiKey("YOUR_API_KEY".into(), String::new());
let transport = Transport::single_node("https://your-elasticsearch-url")?
    .with_auth(creds);
let client = Elasticsearch::new(transport);

client.indices()
    .create(IndicesCreateParts::Index("my_dense_vectors"))
    .body(json!({
        "mappings": {
            "properties": {
                "vector": { "type": "dense_vector" },
                "text":   { "type": "text" }
            }
        }
    }))
    .send().await?;

client.index(IndexParts::Index("my_dense_vectors"))
    .body(json!({
        "text": "Elasticsearch is a search engine.",
        "vector": [0.12, -0.04, 0.88, 0.21, 0.55]
    }))
    .send().await?;`,
  csharp: `using Elastic.Clients.Elasticsearch;
using Elastic.Transport;

var settings = new ElasticsearchClientSettings(new Uri("https://your-elasticsearch-url"))
    .Authentication(new ApiKey("YOUR_API_KEY"));
var client = new ElasticsearchClient(settings);

await client.Indices.CreateAsync("my_dense_vectors", c => c
    .Mappings(m => m
        .Properties(p => p
            .DenseVector("vector", v => v)
            .Text("text")
        )
    )
);

await client.IndexAsync(new {
    text = "Elasticsearch is a search engine.",
    vector = new[] { 0.12, -0.04, 0.88, 0.21, 0.55 }
}, i => i.Index("my_dense_vectors"));`,
};

export const HAVE_VECTORS_SEARCH_SNIPPETS: SnippetSet = {
  python: `result = client.search(
    index="my_dense_vectors",
    knn={
        "field": "vector",
        "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
    },
)
print(result["hits"]["hits"])`,
  javascript: `const result = await client.search({
  index: "my_dense_vectors",
  knn: {
    field: "vector",
    query_vector: [0.10, -0.02, 0.91, 0.18, 0.60],
  },
});
console.log(result.hits.hits);`,
  java: `SearchResponse<JsonData> result = client.search(s -> s
    .index("my_dense_vectors")
    .knn(k -> k
        .field("vector")
        .queryVector(List.of(0.10f, -0.02f, 0.91f, 0.18f, 0.60f))
    ),
    JsonData.class
);
result.hits().hits().forEach(h -> System.out.println(h.source()));`,
  go: `res, _ := es.Search(
    es.Search.WithIndex("my_dense_vectors"),
    es.Search.WithBody(strings.NewReader(\`{
        "knn": {
            "field": "vector",
            "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
        }
    }\`)),
)
defer res.Body.Close()`,
  rust: `use elasticsearch::SearchParts;

let response = client.search(SearchParts::Index(&["my_dense_vectors"]))
    .body(json!({
        "knn": {
            "field": "vector",
            "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
        }
    }))
    .send().await?;

let body = response.json::<serde_json::Value>().await?;
println!("{:#?}", body["hits"]["hits"]);`,
  csharp: `var response = await client.SearchAsync<object>(s => s
    .Indices("my_dense_vectors")
    .Knn(k => k
        .Field("vector")
        .QueryVector(new[] { 0.10f, -0.02f, 0.91f, 0.18f, 0.60f })
    )
);

foreach (var hit in response.Hits) Console.WriteLine(hit.Source);`,
};

export const HAVE_VECTORS_SEARCH_HYBRID_SNIPPETS: SnippetSet = {
  python: `result = client.search(
    index="my_dense_vectors",
    retriever={
        "rrf": {
            "retrievers": [
                {
                    "knn": {
                        "field": "vector",
                        "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
                    }
                },
                {
                    "standard": {
                        "query": {"match": {"text": "What is Elasticsearch?"}}
                    }
                },
            ]
        }
    },
)
print(result["hits"]["hits"])`,
  javascript: `const result = await client.search({
  index: "my_dense_vectors",
  retriever: {
    rrf: {
      retrievers: [
        {
          knn: {
            field: "vector",
            query_vector: [0.10, -0.02, 0.91, 0.18, 0.60],
          },
        },
        {
          standard: {
            query: { match: { text: "What is Elasticsearch?" } },
          },
        },
      ],
    },
  },
});
console.log(result.hits.hits);`,
  java: `SearchResponse<JsonData> result = client.search(s -> s
    .index("my_dense_vectors")
    .retriever(r -> r
        .rrf(rrf -> rrf
            .retrievers(k -> k
                .knn(knn -> knn
                    .field("vector")
                    .queryVector(List.of(0.10f, -0.02f, 0.91f, 0.18f, 0.60f))
                )
            )
            .retrievers(st -> st
                .standard(std -> std
                    .query(q -> q.match(m -> m.field("text").query("What is Elasticsearch?")))
                )
            )
        )
    ),
    JsonData.class
);
result.hits().hits().forEach(h -> System.out.println(h.source()));`,
  go: `res, _ := es.Search(
    es.Search.WithIndex("my_dense_vectors"),
    es.Search.WithBody(strings.NewReader(\`{
        "retriever": {
            "rrf": {
                "retrievers": [
                    {
                        "knn": {
                            "field": "vector",
                            "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
                        }
                    },
                    {
                        "standard": {
                            "query": { "match": { "text": "What is Elasticsearch?" } }
                        }
                    }
                ]
            }
        }
    }\`)),
)
defer res.Body.Close()`,
  rust: `use elasticsearch::SearchParts;

let response = client.search(SearchParts::Index(&["my_dense_vectors"]))
    .body(json!({
        "retriever": {
            "rrf": {
                "retrievers": [
                    {
                        "knn": {
                            "field": "vector",
                            "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
                        }
                    },
                    {
                        "standard": {
                            "query": { "match": { "text": "What is Elasticsearch?" } }
                        }
                    }
                ]
            }
        }
    }))
    .send().await?;

let body = response.json::<serde_json::Value>().await?;
println!("{:#?}", body["hits"]["hits"]);`,
  csharp: `var response = await client.SearchAsync<object>(s => s
    .Indices("my_dense_vectors")
    .Retriever(r => r
        .Rrf(rrf => rrf
            .Retrievers(
                rt => rt.Knn(k => k
                    .Field("vector")
                    .QueryVector(new[] { 0.10f, -0.02f, 0.91f, 0.18f, 0.60f })
                ),
                rt => rt.Standard(st => st
                    .Query(q => q.Match(m => m.Field("text").Query("What is Elasticsearch?")))
                )
            )
        )
    )
);

foreach (var hit in response.Hits) Console.WriteLine(hit.Source);`,
};
