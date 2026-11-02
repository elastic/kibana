/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnippetSet } from '../types';

export const GENERATE_VECTORS_INGEST_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

client.indices.create(
    index="my_semantic_vectors",
    mappings={
        "properties": {
            "content": {"type": "text", "copy_to": "semantic_content"},
            "semantic_content": {"type": "semantic_text"},
        }
    },
)

client.bulk(
    operations=[
        {"index": {"_index": "my_semantic_vectors"}},
        {"content": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano."},
        {"index": {"_index": "my_semantic_vectors"}},
        {"content": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees."},
        {"index": {"_index": "my_semantic_vectors"}},
        {"content": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing."},
    ],
)
`,
  javascript: `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://your-elasticsearch-url",
  auth: { apiKey: "YOUR_API_KEY" },
});

await client.indices.create({
  index: "my_semantic_vectors",
  mappings: {
    properties: {
      content: { type: "text", copy_to: "semantic_content" },
      semantic_content: { type: "semantic_text" },
    },
  },
});

await client.bulk({
  operations: [
    { index: { _index: "my_semantic_vectors" } },
    { content: "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." },
    { index: { _index: "my_semantic_vectors" } },
    { content: "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." },
    { index: { _index: "my_semantic_vectors" } },
    { content: "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." },
  ],
});
`,
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

        try (ElasticsearchClient esClient = ElasticsearchClient.of(e -> e.host("https://your-elasticsearch-url").apiKey("YOUR_API_KEY"));
            BulkIngester<Void> ingester = BulkIngester.of(b -> b.client(esClient))) {

            esClient.indices().create(c -> c
                .index("my_semantic_vectors")
                .mappings(m -> m
                    .properties("content", p -> p.text(t -> t.copyTo("semantic_content")))
                    .properties("semantic_content", p -> p.semanticText(t -> t))
                )
            );

            TEXTS.forEach(text -> ingester.add(op -> op
                .index(i -> i
                    .index("my_semantic_vectors")
                    .document(Map.of("content", text))
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

func main() {
	ctx := context.Background()

	es, err := elasticsearch.NewTyped(
		elasticsearch.WithAddresses("https://your-elasticsearch-url"),
		elasticsearch.WithAPIKey("YOUR_API_KEY"),
	)
	if err != nil {
		log.Fatalf("failed to create the client: %s", err)
	}

	if _, err := es.Indices.Create("my_semantic_vectors").
		Mappings(esdsl.NewTypeMapping().
			AddProperty("content", esdsl.NewTextProperty().CopyTo("semantic_content")).
			AddProperty("semantic_content", esdsl.NewSemanticTextProperty())).
		Do(ctx); err != nil {
		log.Fatalf("failed to create the index: %s", err)
	}

	bulk := es.Bulk().Index("my_semantic_vectors")

	for _, text := range []string{
		"Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.",
		"Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.",
		"Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.",
	} {
		if err := bulk.IndexOp(
			types.IndexOperation{},
			map[string]string{"content": text},
		); err != nil {
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
  rust: `use elasticsearch::{
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
        .create(IndicesCreateParts::Index("my_semantic_vectors"))
        .body(json!({
            "mappings": {
                "properties": {
                    "content": { "type": "text", "copy_to": "semantic_content" },
                    "semantic_content": { "type": "semantic_text" }
                }
            }
        }))
        .send().await?
        .error_for_status_code()?;

    let body: Vec<JsonBody<Value>> = vec![
        json!({ "index": {} }).into(),
        json!({ "content": "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." }).into(),
        json!({ "index": {} }).into(),
        json!({ "content": "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." }).into(),
        json!({ "index": {} }).into(),
        json!({ "content": "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." }).into(),
    ];

    let response = client.bulk(BulkParts::Index("my_semantic_vectors"))
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

await client.Indices.CreateAsync("my_semantic_vectors", c => c
    .Mappings(m => m.Properties(p => p
        .Text("content", t => t.CopyTo("semantic_content"))
        .SemanticText("semantic_content")
    ))
);

await client.BulkAsync("my_semantic_vectors", b => b
    .IndexMany(new[]
    {
        new { content = "Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano." },
        new { content = "Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees." },
        new { content = "Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing." },
    })
);
`,
  ruby: `require 'elasticsearch'

client = Elasticsearch::Client.new(
  url: 'https://your-elasticsearch-url',
  api_key: 'YOUR_API_KEY'
)

client.indices.create(
  index: 'my_semantic_vectors',
  body: {
    mappings: {
      properties: {
        content: { type: 'text', copy_to: 'semantic_content' },
        semantic_content: { type: 'semantic_text' }
      }
    }
  }
)

client.bulk(
  index: 'my_semantic_vectors',
  body: [
    { index: { data: { content: 'Yellowstone National Park spans Wyoming, Montana, and Idaho, covering over 2.2 million acres. It is famous for the geyser Old Faithful and sits atop the Yellowstone Caldera, a supervolcano.' } } },
    { index: { data: { content: 'Yosemite National Park covers over 750,000 acres in California. A UNESCO World Heritage Site, it is best known for its granite cliffs, waterfalls, and giant sequoia trees.' } } },
    { index: { data: { content: 'Rocky Mountain National Park is known for its mountainous terrain, including Longs Peak, the highest in the park. It is a popular destination for hiking, camping, and wildlife viewing.' } } }
  ]
)
`,
};

export const GENERATE_VECTORS_SEARCH_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

result = client.search(
    index="my_semantic_vectors",
    query={"match": {"semantic_content": "What is a good national park for backpacking?"}},
)
print(result["hits"]["hits"])
`,
  javascript: `import { Client } from "@elastic/elasticsearch";

const client = new Client({
  node: "https://your-elasticsearch-url",
  auth: { apiKey: "YOUR_API_KEY" },
});

const result = await client.search({
  index: "my_semantic_vectors",
  query: { match: { semantic_content: "What is a good national park for backpacking?" } },
});
console.log(result.hits.hits);
`,
  java: `import co.elastic.clients.elasticsearch.ElasticsearchClient;
import co.elastic.clients.elasticsearch.core.SearchResponse;
import co.elastic.clients.json.JsonData;

import java.io.IOException;

public class SemanticSearch {

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient client = ElasticsearchClient.of(e -> e.host("https://your-elasticsearch-url").apiKey("YOUR_API_KEY"))) {

            SearchResponse<JsonData> result = client.search(s -> s
                .index("my_semantic_vectors")
                .query(q -> q
                    .match(m -> m.field("semantic_content").query("What is a good national park for backpacking?"))
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
		Index("my_semantic_vectors").
		Query(esdsl.NewMatchQuery(
			"semantic_content",
			"What is a good national park for backpacking?",
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
  rust: `use elasticsearch::{Elasticsearch, SearchParts, auth::Credentials, http::transport::Transport};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let creds = Credentials::EncodedApiKey("YOUR_API_KEY".into());
    let transport = Transport::single_node("https://your-elasticsearch-url")?
        .clone_with_auth(Some(creds));
    let client = Elasticsearch::new(transport);

    let response = client.search(SearchParts::Index(&["my_semantic_vectors"]))
        .body(json!({
            "query": { "match": { "semantic_content": "What is a good national park for backpacking?" } }
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
    .Indices("my_semantic_vectors")
    .Query(q => q.Match(m => m
        .Field("semantic_content")
        .Query("What is a good national park for backpacking?")
    ))
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
  index: 'my_semantic_vectors',
  body: { query: { match: { semantic_content: 'What is a good national park for backpacking?' } } }
)
puts result['hits']['hits']
`,
};

export const GENERATE_VECTORS_SEARCH_HYBRID_SNIPPETS: SnippetSet = {
  python: `from elasticsearch import Elasticsearch

client = Elasticsearch(
    "https://your-elasticsearch-url",
    api_key="YOUR_API_KEY",
)

result = client.search(
    index="my_semantic_vectors",
    retriever={
        "linear": {
            "query": "What is a good national park for backpacking?",
            "fields": ["content", "semantic_content"],
            "normalizer": "minmax",
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
  index: "my_semantic_vectors",
  retriever: {
    linear: {
      query: "What is a good national park for backpacking?",
      fields: ["content", "semantic_content"],
      normalizer: "minmax",
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

public class HybridSearchFixed {

    public static void main(String[] args) throws IOException {

        try (ElasticsearchClient client = ElasticsearchClient.of(e -> e.host("https://your-elasticsearch-url").apiKey("YOUR_API_KEY"))) {

            SearchResponse<JsonData> result = client.search(s -> s
                .index("my_semantic_vectors")
                .retriever(r -> r
                    .linear(l -> l
                        .query("What is a good national park for backpacking?")
                        .fields("content", "semantic_content")
                        .normalizer(ScoreNormalizer.Minmax)
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
		Index("my_semantic_vectors").
		Retriever(esdsl.NewLinearRetriever().
			Query("What is a good national park for backpacking?").
			Fields("content", "semantic_content").
			Normalizer(scorenormalizer.Minmax)).
		Do(ctx)
	if err != nil {
		log.Fatalf("search failed: %s", err)
	}

	for _, hit := range response.Hits.Hits {
		fmt.Println(*hit.Score_, string(hit.Source_))
	}
}
`,
  rust: `use elasticsearch::{Elasticsearch, SearchParts, auth::Credentials, http::transport::Transport};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let creds = Credentials::EncodedApiKey("YOUR_API_KEY".into());
    let transport = Transport::single_node("https://your-elasticsearch-url")?
        .clone_with_auth(Some(creds));
    let client = Elasticsearch::new(transport);

    let response = client.search(SearchParts::Index(&["my_semantic_vectors"]))
        .body(json!({
            "retriever": {
                "linear": {
                    "query": "What is a good national park for backpacking?",
                    "fields": ["content", "semantic_content"],
                    "normalizer": "minmax"
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
using Elastic.Transport;

var settings = new ElasticsearchClientSettings(new Uri("https://your-elasticsearch-url"))
    .Authentication(new ApiKey("YOUR_API_KEY"));
var client = new ElasticsearchClient(settings);

var response = await client.SearchAsync<object>(s => s
    .Indices("my_semantic_vectors")
    .Retriever(r => r
        .Linear(l => l
            .Query("What is a good national park for backpacking?")
            .Fields("content", "semantic_content")
            .Normalizer(ScoreNormalizer.Minmax)
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
  index: 'my_semantic_vectors',
  body: {
    retriever: {
      linear: {
        query: 'What is a good national park for backpacking?',
        fields: ['content', 'semantic_content'],
        normalizer: 'minmax'
      }
    }
  }
)
puts result['hits']['hits']
`,
};
