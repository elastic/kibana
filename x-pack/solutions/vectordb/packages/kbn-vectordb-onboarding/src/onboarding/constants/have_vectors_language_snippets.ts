/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnippetSet } from '../types';

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

client.bulk(
    operations=[
        {"index": {"_index": "my_dense_vectors"}},
        {
            "text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
            "vector": [0.12, -0.04, 0.88, 0.21, 0.55],
        },
        {"index": {"_index": "my_dense_vectors"}},
        {
            "text": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
            "vector": [0.4, 0.5, 0.82, -0.3, -0.1],
        },
        {"index": {"_index": "my_dense_vectors"}},
        {
            "text": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.",
            "vector": [0.2, 0.18, 0.32, -0.5, -0.01],
        },
    ],
)
`,
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

await client.bulk({
  operations: [
    { index: { _index: "my_dense_vectors" } },
    {
      text: "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
      vector: [0.12, -0.04, 0.88, 0.21, 0.55],
    },
    { index: { _index: "my_dense_vectors" } },
    {
      text: "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
      vector: [0.4, 0.5, 0.82, -0.3, -0.1],
    },
    { index: { _index: "my_dense_vectors" } },
    {
      text: "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.",
      vector: [0.2, 0.18, 0.32, -0.5, -0.01],
    },
  ],
});
`,
  java: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._helpers.bulk.BulkIngester;

import java.io.IOException;
import java.util.List;

public class BulkVectorIngestion {

    public record JsonVector(String text, float[] vector) {
    }

    private static final List<JsonVector> DOCS = List.of(
        new JsonVector("Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.", new float[]{0.12f, -0.04f, 0.88f, 0.21f, 0.55f}),
        new JsonVector("Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.", new float[]{0.4f, 0.5f, 0.82f, -0.3f, -0.1f}),
        new JsonVector("Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.", new float[]{0.2f, 0.18f, 0.32f, -0.5f, -0.01f})
    );

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient esClient = ElasticsearchClient.of(e -> e.host("https://your-elasticsearch-url").apiKey("YOUR_API_KEY"));
            BulkIngester<Void> ingester = BulkIngester.of(b -> b.client(esClient))) {

            esClient.indices().create(c -> c
                .index("my_dense_vectors")
                .mappings(m -> m
                    .properties("text", p -> p.text(t -> t))
                    .properties("vector", p -> p.denseVector(d -> d))
                )
            );

            DOCS.forEach(doc -> ingester.add(op -> op
                .index(idx -> idx
                    .index("my_dense_vectors")
                    .document(doc)
                )
            ));
        }
    }
}
`,
  go: `package main

import (
	"context"
	"log"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
	"github.com/elastic/go-elasticsearch/v9/typedapi/types"
)

type document struct {
	Text   string    \`json:"text"\`
	Vector []float32 \`json:"vector"\`
}

func main() {
	ctx := context.Background()

	es, err := elasticsearch.NewTyped(
		elasticsearch.WithAddresses("https://your-elasticsearch-url"),
		elasticsearch.WithAPIKey("YOUR_API_KEY"),
	)
	if err != nil {
		log.Fatalf("failed to create the client: %s", err)
	}

	if _, err := es.Indices.Create("my_dense_vectors").
		Mappings(esdsl.NewTypeMapping().
			AddProperty("vector", esdsl.NewDenseVectorProperty()).
			AddProperty("text", esdsl.NewTextProperty())).
		Do(ctx); err != nil {
		log.Fatalf("failed to create the index: %s", err)
	}

	bulk := es.Bulk().Index("my_dense_vectors")

	for _, doc := range []document{
		{Text: "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.", Vector: []float32{0.12, -0.04, 0.88, 0.21, 0.55}},
		{Text: "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.", Vector: []float32{0.4, 0.5, 0.82, -0.3, -0.1}},
		{Text: "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.", Vector: []float32{0.2, 0.18, 0.32, -0.5, -0.01}},
	} {
		if err := bulk.IndexOp(types.IndexOperation{}, doc); err != nil {
			log.Fatalf("failed to add document to the bulk request: %s", err)
		}
	}

	response, err := bulk.Do(ctx)
	if err != nil {
		log.Fatalf("bulk request failed: %s", err)
	}
	if response.Errors {
		for _, item := range response.Items {
			for _, op := range item {
				if op.Error != nil {
					log.Printf("failed to index document (status %d): %s", op.Status, op.Error.Type)
				}
			}
		}
	}
}
`,
  rust: `#![recursion_limit = "1024"]

use elasticsearch::{
    Elasticsearch, BulkParts, indices::IndicesCreateParts,
    auth::Credentials, http::request::JsonBody, http::transport::Transport,
};
use serde_json::{json, Value};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let creds = Credentials::EncodedApiKey("YOUR_API_KEY".into());
    let transport = Transport::single_node("https://your-elasticsearch-url")?
        .clone_with_auth(Some(creds));
    let client = Elasticsearch::new(transport);

    client.indices()
        .create(IndicesCreateParts::Index("my_dense_vectors"))
        .body(json!({
            "mappings": {
                "properties": {
                    "vector": { "type": "dense_vector" },
                    "text": { "type": "text" }
                }
            }
        }))
        .send().await?
        .error_for_status_code()?;

    let body: Vec<JsonBody<Value>> = vec![
        json!({ "index": {} }).into(),
        json!({
            "text": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
            "vector": [0.12, -0.04, 0.88, 0.21, 0.55]
        }).into(),
        json!({ "index": {} }).into(),
        json!({
            "text": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
            "vector": [0.4, 0.5, 0.82, -0.3, -0.1]
        }).into(),
        json!({ "index": {} }).into(),
        json!({
            "text": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.",
            "vector": [0.2, 0.18, 0.32, -0.5, -0.01]
        }).into(),
    ];

    let response = client.bulk(BulkParts::Index("my_dense_vectors"))
        .body(body)
        .send().await?
        .error_for_status_code()?;

    let response_body = response.json::<Value>().await?;
    if response_body["errors"] == true {
        for item in response_body["items"].as_array().into_iter().flatten() {
            if !item["index"]["error"].is_null() {
                eprintln!(
                    "failed to index document (status {}): {}",
                    item["index"]["status"], item["index"]["error"]
                );
            }
        }
    }

    Ok(())
}
`,
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

await client.BulkAsync("my_dense_vectors", b => b
    .IndexMany(new[]
    {
        new {
            text = "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
            vector = new[] { 0.12f, -0.04f, 0.88f, 0.21f, 0.55f }
        },
        new {
            text = "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
            vector = new[] { 0.4f, 0.5f, 0.82f, -0.3f, -0.1f }
        },
        new {
            text = "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.",
            vector = new[] { 0.2f, 0.18f, 0.32f, -0.5f, -0.01f }
        },
    })
);
`,
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

client.bulk(
  index: 'my_dense_vectors',
  body: [
    { index: { data: { text: 'Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.', vector: [0.12, -0.04, 0.88, 0.21, 0.55] } } },
    { index: { data: { text: 'Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.', vector: [0.4, 0.5, 0.82, -0.3, -0.1] } } },
    { index: { data: { text: 'Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.', vector: [0.2, 0.18, 0.32, -0.5, -0.01] } } }
  ]
)
`,
};

export const HAVE_VECTORS_SEARCH_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

result = client.search(
    index="my_dense_vectors",
    knn={
        "field": "vector",
        "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
    },
)
print(result["hits"]["hits"])
`,
  javascript: `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://your-elasticsearch-url",
  auth: { apiKey: "YOUR_API_KEY" },
});

const result = await client.search({
  index: "my_dense_vectors",
  knn: {
    field: "vector",
    query_vector: [0.10, -0.02, 0.91, 0.18, 0.60],
  },
});
console.log(result.hits.hits);
`,
  java: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.json.JsonData;

import java.io.IOException;
import java.util.List;

public class KnnSearchFixed {

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient client = ElasticsearchClient.of(e -> e.host("https://your-elasticsearch-url").apiKey("YOUR_API_KEY"))) {

            SearchResponse<JsonData> result = client.search(s -> s
                .index("my_dense_vectors")
                .knn(k -> k
                    .field("vector")
                    .queryVector(List.of(0.10f, -0.02f, 0.91f, 0.18f, 0.60f))
                ),
                JsonData.class);
            result.hits().hits().forEach(h -> System.out.println(h.score() + " | " + h.source()));
        }
    }
}
`,
  go: `package main

import (
	"context"
	"fmt"
	"log"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
)

func main() {
	ctx := context.Background()

	es, err := elasticsearch.NewTyped(
		elasticsearch.WithAddresses("https://your-elasticsearch-url"),
		elasticsearch.WithAPIKey("YOUR_API_KEY"),
	)
	if err != nil {
		log.Fatalf("failed to create the client: %s", err)
	}

	response, err := es.Search().
		Index("my_dense_vectors").
		Knn(esdsl.NewKnnSearch().
			Field("vector").
			QueryVector(0.10, -0.02, 0.91, 0.18, 0.60)).
		Do(ctx)
	if err != nil {
		log.Fatalf("search failed: %s", err)
	}

	for _, hit := range response.Hits.Hits {
		fmt.Println(*hit.Score_, string(hit.Source_))
	}
}
`,
  rust: `#![recursion_limit = "1024"]

use elasticsearch::{Elasticsearch, SearchParts, auth::Credentials, http::transport::Transport};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let creds = Credentials::EncodedApiKey("YOUR_API_KEY".into());
    let transport = Transport::single_node("https://your-elasticsearch-url")?
        .clone_with_auth(Some(creds));
    let client = Elasticsearch::new(transport);

    let response = client.search(SearchParts::Index(&["my_dense_vectors"]))
        .body(json!({
            "knn": {
                "field": "vector",
                "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60]
            }
        }))
        .send().await?
        .error_for_status_code()?;

    let body = response.json::<serde_json::Value>().await?;
    println!("{:#?}", body["hits"]["hits"]);
    Ok(())
}
`,
  csharp: `using Elastic.Clients.Elasticsearch;
using Elastic.Transport;

var settings = new ElasticsearchClientSettings(new Uri("https://your-elasticsearch-url"))
    .Authentication(new ApiKey("YOUR_API_KEY"));
var client = new ElasticsearchClient(settings);

var response = await client.SearchAsync<object>(s => s
    .Indices("my_dense_vectors")
    .Knn(k => k
        .Field("vector")
        .QueryVector(new[] { 0.10f, -0.02f, 0.91f, 0.18f, 0.60f })
    )
);

foreach (var hit in response.Hits)
    Console.WriteLine($"{hit.Score}  {hit.Source}");
`,
  ruby: `require 'elasticsearch'

client = Elasticsearch::Client.new(
  url: 'https://your-elasticsearch-url',
  api_key: 'YOUR_API_KEY'
)

result = client.search(
  index: 'my_dense_vectors',
  body: { knn: { field: 'vector', query_vector: [0.10, -0.02, 0.91, 0.18, 0.60] } }
)
puts result['hits']['hits']
`,
};

export const HAVE_VECTORS_SEARCH_HYBRID_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

result = client.search(
    index="my_dense_vectors",
    retriever={
        "linear": {
            "retrievers": [
                {
                    "retriever": {
                        "knn": {
                            "field": "vector",
                            "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
                            "k": 10,
                        }
                    },
                    "normalizer": "minmax",
                },
                {
                    "retriever": {
                        "standard": {
                            "query": {"match": {"text": "What is a good national park for backpacking?"}}
                        }
                    },
                    "normalizer": "minmax",
                },
            ]
        }
    },
)
print(result["hits"]["hits"])
`,
  javascript: `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://your-elasticsearch-url",
  auth: { apiKey: "YOUR_API_KEY" },
});

const result = await client.search({
  index: "my_dense_vectors",
  retriever: {
    linear: {
      retrievers: [
        {
          retriever: {
            knn: {
              field: "vector",
              query_vector: [0.10, -0.02, 0.91, 0.18, 0.60],
              k: 10,
            },
          },
          normalizer: "minmax",
        },
        {
          retriever: {
            standard: {
              query: { match: { text: "What is a good national park for backpacking?" } },
            },
          },
          normalizer: "minmax",
        },
      ],
    },
  },
});
console.log(result.hits.hits);
`,
  java: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch._types.ScoreNormalizer;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.json.JsonData;

import java.io.IOException;
import java.util.List;

public class DenseHybridSearchFixed {

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient client = ElasticsearchClient.of(e -> e.host("https://your-elasticsearch-url").apiKey("YOUR_API_KEY"))) {

            SearchResponse<JsonData> result = client.search(s -> s
                .index("my_dense_vectors")
                .retriever(r -> r
                    .linear(linear -> linear
                        .retrievers(k -> k
                            .retriever(ir -> ir
                                .knn(knn -> knn
                                    .field("vector")
                                    .queryVector(List.of(0.10f, -0.02f, 0.91f, 0.18f, 0.60f))
                                    .k(10)
                                )
                            )
                            .normalizer(ScoreNormalizer.Minmax)
                        )
                        .retrievers(st -> st
                            .retriever(ir -> ir
                                .standard(std -> std
                                    .query(q -> q.match(m -> m.field("text").query("What is a good national park for backpacking?")))
                                )
                            )
                            .normalizer(ScoreNormalizer.Minmax)
                        )
                    )
                ),
                JsonData.class
            );
            result.hits().hits().forEach(h -> System.out.println(h.score() + " | " + h.source()));
        }
    }
}
`,
  go: `package main

import (
	"context"
	"fmt"
	"log"

	"github.com/elastic/go-elasticsearch/v9"
	"github.com/elastic/go-elasticsearch/v9/typedapi/esdsl"
	"github.com/elastic/go-elasticsearch/v9/typedapi/types/enums/scorenormalizer"
)

func main() {
	ctx := context.Background()

	es, err := elasticsearch.NewTyped(
		elasticsearch.WithAddresses("https://your-elasticsearch-url"),
		elasticsearch.WithAPIKey("YOUR_API_KEY"),
	)
	if err != nil {
		log.Fatalf("failed to create the client: %s", err)
	}

	response, err := es.Search().
		Index("my_dense_vectors").
		Retriever(esdsl.NewLinearRetriever().
			Retrievers(
				esdsl.NewInnerRetriever(
					esdsl.NewRetrieverContainer().
						Knn(esdsl.NewKnnRetriever("vector", 10).
							QueryVector(0.10, -0.02, 0.91, 0.18, 0.60)),
				).Normalizer(scorenormalizer.Minmax),
				esdsl.NewInnerRetriever(
					esdsl.NewRetrieverContainer().
						Standard(esdsl.NewStandardRetriever().
							Query(esdsl.NewMatchQuery("text", "What is a good national park for backpacking?"))),
				).Normalizer(scorenormalizer.Minmax),
			)).
		Do(ctx)
	if err != nil {
		log.Fatalf("search failed: %s", err)
	}

	for _, hit := range response.Hits.Hits {
		fmt.Println(*hit.Score_, string(hit.Source_))
	}
}
`,
  rust: `#![recursion_limit = "1024"]

use elasticsearch::{Elasticsearch, SearchParts, auth::Credentials, http::transport::Transport};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let creds = Credentials::EncodedApiKey("YOUR_API_KEY".into());
    let transport = Transport::single_node("https://your-elasticsearch-url")?
        .clone_with_auth(Some(creds));
    let client = Elasticsearch::new(transport);

    let response = client.search(SearchParts::Index(&["my_dense_vectors"]))
        .body(json!({
            "retriever": {
                "linear": {
                    "retrievers": [
                        {
                            "retriever": {
                                "knn": {
                                    "field": "vector",
                                    "query_vector": [0.10, -0.02, 0.91, 0.18, 0.60],
                                    "k": 10
                                }
                            },
                            "normalizer": "minmax"
                        },
                        {
                            "retriever": {
                                "standard": {
                                    "query": { "match": { "text": "What is a good national park for backpacking?" } }
                                }
                            },
                            "normalizer": "minmax"
                        }
                    ]
                }
            }
        }))
        .send().await?
        .error_for_status_code()?;

    let body = response.json::<serde_json::Value>().await?;
    println!("{:#?}", body["hits"]["hits"]);

    Ok(())
}
`,
  csharp: `using Elastic.Clients.Elasticsearch;
using Elastic.Clients.Elasticsearch.QueryDsl;
using Elastic.Transport;

var settings = new ElasticsearchClientSettings(new Uri("https://your-elasticsearch-url"))
    .Authentication(new ApiKey("YOUR_API_KEY"));
var client = new ElasticsearchClient(settings);

var response = await client.SearchAsync<object>(s => s
    .Indices("my_dense_vectors")
    .Retriever(r => r
        .Linear(l => l
            .Retrievers(
                ir => ir
                    .Retriever(rr => rr.Knn(k => k
                        .Field("vector")
                        .QueryVector(0.10f, -0.02f, 0.91f, 0.18f, 0.60f)
                        .K(10)))
                    .Normalizer(ScoreNormalizer.Minmax)
                    .Weight(1f),
                ir => ir
                    .Retriever(rr => rr.Standard(st => st
                        .Query(q => q.Match(m => m
                            .Field("text")
                            .Query("What is a good national park for backpacking?")))))
                    .Normalizer(ScoreNormalizer.Minmax)
                    .Weight(1f)
            )
        )
    )
);

if (!response.IsValidResponse)
{
    Console.Error.WriteLine(response.DebugInformation);
    return 1;
}

foreach (var hit in response.Hits)
    Console.WriteLine($"{hit.Score}  {hit.Source}");

return 0;
`,
  ruby: `require 'elasticsearch'

client = Elasticsearch::Client.new(
  url: 'https://your-elasticsearch-url',
  api_key: 'YOUR_API_KEY'
)

result = client.search(
  index: 'my_dense_vectors',
  body: {
    retriever: {
      linear: {
        retrievers: [
          {
            retriever: { knn: { field: 'vector', query_vector: [0.10, -0.02, 0.91, 0.18, 0.60], k: 10 } },
            normalizer: 'minmax'
          },
          {
            retriever: { standard: { query: { match: { text: 'What is a good national park for backpacking?' } } } },
            normalizer: 'minmax'
          }
        ]
      }
    }
  }
)
puts result['hits']['hits']
`,
};
