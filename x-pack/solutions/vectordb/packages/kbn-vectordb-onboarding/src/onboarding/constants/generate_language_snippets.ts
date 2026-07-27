/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnippetSet } from './languages';

export const GENERATE_VECTORS_INGEST_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

client.indices.create(
    index="my_semantic_vectors",
    mappings={"properties": {"text": {"type": "semantic_text"}}},
)

client.bulk(
    operations=[
        {"index": {"_index": "my_semantic_vectors"}},
        {"text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano."},
        {"index": {"_index": "my_semantic_vectors"}},
        {"text": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees."},
        {"index": {"_index": "my_semantic_vectors"}},
        {"text": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing."},
    ],
)`,
  javascript: `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://your-elasticsearch-url",
  auth: { apiKey: "YOUR_API_KEY" },
});

await client.indices.create({
  index: "my_semantic_vectors",
  mappings: { properties: { text: { type: "semantic_text" } } },
});

await client.bulk({
  operations: [
    { index: { _index: "my_semantic_vectors" } },
    { text: "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." },
    { index: { _index: "my_semantic_vectors" } },
    { text: "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." },
    { index: { _index: "my_semantic_vectors" } },
    { text: "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." },
  ],
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
    .index("my_semantic_vectors")
    .mappings(m -> m
        .properties("text", p -> p.semanticText(t -> t))
    )
);

client.bulk(b -> b
    .index("my_semantic_vectors")
    .operations(op -> op.index(i -> i.document(Map.of("text", "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano."))))
    .operations(op -> op.index(i -> i.document(Map.of("text", "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees."))))
    .operations(op -> op.index(i -> i.document(Map.of("text", "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing."))))
);`,
  go: `package main

import (
    "strings"

    "github.com/elastic/go-elasticsearch/v9"
)

func main() {
    es, _ := elasticsearch.NewClient(elasticsearch.Config{
        Addresses: []string{"https://your-elasticsearch-url"},
        APIKey:    "YOUR_API_KEY",
    })

    es.Indices.Create("my_semantic_vectors",
        es.Indices.Create.WithBody(strings.NewReader(\`{
            "mappings": { "properties": { "text": { "type": "semantic_text" } } }
        }\`)),
    )

    es.Bulk(strings.NewReader(\`{ "index": { "_index": "my_semantic_vectors" } }
{"text":"Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano."}
{ "index": { "_index": "my_semantic_vectors" } }
{"text":"Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees."}
{ "index": { "_index": "my_semantic_vectors" } }
{"text":"Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing."}
\`))
}`,
  rust: `use elasticsearch::{
    Elasticsearch, BulkParts, indices::IndicesCreateParts,
    auth::Credentials, http::request::JsonBody, http::transport::Transport,
};
use serde_json::{json, Value};

let creds = Credentials::ApiKey("YOUR_API_KEY".into(), String::new());
let transport = Transport::single_node("https://your-elasticsearch-url")?
    .with_auth(creds);
let client = Elasticsearch::new(transport);

client.indices()
    .create(IndicesCreateParts::Index("my_semantic_vectors"))
    .body(json!({ "mappings": { "properties": { "text": { "type": "semantic_text" } } } }))
    .send().await?;

let body: Vec<JsonBody<Value>> = vec![
    json!({ "index": {} }).into(),
    json!({ "text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." }).into(),
    json!({ "index": {} }).into(),
    json!({ "text": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." }).into(),
    json!({ "index": {} }).into(),
    json!({ "text": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." }).into(),
];
client.bulk(BulkParts::Index("my_semantic_vectors"))
    .body(body)
    .send().await?;`,
  csharp: `using Elastic.Clients.Elasticsearch;
using Elastic.Transport;

var settings = new ElasticsearchClientSettings(new Uri("https://your-elasticsearch-url"))
    .Authentication(new ApiKey("YOUR_API_KEY"));
var client = new ElasticsearchClient(settings);

await client.Indices.CreateAsync("my_semantic_vectors", c => c
    .Mappings(m => m.Properties(p => p.SemanticText("text")))
);

await client.BulkAsync("my_semantic_vectors", b => b
    .IndexMany(new[]
    {
        new { text = "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." },
        new { text = "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." },
        new { text = "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." },
    })
);`,
};

export const GENERATE_VECTORS_SEARCH_SNIPPETS: SnippetSet = {
  python: `result = client.search(
    index="my_semantic_vectors",
    query={"match": {"text": "Where is best for backpacking?"}},
)
print(result["hits"]["hits"])`,
  javascript: `const result = await client.search({
  index: "my_semantic_vectors",
  query: { match: { text: "Where is best for backpacking?" } },
});
console.log(result.hits.hits);`,
  java: `SearchResponse<JsonData> result = client.search(s -> s
    .index("my_semantic_vectors")
    .query(q -> q
        .match(m -> m.field("text").query("Where is best for backpacking?"))
    ),
    JsonData.class
);
result.hits().hits().forEach(h -> System.out.println(h.source()));`,
  go: `res, _ := es.Search(
    es.Search.WithIndex("my_semantic_vectors"),
    es.Search.WithBody(strings.NewReader(\`{
        "query": { "match": { "text": "Where is best for backpacking?" } }
    }\`)),
)
defer res.Body.Close()`,
  rust: `use elasticsearch::SearchParts;

let response = client.search(SearchParts::Index(&["my_semantic_vectors"]))
    .body(json!({
        "query": { "match": { "text": "Where is best for backpacking?" } }
    }))
    .send().await?;

let body = response.json::<serde_json::Value>().await?;
println!("{:#?}", body["hits"]["hits"]);`,
  csharp: `var response = await client.SearchAsync<object>(s => s
    .Indices("my_semantic_vectors")
    .Query(q => q.Match(m => m
        .Field("text")
        .Query("Where is best for backpacking?")
    ))
);

foreach (var hit in response.Hits) Console.WriteLine(hit.Source);`,
};

export const GENERATE_VECTORS_SEARCH_HYBRID_SNIPPETS: SnippetSet = {
  python: `result = client.search(
    index="my_semantic_vectors",
    retriever={
        "rrf": {
            "retrievers": [
                {
                    "standard": {
                        "query": {
                            "semantic": {
                                "field": "text",
                                "query": "Where is best for backpacking?",
                            }
                        }
                    }
                },
                {
                    "standard": {
                        "query": {"match": {"text": "Where is best for backpacking?"}}
                    }
                },
            ]
        }
    },
)
print(result["hits"]["hits"])`,
  javascript: `const result = await client.search({
  index: "my_semantic_vectors",
  retriever: {
    rrf: {
      retrievers: [
        {
          standard: {
            query: {
              semantic: { field: "text", query: "Where is best for backpacking?" },
            },
          },
        },
        {
          standard: {
            query: { match: { text: "Where is best for backpacking?" } },
          },
        },
      ],
    },
  },
});
console.log(result.hits.hits);`,
  java: `SearchResponse<JsonData> result = client.search(s -> s
    .index("my_semantic_vectors")
    .retriever(r -> r
        .rrf(rrf -> rrf
            .retrievers(sem -> sem
                .standard(std -> std
                    .query(q -> q.semantic(se -> se.field("text").query("Where is best for backpacking?")))
                )
            )
            .retrievers(lex -> lex
                .standard(std -> std
                    .query(q -> q.match(m -> m.field("text").query("Where is best for backpacking?")))
                )
            )
        )
    ),
    JsonData.class
);
result.hits().hits().forEach(h -> System.out.println(h.source()));`,
  go: `res, _ := es.Search(
    es.Search.WithIndex("my_semantic_vectors"),
    es.Search.WithBody(strings.NewReader(\`{
        "retriever": {
            "rrf": {
                "retrievers": [
                    {
                        "standard": {
                            "query": {
                                "semantic": { "field": "text", "query": "Where is best for backpacking?" }
                            }
                        }
                    },
                    {
                        "standard": {
                            "query": { "match": { "text": "Where is best for backpacking?" } }
                        }
                    }
                ]
            }
        }
    }\`)),
)
defer res.Body.Close()`,
  rust: `use elasticsearch::SearchParts;

let response = client.search(SearchParts::Index(&["my_semantic_vectors"]))
    .body(json!({
        "retriever": {
            "rrf": {
                "retrievers": [
                    {
                        "standard": {
                            "query": {
                                "semantic": { "field": "text", "query": "Where is best for backpacking?" }
                            }
                        }
                    },
                    {
                        "standard": {
                            "query": { "match": { "text": "Where is best for backpacking?" } }
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
    .Indices("my_semantic_vectors")
    .Retriever(r => r
        .Rrf(rrf => rrf
            .Retrievers(
                rt => rt.Standard(st => st
                    .Query(q => q.Semantic(sem => sem
                        .Field("text")
                        .Query("Where is best for backpacking?")
                    ))
                ),
                rt => rt.Standard(st => st
                    .Query(q => q.Match(m => m.Field("text").Query("Where is best for backpacking?")))
                )
            )
        )
    )
);

foreach (var hit in response.Hits) Console.WriteLine(hit.Source);`,
};
