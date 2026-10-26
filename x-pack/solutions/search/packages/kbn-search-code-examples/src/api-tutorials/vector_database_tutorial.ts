/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const vectorDatabaseTutorialCommands: string = `
# ===============================================
# 🚀 Elasticsearch Vector Database Tutorial
# ===============================================

# Vector databases are the storage and retrieval layer behind AI applications like chatbots, RAG pipelines, and recommendation engines. They also enable semantic search, which matches on meaning rather than exact words. The core idea: convert text into numerical vectors (embeddings) that capture semantic meaning, then find the closest matches.

# Elasticsearch is a high performance, efficient vector database that lets you generate emeddings automatically via Elastic Inference Service (EIS).
# We natively provide state of the art Jina embedding and reranking models via EIS, unlocking multilingual model supporting 30+ languages with no external API key or infrastructure. You index plain text and Elasticsearch handles the rest.
# Alternatively, bring your own embeddings (from OpenAI, Cohere, etc.).

# ───────────────────────────────────────────────

# This tutorial uses sample national parks data so you can explore the APIs without needing your own data. The patterns, field types, and query structures shown are the same ones you'd use in production.

# Choose the path that fits your situation:

# 🎯 PATH A — Let Elastic generate embeddings for you
#   ✓ You index plain text sample data. Elastic converts it to vectors and stores them.
#   ✓ No external AI service, no API key, no extra code.

# 🎯 PATH B — You generate embeddings outside Elasticsearch (for existing external pipelines)
#   ✓ You already use OpenAI, Cohere, or a custom model running outside Elasticsearch.
#   ➡️ Scroll to: PATH B below (Steps B1-B9)

# Not sure? Start with Path A.


# ╔═══════════════════════════════════════════╗
#   PATH A — Elastic generated embeddings
# ╚═══════════════════════════════════════════╝

# After selecting a command, execute it by clicking the ▶️ button or pressing Ctrl+Enter or Cmd+Enter.

# ===============================================
# PATH A — PART 1: CREATING AN INDEX
# ===============================================

# -----------------------------------------------
# 📦 Step A1: Create your index
# -----------------------------------------------
# An index is where your documents live in Elasticsearch. Before indexing documents, you define a mapping (a schema that declares each field and its type). The field type controls how Elasticsearch stores and searches the data, so choosing the right type is very important.

# Create your index with mappings for each field:

# ⚠️ NOTE — the embedding model matters in production
# This tutorial uses Elasticsearch's default inference model. Before going live, verify it fits your use case:
#   📖 https://elastic.co/docs/explore-analyze/elastic-inference/eis

PUT /kibana_sample_data_vectordb
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text" // Full-text search via BM25. Matches individual words: "Canyon" finds "Grand Canyon National Park".
      },
      "semantic_content": {
        "type": "semantic_text" // Stores text and auto-generates vector embeddings. Enables search by meaning, not just keywords.
        // To use a specific model instead of Elastic's default add:
        // "inference_id": ".your-model-endpoint-id"
      },
      "content": {
        "type": "text", // Full-text search via BM25, like "title".
        "copy_to": "semantic_content" // Copies content into the semantic_content field so embeddings are generated automatically.
      },
      "source": {
        "type": "keyword" // Exact-match only. Designed for filtering and aggregations (e.g. source="national-parks"), not full-text search.
      }
    }
  }
}

# ✅ You should see {"acknowledged": true}.

# Seeing "resource_already_exists_exception"? The index already exists.
# Run the DELETE below and repeat Step A1.

DELETE /kibana_sample_data_vectordb

# -----------------------------------------------
# 💡 Good to know - Adding new fields to a mapping
# -----------------------------------------------
# You can add new fields at any time with a PUT mapping request. Elasticsearch adds them without touching existing docs.

PUT /kibana_sample_data_vectordb/_mapping
{
  "properties": {
    "subtitle": {
      "type": "text"
    }
  }
}

# ⚠️ NOTE — Changing an existing field's type requires reindexing. You'd need to create a new index with the updated mapping, reimport your documents, then swap. Getting field types right upfront matters. The mapping in this tutorial is already correct, but keep this in mind for your own data.


# ===============================================
# PATH A — PART 2: INDEX YOUR DOCUMENTS
# ===============================================

# -----------------------------------------------
# 📄 Step A2: Index your documents
# -----------------------------------------------
# Index 5 sample documents. No embedding code needed: 'content' copies into 'semantic_content', so Elasticsearch generates and stores vectors automatically.

# The bulk API indexes multiple documents in one request, with two lines per document:
#   Line 1 (metadata):  {"index": {"_index": "kibana_sample_data_vectordb"}}
#   Line 2 (document):  {"title": "Yellowstone", "content": "...", "source": "national-parks"}

# ⏳ 503 or model error on first run? Wait 10-15 seconds and retry.
# If the model hasn't loaded yet, it needs a moment to start (cold start). In production with regular traffic, the model stays loaded.

# "?refresh=wait_for" blocks until the documents are searchable. Remove it in production to avoid slowing down bulk indexing.

POST /_bulk?refresh=wait_for
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Yellowstone National Park", "content": "Yellowstone National Park is one of the largest national parks in the United States. It ranges from Wyoming to Montana and Idaho, and contains an area of 2,219,791 acres. It's most famous for hosting the geyser Old Faithful and is centered on the Yellowstone Caldera, the largest super volcano on the American continent. Yellowstone is host to hundreds of species of animal, many of which are endangered or threatened.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Yosemite National Park", "content": "Yosemite National Park covers over 750,000 acres of land in California. The park is best known for its granite cliffs, waterfalls and giant sequoia trees. Its most famous cliff, El Capitan, rises about 3,000 feet from Yosemite Valley. It is home to a diverse range of wildlife, including mule deer, black bears, and the endangered Sierra Nevada bighorn sheep. The park has 1,200 square miles of wilderness and is a popular destination for rock climbers.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Rocky Mountain National Park", "content": "Rocky Mountain National Park receives over 4.5 million visitors annually and is known for its mountainous terrain, including Longs Peak. The park is home to elk, mule deer, moose, and bighorn sheep. It contains montane, subalpine, and alpine tundra ecosystems and is a popular destination for hiking, camping, and wildlife viewing.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Grand Canyon National Park", "content": "The Grand Canyon is a steep-sided canyon carved by the Colorado River in Arizona. It is 277 miles long, up to 18 miles wide and attains a depth of over a mile. The park receives nearly six million visitors per year and offers hiking, rafting, and helicopter tours. It is one of the Seven Natural Wonders of the World.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Zion National Park", "content": "Zion National Park is located in southwestern Utah and is known for its steep red cliffs and narrow canyons. The Virgin River runs through the main canyon. The park is famous for the Angels Landing and Narrows hikes, and receives over four million visitors annually. Wildlife includes mule deer, mountain lions, and California condors.", "source": "national-parks"}

# ✅ You should see: {"errors": false, "took": ..., "items": [...]}
# "errors": false means all 5 documents indexed successfully.

# If "errors": true, inspect the "items" array for details. To start fresh, run the DELETE request, then re-run Steps A1 and A2.

DELETE /kibana_sample_data_vectordb


# ===============================================
# PATH A — PART 3: SEARCH YOUR DATA
# ===============================================

# -----------------------------------------------
# 🔍 Step A3: Semantic-only search — demonstration step
# -----------------------------------------------
# This step has two examples that show what semantic search does well and where it falls short. The contrast sets up why hybrid search (Step A4) is the better default.

# QUERY 1 - where semantic shines:
# "volcanic activity" doesn't appear anywhere in our data, but Yellowstone's content mentions "Yellowstone Caldera", "super volcano", and "geyser". Semantic search finds it by meaning when keyword search wouldn't.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "standard": {
      "query": {
        "semantic": {
          "field": "semantic_content",
          "query": "volcanic activity"
        }
      }
    }
  }
}

# ✅ Yellowstone should rank first. Zero shared words, pure meaning match.

# 📋 Reading the response: your results are in hits.hits[]. The top result is first. Each hit has a _score (higher = better match) and _source (the original document you indexed).

# QUERY 2 - where semantic falls short:
# "Arizona" is mentioned by name in Grand Canyon's content. Semantic search may not rank Grand Canyon first because it looks for meaning-similarity, not exact word matches. A proper noun with no surrounding context is hard for a semantic model to anchor. Keyword search (BM25) would find it immediately.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "standard": {
      "query": {
        "semantic": {
          "field": "semantic_content",
          "query": "Arizona"
        }
      }
    }
  }
}

# ✅ Check whether Grand Canyon ranked first. If it didn't, that's the point.

# Semantic search trades exact-match precision for meaning-based recall. Step A4 fixes this by combining both.

# -----------------------------------------------
# ⚡ Step A4: Hybrid search — keyword + semantic combined
# -----------------------------------------------
# This is the query pattern you should use as your default in production. It runs both a keyword retriever (BM25) and a semantic retriever, then merges results using RRF (Reciprocal Rank Fusion).

# Run the same "Arizona" query from Step A3, but as hybrid. BM25 finds the exact words in Grand Canyon's content. Semantic adds context. RRF fuses both rankings. Grand Canyon should now rank first.

# Hybrid also handles the "volcanic activity" case from Step A3: semantic finds Yellowstone via meaning, BM25 contributes where there are exact title matches.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "match": {
                "content": "Arizona"
                // BM25: finds documents where the content contains these exact words
              }
            }
          }
        },
        {
          "standard": {
            "query": {
              "semantic": {
                "field": "semantic_content",
                "query": "Arizona"
                // Semantic: finds documents whose meaning is closest to this word
              }
            }
          }
        }
      ],
      "rank_window_size": 50, // How many candidates from each retriever to consider before fusion
      "rank_constant": 20 // Lower values favor top-ranked results more aggressively. Higher values weight ranks more equally.
    }
  }
}

# ✅ Grand Canyon should now rank first.

# BM25 caught "Arizona" directly. Semantic reinforced it with meaning-based context.
# RRF fused both rankings into one.
# 📖 https://elastic.co/docs/solutions/search/ranking/reciprocal-rank-fusion


# -----------------------------------------------
# 🔒 Step A5: Add a filter to the hybrid search
# -----------------------------------------------
# Filters restrict which documents are searched without affecting relevance scores. Use this for access control, tenant isolation, or category filtering.

# Example real-world uses:
#   👤 filter by user_id → each user only searches their own documents
#   🏢 filter by org_id → multi-tenant SaaS, each company sees only their data
#   🏷️ filter by category → search only within a specific section of your content

# First, index a document with source "state-park" so we can verify the filter (source: "national-parks") excludes it from results.

POST /_bulk?refresh=wait_for
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Harriman State Park", "content": "Harriman State Park is one of the largest state parks in New York, covering approximately 47,000 acres in the Hudson Valley region. The park features over 200 miles of hiking trails, 31 lakes and reservoirs, and stunning views of the surrounding landscape. It is home to white-tailed deer, black bears, wild turkeys, and a variety of bird species. Popular activities include hiking, fishing, swimming, and cross-country skiing in winter. The park also contains several historic sites, including old iron mines and the remains of early 20th century villages.", "source": "state-park"}

# Apply the same filter to both retrievers so they search the same subset.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "bool": {
                "must": { "match": { "content": "hiking" } },
                // must: full-text match that scores documents by relevance to the query term
                "filter": { "term": { "source": "national-parks" } }
                // filter: only search documents where source equals "national-parks"
              }
            }
          }
        },
        {
          "standard": {
            "query": {
              "bool": {
                "must": {
                  "semantic": {
                    "field": "semantic_content",
                    "query": "hiking"
                  }
                },
                "filter": { "term": { "source": "national-parks" } }
                // Apply the same filter to the semantic retriever too
              }
            }
          }
        }
      ],
      "rank_window_size": 50
    }
  }
}

# ✅ Only documents with source="national-parks" appear in results.


# ===============================================
# PATH A — PART 4: RETRIEVE CONTEXT FOR RAG
# ===============================================

# For use in your application.

# -----------------------------------------------
# 🤖 Step A6: Retrieve chunks for a RAG pipeline
# -----------------------------------------------
# RAG (Retrieval-Augmented Generation) is a pattern where you:
#   1. Search your data for relevant documents (this step)
#   2. Pass those documents as context to an LLM (e.g. ChatGPT, Claude)
#   3. The LLM answers the user's question based on that context

# This query is designed for step 1 in the RAG pattern. It returns only the top 3 most relevant documents and only the fields your LLM needs (title and content).

# Fewer fields = fewer tokens = cheaper LLM calls.

GET /kibana_sample_data_vectordb/_search
{
  "size": 3, // Return only the top 3 results
  "_source": ["title", "content"], // Only return these fields — omit vectors and metadata
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "match": { "content": "best park for wildlife" }
            }
          }
        },
        {
          "standard": {
            "query": {
              "semantic": {
                "field": "semantic_content",
                "query": "best park for wildlife"
              }
            }
          }
        }
      ],
      "rank_window_size": 50
    }
  }
}

# ✅ The 3 results feed directly into your LLM prompt as context.

# Your application code might look like:

# chunks = [hit["_source"]["content"] for hit in response["hits"]["hits"]]
# prompt = f"Answer based on this context: {chunks} Question: {user_question}"

# To connect with popular AI frameworks:
#   📖 LangChain (Python): https://elastic.co/search-labs/integrations/langchain
#   📖 LlamaIndex (Python): https://elastic.co/search-labs/integrations/llama-index


# ===============================================
# PATH A — CLEANUP (optional)
# ===============================================

# -----------------------------------------------
# 🧹 Step A7: Delete the index
# -----------------------------------------------
# This step removes the sample index and everything in it.
# Warning: this permanently deletes all 6 documents. Cannot be undone.

DELETE /kibana_sample_data_vectordb

# ✅ You should see: {"acknowledged": true}

# -----------------------------------------------

# Path A complete.

# What you built: a semantic retrieval layer using zero lines of embedding code.
# What Elastic handled: model selection, vector generation, storage, query-time embedding, and automatic chunking of long documents.

# When you're ready to go deeper:
#   - Add reranking: a second AI pass that re-orders top results for higher precision
#     📖 https://elastic.co/docs/solutions/search/ranking/semantic-reranking
#   - Connect to LangChain for full RAG pipelines
#     📖 https://elastic.co/search-labs/integrations/langchain

# -----------------------------------------------


# ╔═══════════════════════════════════════════╗
#   PATH B — Bring Your Own Embeddings
# ╚═══════════════════════════════════════════╝

# Run each step by clicking ▶️ or pressing Ctrl+Enter / Cmd+Enter

# Use this path if you already generate vectors outside of Elasticsearch, for example by calling OpenAI's embeddings API, Cohere, or a custom model on your own infrastructure.

# The key difference from Path A: instead of semantic_text (which handles everything), you use a dense_vector field and are responsible for generating vectors yourself, both at ingest time and at query time.

# ⚠️ The most important rule in this path (read before starting) ⚠️

#   You must use the SAME model at ingest time and at query time. If you index documents with OpenAI's text-embedding-3-small, you must also embed queries with text-embedding-3-small. Mixing models produces meaningless results because documents and queries would be in different vector spaces. Changing models later requires re-embedding and reindexing every document. Choose carefully before indexing real data at scale.


# ===============================================
# PATH B — PART 1: CONNECT TO YOUR EXTERNAL EMBEDDING MODEL
# ===============================================

# -----------------------------------------------
# 🔌 Step B1: Register your external embedding model with Elasticsearch
# -----------------------------------------------
# This step creates a named connection (an "inference endpoint") to the model that generates your vectors. You reference this name ("my-embedding-endpoint") in later steps whenever Elasticsearch needs to embed a query at search time.

# Use OpenAI or another external provider (Cohere, Azure OpenAI, etc.):

PUT /_inference/text_embedding/my-embedding-endpoint
{
  "service": "openai",
  "service_settings": {
    "api_key": "YOUR_OPENAI_API_KEY", // ⚠️ Replace with your actual key
    "model_id": "text-embedding-3-small" // Model ID from OpenAI or your chosen provider
    // text-embedding-3-small outputs 1536-dimensional vectors
    // You'll need to set dims: 1536 in Step B2
  }
}

# ✅ You should see an object with "inference_id": "my-embedding-endpoint"
# The "inference_id" is what you'll reference in later steps.

# Other supported providers: Cohere, Azure OpenAI, Amazon Bedrock, Google Vertex
# 📖 https://elastic.co/docs/explore-analyze/elastic-inference


# ===============================================
# PATH B — PART 2: CREATE YOUR INDEX
# ===============================================

# -----------------------------------------------
# 📦 Step B2: Create the index
# -----------------------------------------------
# Same concept as Step A1, but the mapping is different. Instead of semantic_text (which hides vectors inside a single field), you declare a separate dense_vector field that stores the raw numbers.

# You control the dimensions, similarity function, and compression level.

# The 'dims' value must exactly match your model's output size. This is the most common mistake in Path B and requires a full reindex to fix.

# Model dimension reference:
#   - Jina v3 (default in PATH A): 1024 (also supports 256 or 512 via Matryoshka)
#   - OpenAI text-embedding-3-small: 1536
#   - OpenAI text-embedding-3-large: 3072
#   - Cohere embed-v3: 1024
#   - E5-small: 384

PUT /kibana_sample_data_vectordb_byoe
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text" // Full-text search via BM25.
      },
      "content": {
        "type": "text" // Stored for display and BM25 search. Embeddings are stored separately.
      },
      "content_embedding": {
        "type": "dense_vector", // Stores the raw vector (list of numbers) from your embedding model.
        "dims": 1536, // ⚠️ Must exactly match your model's output size. Wrong dims = full reindex to fix.
        "index": true, // Required for kNN search. Without this, vectors are stored but not searchable.
        "similarity": "cosine", // How Elasticsearch measures closeness between vectors. Cosine is the most common choice.
        "index_options": {
          "type": "int8_hnsw" // Compressed index type for ~4x memory savings. Use 'hnsw' for maximum accuracy.
        }
      },
      "source": {
        "type": "keyword" // Exact-match only. Used for filtering, e.g. tenant ID, category, document source.
      }
    }
  }
}

# ✅ You should see: {"acknowledged": true, "shards_acknowledged": true}

# Unlike Path A, this index stores text and vectors as separate fields.
# You are responsible for keeping them in sync.
# 📖 https://elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector


# ===============================================
# PATH B — PART 3: SET UP EMBEDDING AT INGEST TIME
# ===============================================

# ⚡ Prefer to generate embeddings in your own code? Skip Parts 3 and 4, go to Step B5.

# -----------------------------------------------
# ⚙️ Step B3: Create an ingest pipeline that auto-generates vectors
# -----------------------------------------------
# This step creates a reusable pipeline that runs on every document before it's stored. The pipeline calls the inference endpoint from Step B1, generates the vector from 'content', and writes it to 'content_embedding' before saving.

# Your application sends plain text. The pipeline generates and stores the embedding.
# This keeps embedding logic out of your application code.

# If you'd rather generate vectors in your application, skip Steps B3 and B4 and go to Step B5.

PUT /_ingest/pipeline/embedding-pipeline
{
  "description": "Generate embeddings for the content field before indexing",
  "processors": [
    {
      "inference": {
        "model_id": "my-embedding-endpoint", // The inference endpoint from Step B1
        "input_output": [
          {
            "input_field": "content", // Read text from this field
            "output_field": "content_embedding" // Write the vector to this field
          }
        ]
      }
    }
  ]
}

# ✅ You should see: {"acknowledged": true}
# The pipeline is now available for indexing.


# ===============================================
# PATH B — PART 4: INDEX YOUR DOCUMENTS (VIA PIPELINE)
# ===============================================

# -----------------------------------------------
# 📄 Step B4: Index your documents (pipeline generates embeddings automatically)
# -----------------------------------------------
# By passing "?pipeline=embedding-pipeline", each document is routed through the pipeline before storage. The pipeline calls the inference endpoint, generates the vector from 'content', and writes it to 'content_embedding'. You send text; Elasticsearch stores both.

# ⏳ Model error on first run? Wait 10-15 seconds and retry.

# ?pipeline=embedding-pipeline → route each document through the pipeline
# ?refresh=wait_for → wait until searchable before returning (same as Step A2)

POST /_bulk?pipeline=embedding-pipeline&refresh=wait_for
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Yellowstone National Park", "content": "Yellowstone National Park is one of the largest national parks in the United States. It ranges from Wyoming to Montana and Idaho, and contains an area of 2,219,791 acres. It's most famous for hosting the geyser Old Faithful and is centered on the Yellowstone Caldera, the largest super volcano on the American continent. Yellowstone is host to hundreds of species of animal, many of which are endangered or threatened.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Yosemite National Park", "content": "Yosemite National Park covers over 750,000 acres of land in California. The park is best known for its granite cliffs, waterfalls and giant sequoia trees. Its most famous cliff, El Capitan, rises about 3,000 feet from Yosemite Valley. It is home to a diverse range of wildlife, including mule deer, black bears, and the endangered Sierra Nevada bighorn sheep. The park has 1,200 square miles of wilderness and is a popular destination for rock climbers.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Rocky Mountain National Park", "content": "Rocky Mountain National Park receives over 4.5 million visitors annually and is known for its mountainous terrain, including Longs Peak. The park is home to elk, mule deer, moose, and bighorn sheep. It contains montane, subalpine, and alpine tundra ecosystems and is a popular destination for hiking, camping, and wildlife viewing.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Grand Canyon National Park", "content": "The Grand Canyon is a steep-sided canyon carved by the Colorado River in Arizona. It is 277 miles long, up to 18 miles wide and attains a depth of over a mile. The park receives nearly six million visitors per year and offers hiking, rafting, and helicopter tours. It is one of the Seven Natural Wonders of the World.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Zion National Park", "content": "Zion National Park is located in southwestern Utah and is known for its steep red cliffs and narrow canyons. The Virgin River runs through the main canyon. The park is famous for the Angels Landing and Narrows hikes, and receives over four million visitors annually. Wildlife includes mule deer, mountain lions, and California condors.", "source": "national-parks"}


# ✅ You should see: {"errors": false, "took": ..., "items": [...]}
# "errors": false confirms all documents were embedded and indexed.


# ===============================================
# PATH B — PART 5: APP-SIDE EMBEDDING (ALTERNATIVE TO PARTS 3-4)
# ===============================================

# -----------------------------------------------
# 💻 Step B5: Index your documents (your app generates embeddings)
# -----------------------------------------------
# Use this if you generate vectors in your application before sending them to Elasticsearch. Some teams prefer this for full control over batching, retries, or preprocessing.

# ⚠️ Reminder: use the same model here as in Step B1.

#╭─────────────────── Python example ────────────────────╮
#           (run in your app, not in this console)
#
#  from elasticsearch import Elasticsearch, helpers
#  import openai
#
#  es = Elasticsearch("https://your-cluster:443", api_key="YOUR_API_KEY")
#  client = openai.OpenAI()
#
#  def embed(text):
#      # Calls OpenAI to convert text to a list of 1536 numbers
#      return client.embeddings.create(
#          model="text-embedding-3-small", input=text
#      ).data[0].embedding
#
#  helpers.bulk(es, [
#      {
#          "_index": "kibana_sample_data_vectordb_byoe",
#          "_source": {
#              "title": "Yellowstone National Park",
#              "content": "Yellowstone is famous for Old Faithful...",
#              "content_embedding": embed("Yellowstone..."),
#              # Pass the pre-computed vector directly — Elasticsearch stores it as-is
#              "source": "national-parks"
#          }
#      }
#  ])
#
# ╰───────────────────────────────────────────────────────╯

# ⚠️ At query time (Step B6), you must also call embed() on the user's query before passing it to Elasticsearch. The query vector must use the same model.


# ===============================================
# PATH B — PART 6: SEARCH YOUR DATA
# ===============================================

# -----------------------------------------------
# 🔍 Step B6: Run your first vector search
# -----------------------------------------------
# This step searches using kNN (k-nearest neighbors), finding the k documents whose vectors are closest in meaning to your query. "query_vector_builder" tells Elasticsearch to call the inference endpoint to embed the search string at query time.

# num_candidates: how many candidates to evaluate per shard before returning top k. Higher = better recall but slower. Start at 50 to 100.

GET /kibana_sample_data_vectordb_byoe/_search
{
  "retriever": {
    "knn": {
      "field": "content_embedding", // The dense_vector field to search
      "query_vector_builder": {
        "text_embedding": {
          "model_id": "my-embedding-endpoint", // Calls this endpoint to embed the query
          "model_text": "volcanic activity"
        }
      },
      "k": 3, // Return the top 3 most similar documents
      "num_candidates": 50 // Evaluate 50 candidates per shard — increase for better recall
    }
  }
}

# ✅ Results ranked by vector similarity. Higher "_score" = closer meaning match.

# -----------------------------------------------
# ⚡ Step B7: Run a hybrid search — the recommended default
# -----------------------------------------------
# This step combines kNN (meaning-based) with BM25 (keyword-based) via RRF. Same idea as Step A4, different retrievers.

# This should be your default query pattern — it outperforms either method alone.

GET /kibana_sample_data_vectordb_byoe/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "match": {
                "content": "mountain wildlife"
                // BM25: keyword matching on the content field
              }
            }
          }
        },
        {
          "knn": {
            "field": "content_embedding",
            "query_vector_builder": {
              "text_embedding": {
                "model_id": "my-embedding-endpoint",
                "model_text": "mountain wildlife"
                // Vector search: meaning-based matching on the content embedding
              }
            },
            "k": 10,
            "num_candidates": 50
          }
        }
      ],
      "rank_window_size": 50, // Candidates from each retriever before RRF fusion
      "rank_constant": 20
    }
  }
}

# ✅ Combined keyword + vector results, fused by RRF.
# 📖 https://elastic.co/docs/solutions/search/ranking/reciprocal-rank-fusion

# -----------------------------------------------
# 🔒 Step B8: Add a filter to the hybrid search
# -----------------------------------------------
# This step restricts which documents are searched, same concept as Step A5.

# First, index a document with source "state-park" to verify the filter (source: "national-parks") excludes it from results.

POST /_bulk?pipeline=embedding-pipeline&refresh=wait_for
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Harriman State Park", "content": "Harriman State Park is one of the largest state parks in New York, covering approximately 47,000 acres in the Hudson Valley region. The park features over 200 miles of hiking trails, 31 lakes and reservoirs, and stunning views of the surrounding landscape. It is home to white-tailed deer, black bears, wild turkeys, and a variety of bird species. Popular activities include hiking, fishing, swimming, and cross-country skiing in winter. The park also contains several historic sites, including old iron mines and the remains of early 20th century villages.", "source": "state-park"}

# Apply the filter to both the BM25 and kNN retrievers. If you only apply it to one, the other searches the full index.

GET /kibana_sample_data_vectordb_byoe/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "bool": {
                "must": { "match": { "content": "rock climbing" } },
                "filter": { "term": { "source": "national-parks" } }
              }
            }
          }
        },
        {
          "knn": {
            "field": "content_embedding",
            "query_vector_builder": {
              "text_embedding": {
                "model_id": "my-embedding-endpoint",
                "model_text": "rock climbing destinations"
              }
            },
            "k": 10,
            "num_candidates": 50,
            "filter": { "term": { "source": "national-parks" } }
          }
        }
      ],
      "rank_window_size": 50
    }
  }
}

# ✅ Only documents with source="national-parks" appear in results.


# ===============================================
# PATH B — PART 7: PREPARE FOR PRODUCTION ⚠️
# ===============================================

# -----------------------------------------------
# 🏷️ Step B9: Create an alias and verify your mapping
# -----------------------------------------------
# This step does two things before you go to production:

# First: create an alias — a pointer to your index.
# Your application queries the alias name ("vectordb-current"), never the raw index name. This matters because changing your embedding model later means re-embedding all documents into a new index, then swapping the alias. With an alias, your application code never changes. Without one, every model upgrade requires a code deployment.

# Second: verify the mapping looks correct.
# Specifically check that 'dims' matches your model's output. Find out now, not after you've indexed production data.

# The reindex-on-model-change flow:
#   1. Create index_v2 with the new model's dims
#   2. Re-embed and reindex all documents into index_v2
#   3. POST /_aliases: swap alias from v1 to v2 (atomic, zero downtime)
#   4. Delete index_v1

PUT /kibana_sample_data_vectordb_byoe/_alias/vectordb-current

# ✅ You should see: {"acknowledged": true}

# Your app should now reference "vectordb-current" instead of the full index name.
# 📖 https://elastic.co/docs/manage-data/data-store/aliases

# Verify your index looks correct before going to production:

GET /kibana_sample_data_vectordb_byoe/_mapping

# ✅ Confirm 'content_embedding' shows:
#   "type": "dense_vector"
#   "dims": 1536 (or whatever your model outputs)
#   "index": true

# If dims is wrong, delete the index and start from Step B2 with the correct value.


# ===============================================
# PATH B — CLEANUP (optional)
# ===============================================

# 🧹 Step B10: Delete all resources created in this tutorial
# Warning: deleting the index permanently removes all stored documents and vectors.

DELETE /kibana_sample_data_vectordb_byoe

DELETE /_ingest/pipeline/embedding-pipeline

DELETE /_inference/text_embedding/my-embedding-endpoint

# ✅ You should see: {"acknowledged": true} for each deletion.

# -----------------------------------------------

# Path B complete.

# What you built: a vector database with full control over the embedding model.

# Key things to remember:
#   - Same model at ingest time AND query time — always
#   - dims must match your model's output size — check before indexing real data
#   - Create the alias before indexing production data — model changes require reindex
#   - Hybrid search (kNN + BM25 via RRF) is the default — don't use vector-only

# When you're ready to improve search quality:
#   - Reranking: a second AI pass on the top results for higher precision
#     📖 https://elastic.co/docs/solutions/search/ranking/semantic-reranking
#   - _rank_eval: measure your search quality objectively with labeled test queries
#     📖 https://elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval

# -----------------------------------------------
`;
