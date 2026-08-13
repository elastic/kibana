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
        "text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
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
    text: "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
    vector: [0.12, -0.04, 0.88, 0.21, 0.55],
  },
});`,
  java: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._helpers.bulk.BulkIngester;

import java.io.IOException;
import java.util.List;

public class BulkVectorIngestion {

    public record JsonVector(String text, float[] emb) {
    }

    private static final List<JsonVector> DOCS = List.of(
        new JsonVector("Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.", new float[]{0.12f, -0.04f, 0.88f, 0.21f, 0.55f}),
        new JsonVector("Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.", new float[]{0.4f, 0.5f, 0.82f, -0.3f, -0.1f}),
        new JsonVector("Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.", new float[]{0.2f, 0.18f, 0.32f, -0.5f, -0.01f})
    );

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient esClient = ElasticsearchClient.of(e -> e.host("host").apiKey("apikey"));
            BulkIngester<Void> ingester = BulkIngester.of(b -> b.client(esClient))) {

            esClient.indices().create(c -> c
               .index("vector-index")
               .mappings(m -> m
                   .properties("emb", p -> p.denseVector(t -> t))
               )
            );

            DOCS.forEach(doc -> ingester.add(op -> op
               .index(idx -> idx
                   .index("vector-index")
                   .document(doc)
               )
            ));
        }
    }
}`,
  go: `package main

import (
  "context"

  "github.com/elastic/go-elasticsearch/v9"
  "github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
  "github.com/elastic/go-elasticsearch/v9/typedapi/types"
)

type document struct {
  Text string    \`json:"text"\`
  Emb  []float32 \`json:"emb"\`
}

func main() {
  ctx := context.Background()

  es, _ := elasticsearch.NewTyped(
    elasticsearch.WithAddresses("https://your-elasticsearch-url"),
    elasticsearch.WithAPIKey("YOUR_API_KEY"),
  )

  es.Indices.Create("vector-index").
    Mappings(esdsl.NewTypeMapping().
      AddProperty("emb", esdsl.NewDenseVectorProperty())).
    Do(ctx)

  bulk := es.Bulk().Index("vector-index")
  for _, doc := range []document{
    {Text: "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.", Emb: []float32{0.12, -0.04, 0.88, 0.21, 0.55}},
    {Text: "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.", Emb: []float32{0.4, 0.5, 0.82, -0.3, -0.1}},
    {Text: "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.", Emb: []float32{0.2, 0.18, 0.32, -0.5, -0.01}},
  } {
    _ = bulk.IndexOp(types.IndexOperation{}, doc)
  }
  bulk.Do(ctx)
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
        "text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
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
            .DenseVector("vector")
            .Text("text")
        )
    )
);

await client.IndexAsync(new {
    text = "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
    vector = new[] { 0.12, -0.04, 0.88, 0.21, 0.55 }
}, i => i.Index("my_dense_vectors"));`,
  ruby: `require 'elasticsearch'

client = Elasticsearch::Client.new(
  url: 'https://your-elasticsearch-url',
  api_key: 'YOUR_API_KEY'
)

client.indices.create(
  index: 'my_dense_vectors',
  body: {
    mappings: {
      properties: { vector: { type: 'dense_vector' }, text: { type: 'text' } }
    }
  }
)

client.index(
  index: 'my_dense_vectors',
  body: {
    text: 'Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.',
    vector: [0.12, -0.04, 0.88, 0.21, 0.55]
  }
)`,
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
    JsonData.class);
result.hits().hits().forEach(h -> System.out.println(h.source()));`,
  go: `response, _ := es.Search().
  Index("vector-index").
  Knn(esdsl.NewKnnSearch().
    Field("emb").
    QueryVector(0.1, 0.2, 0.3)).
  Do(ctx)`,
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
  ruby: `result = client.search(
  index: 'my_dense_vectors',
  body: { knn: { field: 'vector', query_vector: [0.10, -0.02, 0.91, 0.18, 0.60] } }
)
puts result['hits']['hits']`,
};

// TODO: placeholder examples — replace with the final hybrid search examples
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
                        "query": {"match": {"text": "what is elasticsearch?"}}
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
            query: { match: { text: "what is elasticsearch?" } },
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
                    .query(q -> q.match(m -> m.field("text").query("what is elasticsearch?")))
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
                            "query": { "match": { "text": "what is elasticsearch?" } }
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
                            "query": { "match": { "text": "what is elasticsearch?" } }
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
                    .Query(q => q.Match(m => m.Field("text").Query("what is elasticsearch?")))
                )
            )
        )
    )
);

foreach (var hit in response.Hits) Console.WriteLine(hit.Source);`,
  ruby: `result = client.search(
  index: 'my_dense_vectors',
  body: {
    retriever: {
      rrf: {
        retrievers: [
          { knn: { field: 'vector', query_vector: [0.10, -0.02, 0.91, 0.18, 0.60] } },
          { standard: { query: { match: { text: 'what is elasticsearch?' } } } }
        ]
      }
    }
  }
)
puts result['hits']['hits']`,
};

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
import co.elastic.clients.elasticsearch._helpers.bulk.BulkIngester;

import java.io.IOException;
import java.util.List;
import java.util.Map;

public class GenerateEmbeddings {

    private static final List<String> TEXTS = List.of(
        "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
        "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
        "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing."
    );

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient esClient = ElasticsearchClient.of(e -> e.host("host").apiKey("apikey"));
            BulkIngester<Void> ingester = BulkIngester.of(b -> b.client(esClient))) {

            esClient.indices().create(c -> c
               .index("my_semantic_vectors")
               .mappings(m -> m
                   .properties("text", p -> p.semanticText(t -> t))
               )
            );

            TEXTS.forEach(text -> ingester.add(op -> op
               .index(i -> i
                   .index("my_semantic_vectors")
                   .document(Map.of("text", text))
               )
            ));
        }
    }
}`,
  go: `package main

import (
  "context"

  "github.com/elastic/go-elasticsearch/v9"
  "github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
  "github.com/elastic/go-elasticsearch/v9/typedapi/types"
)

func main() {
  ctx := context.Background()

  es, _ := elasticsearch.NewTyped(
    elasticsearch.WithAddresses("https://your-elasticsearch-url"),
    elasticsearch.WithAPIKey("YOUR_API_KEY"),
  )

  es.Indices.Create("my_semantic_vectors").
    Mappings(esdsl.NewTypeMapping().
      AddProperty("text", esdsl.NewSemanticTextProperty())).
    Do(ctx)

  bulk := es.Bulk().Index("my_semantic_vectors")
  for _, text := range []string{
    "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
    "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
    "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.",
  } {
    _ = bulk.IndexOp(
      types.IndexOperation{},
      map[string]string{"text": text},
    )
  }
  bulk.Do(ctx)
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
  ruby: `require 'elasticsearch'

client = Elasticsearch::Client.new(
  url: 'https://your-elasticsearch-url',
  api_key: 'YOUR_API_KEY'
)

client.indices.create(
  index: 'my_semantic_vectors',
  body: { mappings: { properties: { text: { type: 'semantic_text' } } } }
)

client.bulk(
  index: 'my_semantic_vectors',
  body: [
    { index: { data: { text: 'Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.' } } },
    { index: { data: { text: 'Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.' } } },
    { index: { data: { text: 'Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.' } } }
  ]
)`,
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
    JsonData.class);
result.hits().hits().forEach(h -> System.out.println(h.source()));`,
  go: `response, _ := es.Search().
  Index("my_semantic_vectors").
  Query(esdsl.NewMatchQuery(
    "text",
    "Which national park contains Old Faithful?",
  )).
  Do(ctx)`,
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
  ruby: `result = client.search(
  index: 'my_semantic_vectors',
  body: { query: { match: { text: 'Where is best for backpacking?' } } }
)
puts result['hits']['hits']`,
};

// TODO: placeholder examples — replace with the final hybrid search examples
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
                                "query": "what is elasticsearch?",
                            }
                        }
                    }
                },
                {
                    "standard": {
                        "query": {"match": {"text": "what is elasticsearch?"}}
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
              semantic: { field: "text", query: "what is elasticsearch?" },
            },
          },
        },
        {
          standard: {
            query: { match: { text: "what is elasticsearch?" } },
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
                    .query(q -> q.semantic(se -> se.field("text").query("what is elasticsearch?")))
                )
            )
            .retrievers(lex -> lex
                .standard(std -> std
                    .query(q -> q.match(m -> m.field("text").query("what is elasticsearch?")))
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
                                "semantic": { "field": "text", "query": "what is elasticsearch?" }
                            }
                        }
                    },
                    {
                        "standard": {
                            "query": { "match": { "text": "what is elasticsearch?" } }
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
                                "semantic": { "field": "text", "query": "what is elasticsearch?" }
                            }
                        }
                    },
                    {
                        "standard": {
                            "query": { "match": { "text": "what is elasticsearch?" } }
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
                        .Query("what is elasticsearch?")
                    ))
                ),
                rt => rt.Standard(st => st
                    .Query(q => q.Match(m => m.Field("text").Query("what is elasticsearch?")))
                )
            )
        )
    )
);

foreach (var hit in response.Hits) Console.WriteLine(hit.Source);`,
  ruby: `result = client.search(
  index: 'my_semantic_vectors',
  body: {
    retriever: {
      rrf: {
        retrievers: [
          { standard: { query: { semantic: { field: 'text', query: 'what is elasticsearch?' } } } },
          { standard: { query: { match: { text: 'what is elasticsearch?' } } } }
        ]
      }
    }
  }
)
puts result['hits']['hits']`,
};
