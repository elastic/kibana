/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const vectorDatabaseTutorialCommands: string = `
# ===============================================
# Elasticsearch Vector DB Tutorial
# ===============================================

# Vector databases are the storage and retrieval layer behind most modern AI
# applications: custom chatbots, LLMs that need context from your data, and
# recommendation engines ("you might also like"). They're also the foundation
# of semantic and vector search — search that understands the meaning behind a query,
# not just the exact words. All of these rely on the same core idea: convert text
# into numbers that capture meaning, then find the closest matches.

# Elasticsearch is a vector database — and it has a superpower dedicated
# vector databases don't: you can bring your own embeddings (vectors you generate
# with OpenAI, Cohere, or any model), OR you can let Elasticsearch generate them
# for you using its built-in models via Elastic Inference Service (EIS).

# ─────────────────────────────────────────────
# To build any of these experiences, you'll need to index documents
# into Elasticsearch.
# This tutorial uses sample national parks data so you can explore the APIs without
# needing your own data yet. However, the patterns, field types, and query structures
# shown are the same ones you'd use in production — not simplified for demo purposes.

# This tutorial covers both approaches below — choose the one
# that fits your situation:

# PATH A — Let Elastic generate embeddings for you
# ✓ You index plain text. Elastic converts it to vectors and stores them.
# ✓ No external AI service, no API key, no extra code to write or maintain.

# PATH B — You generate embeddings outside Elasticsearch
# (for existing external pipelines)
# ✓ You already use OpenAI, Cohere, or a custom model
# running outside of Elasticsearch.
# → Jump to: PATH B below (Steps B1–B9)

# Not sure? Start with Path A.
# ─────────────────────────────────────────────

# ╔═══════════════════════════════════════════╗
# ║ PATH A — Elastic Handles Embeddings ║
# ╚═══════════════════════════════════════════╝

# Run each step by clicking ▶️ or pressing Ctrl+Enter / Cmd+Enter

# ===============================================
# PATH A — PART 1: CREATE YOUR INDEX
# ===============================================

# -----------------------------------------------
# Step A1: Create the index
# -----------------------------------------------
# An index stores your documents in Elasticsearch. Before you insert anything,
# you define a mapping — a list of fields where each field has a type. The type
# isn't just a label: it's an instruction — see the inline examples below.

PUT /kibana_sample_data_vectordb
{
  "mappings": {
    "properties": {
      // "text" — word-searchable; "canyon" matches "Grand Canyon National Park". Use for fields users will search through.
      "title": { "type": "text" },
      // "semantic_text" — stores text AND auto-generates vector embeddings. Powers semantic and hybrid search; not BM25-searchable directly.
      "content": { "type": "semantic_text" },
      // "keyword" — exact-match only. Use for filters (e.g. source="national-parks"), not for searching words.
      "source": { "type": "keyword" }
    }
  }
}

# ✅ You should see {"acknowledged": true} — index created successfully.

# Seeing "resource_already_exists_exception"? The index already exists.
# Run the DELETE below and repeat Step A1.
DELETE /kibana_sample_data_vectordb


# Want to see the index you just created? Go to:
# Data Management → Index Management → Indices
# You should see "kibana_sample_data_vectordb" listed. Come back here when done.

# ⚠️ NOTE — the embedding model matters in production
# This tutorial uses Elasticsearch's default.
# Before going live, verify it fits your use case:
# 📖 https://www.elastic.co/docs/explore-analyze/elastic-inference/eis
# To use a specific model, see Step A2 below.

# ╔═══════════════════════════════════════════════════════════╗
# ║ OPTIONAL: Use a specific Elastic model ║
# ╚═══════════════════════════════════════════════════════════╝

# -----------------------------------------------
# Step A2: Choose your embedding model
# -----------------------------------------------
# Using the default? Skip this step entirely and go to Step A3.
# Only run this if you want to use a specific model instead of the default.
# 📖 https://www.elastic.co/docs/explore-analyze/elastic-inference/eis

# To use a specific model: create an inference endpoint and bind it via inference_id.

PUT _inference/text_embedding/my-eis-endpoint
{
  "service": "elastic",
  "service_settings": {
    "model_id": "jina-embeddings-v3" // check the docs link above for the current model list
  }
}

# Then create your index with the model bound to the semantic_text field:

PUT /my-custom-model-index
{
  "mappings": {
    "properties": {
      "title": { "type": "text" },
      "content": {
        "type": "semantic_text",
        "inference_id": "my-eis-endpoint" // ← binds this field to your chosen model
      },
      "source": { "type": "keyword" }
    }
  }
}

# ✅ Inference endpoint created. Continue to Step A3.

# -----------------------------------------------
# Step A3: Understand mapping constraints
# -----------------------------------------------
# You can add new fields to this mapping at any time — just run a PUT mapping
# request with the new field — Elasticsearch adds it without touching existing docs.

# However, changing an existing field's type is not possible in place.
# It requires reindexing: create a new index with the updated mapping, re-import
# your documents, then swap the index. This is why getting the field types right
# upfront matters. For this tutorial the mapping is already correct — this note
# is for when you adapt this pattern to your own data.


# ===============================================
# PATH A — PART 2: INDEX YOUR DOCUMENTS
# ===============================================

# -----------------------------------------------
# Step A2: Index your documents
# -----------------------------------------------
# This step stores 5 sample documents into the index you just created.
# You might expect to write embedding code here — something like calling OpenAI
# to convert each document to a vector before sending it to Elasticsearch.
# You don't need to. That's the point of Path A.

# Elasticsearch generates the vectors for you server-side, invisibly,
# as each document is stored. When you defined 'content' as type semantic_text
# in Step A1, you gave Elasticsearch standing instructions: "whenever a document
# arrives with a field of type semantic_text, call the built-in embedding model,
# convert the text to a vector, and store both the text and the vector."
# The vectors are there — you just didn't have to write any code to create them.

# So you send plain text. Elasticsearch stores the text AND the vector.
# No embedding API call in your code. No model to manage. No extra dependencies.

# We use the bulk API to store multiple documents in one request.
# The bulk format alternates two lines per document — it looks odd at first:
# Line 1: metadata — tells Elasticsearch what to do and where to store it
# {"index": {"_index": "kibana_sample_data_vectordb"}}
# Line 2: the actual document content you want to store and search
# {"title": "Yellowstone", "content": "...", "source": "national-parks"}
# Every pair of lines = one document. 5 pairs below = 5 documents indexed.

# ⏳ If you get a 503 or model error on first run, wait 10–15 seconds and retry.
# This is normal — the embedding model hasn't been used yet and needs a moment
# to load into memory. This only happens on the very first request after a period
# of inactivity (called a cold start). In production with regular traffic,
# the model stays loaded and this delay disappears entirely.

# ?refresh=wait_for tells Elasticsearch to wait until the indexed documents are
# visible to search before returning a response. Without it, you might run a
# search query immediately after indexing and get zero results — because
# Elasticsearch indexes asynchronously and the documents might not be searchable yet.
# In production you'd typically remove this parameter (or use refresh=false)
# since waiting slows down bulk indexing. It's here so your search in Step A3
# works immediately after you run this step.
POST /_bulk?refresh=wait_for
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Yellowstone National Park", "content": "Yellowstone National Park is one of the largest national parks in the United States. It ranges from Wyoming to Montana and Idaho, and contains an area of 2,219,791 acres. Its most famous for hosting the geyser Old Faithful and is centered on the Yellowstone Caldera, the largest super volcano on the American continent. Yellowstone is host to hundreds of species of animal, many of which are endangered or threatened.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Yosemite National Park", "content": "Yosemite National Park covers over 750,000 acres of land in California. The park is best known for its granite cliffs, waterfalls and giant sequoia trees. It is home to a diverse range of wildlife, including mule deer, black bears, and the endangered Sierra Nevada bighorn sheep. The park has 1,200 square miles of wilderness and is a popular destination for rock climbers.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Rocky Mountain National Park", "content": "Rocky Mountain National Park receives over 4.5 million visitors annually and is known for its mountainous terrain, including Longs Peak. The park is home to elk, mule deer, moose, and bighorn sheep. It contains montane, subalpine, and alpine tundra ecosystems and is a popular destination for hiking, camping, and wildlife viewing.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Grand Canyon National Park", "content": "The Grand Canyon is a steep-sided canyon carved by the Colorado River in Arizona. It is 277 miles long, up to 18 miles wide and attains a depth of over a mile. The park receives nearly six million visitors per year and offers hiking, rafting, and helicopter tours. It is one of the Seven Natural Wonders of the World.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb" } }
{"title": "Zion National Park", "content": "Zion National Park is located in southwestern Utah and is known for its steep red cliffs and narrow canyons. The Virgin River runs through the main canyon. The park is famous for the Angels Landing and Narrows hikes, and receives over four million visitors annually. Wildlife includes mule deer, mountain lions, and California condors.", "source": "national-parks"}

# ✅ You should see: {"errors": false, "took": ..., "items": [...]}
# "errors": false means all 5 documents indexed successfully.
# If errors is true, check the "items" array for which document failed and why.
# If something looks wrong and you want to start fresh, run Step A7 (DELETE) first,
# then re-run Steps A1 and A2. Deleting the index removes everything and lets you
# start clean with a new mapping.


# ===============================================
# PATH A — PART 3: SEARCH YOUR DATA
# ===============================================

# -----------------------------------------------
# Step A3: Semantic-only search — demonstration step
# -----------------------------------------------
# This step shows what semantic search does well — and where it falls short.
# Both examples use the same search mechanism. The contrast sets up why
# hybrid search (Step A4) is the right default.

# QUERY 1 — where semantic shines:
# "volcanic activity" doesn't appear anywhere in our data. But Yellowstone's
# content mentions "Yellowstone Caldera", "super volcano", and "geyser" — all
# descriptions of the same concept. Semantic finds it. Keyword search wouldn't.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "standard": {
      "query": {
        "semantic": {
          "field": "content",
          "query": "volcanic activity"
        }
      }
    }
  }
}

# ✅ Yellowstone should rank first — zero shared words, pure meaning match.

# QUERY 2 — where semantic falls short:
# "El Capitan" is the famous cliff in Yosemite — mentioned by name in the content.
# Semantic search may not rank Yosemite first — it looks for meaning-similarity,
# not exact word matches. A proper noun with no surrounding context is hard for a
# semantic model to anchor. Keyword search (BM25) would find it immediately.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "standard": {
      "query": {
        "semantic": {
          "field": "content",
          "query": "El Capitan"
        }
      }
    }
  }
}

# ✅ Check whether Yosemite ranked first. If it didn't — that's the point.
# Semantic search trades exact-match precision for meaning-based recall.
# Step A4 fixes this by combining both.

# -----------------------------------------------
# Step A4: Hybrid search — keyword + semantic combined USE THIS IN PRODUCTION
# -----------------------------------------------
# This is the query pattern you should use as your default.
# It runs both a keyword retriever (BM25) and a semantic retriever simultaneously,
# then merges the results using RRF (Reciprocal Rank Fusion).

# Run the same "El Capitan" query from Step A3 — but this time as hybrid.
# BM25 finds the exact words in Yosemite's content. Semantic adds context.
# RRF fuses both rankings. Yosemite should now rank first — the exact-match weakness
# from Step A3 is fixed.

# Hybrid also handles the "volcanic activity" case from Step A3: semantic finds
# Yellowstone via meaning, BM25 contributes where there are exact title matches.
# You get both — that's why it's the default.

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "match": {
                "title": "El Capitan"
                // BM25: finds documents where the title contains these exact words
              }
            }
          }
        },
        {
          "standard": {
            "query": {
              "semantic": {
                "field": "content",
                "query": "El Capitan"
                // Semantic: finds documents whose meaning is closest to this phrase
              }
            }
          }
        }
      ],
      "rank_window_size": 50, // How many candidates from each retriever to consider before fusion
      "rank_constant": 20 // Controls how aggressively top-ranked results are favored
    }
  }
}

# ✅ Yosemite should now rank first — the exact-match weakness from Step A3 is fixed.
# BM25 caught "El Capitan" directly. Semantic reinforced with meaning-based context.
# RRF fused both rankings into one.
# 📖 https://www.elastic.co/docs/solutions/search/ranking/reciprocal-rank-fusion

# -----------------------------------------------
# Step A5: Add a filter to the hybrid search
# -----------------------------------------------
# This step shows how to restrict which documents are searched
# without affecting the relevance score of the results that do match.
# This is how you implement access control, tenant isolation, or category filtering.
# Apply the same filter to both retrievers so they search the same subset.

# Example real-world uses:
# filter by user_id → each user only searches their own documents
# filter by org_id → multi-tenant SaaS, each company sees only their data
# filter by category → search only within a specific section of your content

GET /kibana_sample_data_vectordb/_search
{
  "retriever": {
    "rrf": {
      "retrievers": [
        {
          "standard": {
            "query": {
              "bool": {
                "must": { "match": { "title": "wildlife" } },
                "filter": { "term": { "source": "national-parks" } }
                // filter: only search documents where source equals "national-parks"
                // This doesn't affect the score of matched documents — it just excludes others
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
                    "field": "content",
                    "query": "rock climbing destinations"
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
# PATH A — PART 4: USE THIS IN YOUR APPLICATION
# ===============================================

# -----------------------------------------------
# Step A6: Retrieve chunks for a RAG pipeline
# -----------------------------------------------
# RAG (Retrieval-Augmented Generation) is a pattern where you:
# 1. Search your data for relevant documents (this step)
# 2. Pass those documents as context to an LLM (e.g. ChatGPT, Claude)
# 3. The LLM answers the user's question based on that context

# This query is designed for step 1: return only the top 3 most relevant
# documents and only the fields your LLM needs (title and content).
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
              "match": { "title": "best park for families" }
            }
          }
        },
        {
          "standard": {
            "query": {
              "semantic": {
                "field": "content",
                "query": "best park for families with children"
              }
            }
          }
        }
      ],
      "rank_window_size": 50
    }
  }
}

# ✅ The 3 results you get back feed directly into your LLM prompt as context.
# Your application code would look like:
# chunks = [hit["_source"]["content"] for hit in response["hits"]["hits"]]
# prompt = f"Answer based on this context:\n{chunks}\n\nQuestion: {user_question}"

# To connect with popular AI frameworks:
# 📖 LangChain (Python): https://www.elastic.co/search-labs/integrations/langchain
# 📖 LlamaIndex (Python): https://www.elastic.co/search-labs/integrations/llama-index


# ===============================================
# PATH A — CLEANUP (optional)
# ===============================================

# Step A7: Delete the index
# This step removes the sample index and everything in it.
# Run this the same way you ran the steps above — paste it in the console and hit ▶️.
# Warning: this permanently deletes all 5 documents. Cannot be undone.

DELETE /kibana_sample_data_vectordb

# ✅ You should see: {"acknowledged": true}

# -----------------------------------------------
# Path A complete.

# What you built: a semantic retrieval layer using 0 lines of embedding code.
# What Elastic handled: model selection, vector generation, vector storage,
# query-time embedding generation, and automatic chunking of long documents.

# When you're ready to go deeper:
# - Add reranking: a second AI pass that re-orders top results for higher precision
# 📖 https://www.elastic.co/docs/solutions/search/ranking/semantic-reranking
# - Connect to LangChain for full RAG pipelines
# 📖 https://www.elastic.co/search-labs/integrations/langchain
# -----------------------------------------------


# ╔═══════════════════════════════════════════╗
# ║ PATH B — Bring Your Own Embeddings ║
# ╚═══════════════════════════════════════════╝
# Run each step by clicking ▶️ or pressing Ctrl+Enter / Cmd+Enter

# Use this path if you already generate vectors outside of Elasticsearch —
# for example, you're calling OpenAI's embeddings API, Cohere, or a custom model
# running on your own infrastructure.

# The key difference from Path A: instead of semantic_text (which hides everything),
# you use a dense_vector field and are responsible for generating vectors yourself,
# both at ingest time and at query time.

# ⚠️ The most important rule in this path (read before starting):
# You must use the EXACT SAME model at ingest time and at query time.
# If you index documents with OpenAI's text-embedding-3-small,
# you must also embed queries with text-embedding-3-small.
# Mixing models produces meaningless results — documents and queries
# would be encoded in different vector spaces with no shared meaning.
# Changing models later requires re-embedding and re-indexing every document.
# Choose carefully before you index real data at scale.

# Note: if you want to use a specific Elastic model but still have Elastic
# generate embeddings, see the "Optional: Choose a specific Elastic model"
# section at the end of Path A above. Path B is specifically for cases where
# the embedding model lives outside of Elasticsearch.


# ===============================================
# PATH B — PART 1: CONNECT TO YOUR EXTERNAL EMBEDDING MODEL
# ===============================================

# -----------------------------------------------
# Step B1: Register your external embedding model with Elasticsearch
# -----------------------------------------------
# This step creates a named connection to the model that generates your vectors.
# Elasticsearch calls this an "inference endpoint" — you give it a name
# ("my-embedding-endpoint") and reference that name in later steps whenever
# Elasticsearch needs to call the model to embed a query at search time.

# ⚠️ Production note: whatever model you choose here, you must use the exact same
# model at query time too. If you index with OpenAI text-embedding-3-small,
# your search
# queries must also be embedded with text-embedding-3-small. Mixing models produces
# meaningless results. Changing models later means re-embedding all your documents.
# For this tutorial the model is already set up correctly — this note is for when
# you adapt the pattern to your own data.

# Use OpenAI or another external provider (Cohere, Azure OpenAI, etc.):

PUT _inference/text_embedding/my-embedding-endpoint
{
  "service": "openai",
  "service_settings": {
    "api_key": "YOUR_OPENAI_API_KEY", // Replace with your actual key
    "model_id": "text-embedding-3-small"
    // text-embedding-3-small outputs 1536-dimensional vectors
    // You'll need to set dims: 1536 in Step B2
  }
}

# ✅ You should see an object with "inference_id": "my-embedding-endpoint"
# The "inference_id" is what you'll reference in later steps.

# Other supported providers: Cohere, Azure OpenAI, Amazon Bedrock, Google Vertex
# 📖 https://www.elastic.co/docs/explore-analyze/elastic-inference


# ===============================================
# PATH B — PART 2: CREATE YOUR INDEX
# ===============================================

# -----------------------------------------------
# Step B2: Create the index
# -----------------------------------------------
# This step creates an empty index — same concept as Step A1, but the mapping
# is different. Instead of semantic_text (which hides vectors inside a single field),
# here you declare a separate dense_vector field that stores the raw numbers.
# You control the dimensions, similarity function, and compression level.

# The 'dims' value must exactly match your model's output size — this is the
# most common mistake in Path B and requires a full reindex to fix if wrong.

# Model dimension reference:
# Jina v3 (default above): 1024 (can also use 256 or 512 via Matryoshka)
# OpenAI text-embedding-3-small: 1536
# OpenAI text-embedding-3-large: 3072
# Cohere embed-v3: 1024
# E5-small: 384

# 'int8_hnsw' is the index type — it stores vectors in a compressed format
# that uses roughly 4x less memory with minimal impact on search quality.
# Use 'hnsw' instead if you need maximum accuracy and don't care about memory.

PUT /kibana_sample_data_vectordb_byoe
{
  "mappings": {
    "properties": {
      "title": { "type": "text" }, // Standard keyword search field (BM25)
      "content": { "type": "text" }, // The original text — stored for display
      "content_embedding": {
        "type": "dense_vector",
        "dims": 1024, // ← Must match your model's output size exactly
        "index": true, // Must be true to enable vector search
        "similarity": "cosine", // How to measure similarity between vectors
        "index_options": {
          "type": "int8_hnsw" // Compressed index — ~4x memory savings
        }
      },
      "source": { "type": "keyword" } // Label field for filtering — e.g. tenant ID, category, document source
    }
  }
}

# ✅ You should see: {"acknowledged": true, "shards_acknowledged": true}
# Unlike Path A, this index stores text and vectors as separate fields.
# You are responsible for making sure they stay in sync.
# 📖 https://elastic.co/docs/reference/elasticsearch/mapping-reference/dense-vector


# ===============================================
# PATH B — PART 3: SET UP EMBEDDING AT INGEST TIME
# ===============================================

# -----------------------------------------------
# Step B3: Create an ingest pipeline that auto-generates vectors
# -----------------------------------------------
# This step creates a reusable pipeline that runs on every document before
# it's stored. When a document arrives, the pipeline calls the inference
# endpoint from Step B1, generates the vector from the 'content' field,
# and writes it to 'content_embedding' — all before the document is saved.

# Your application sends plain text. The pipeline generates and stores the embedding.
# This keeps embedding logic out of your application code and in one place.

# If you'd rather generate vectors in your application code before indexing,
# skip this step and see Step B4b instead.

PUT _ingest/pipeline/embedding-pipeline
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
# The pipeline is now available to use during indexing.


# ===============================================
# PATH B — PART 4: INDEX YOUR DOCUMENTS
# ===============================================

# -----------------------------------------------
# Step B4a: Index your documents (pipeline generates embeddings automatically)
# -----------------------------------------------
# This step stores documents into the index. By passing ?pipeline=embedding-pipeline,
# each document is automatically routed through the pipeline before storage.
# The pipeline calls the inference endpoint, generates the vector from 'content',
# and adds it to 'content_embedding'. You send text; Elasticsearch stores both.

# ⏳ If you get a model error on first run, wait 10–15 seconds and retry.

# ?pipeline=embedding-pipeline — route each document through the pipeline
# ?refresh=wait_for — wait until searchable before returning (same as Step A2)
POST /_bulk?pipeline=embedding-pipeline&refresh=wait_for
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Yellowstone National Park", "content": "Yellowstone National Park is one of the largest national parks in the United States. It ranges from Wyoming to Montana and Idaho, and contains an area of 2,219,791 acres. Its most famous for hosting the geyser Old Faithful and is centered on the Yellowstone Caldera, the largest super volcano on the American continent. Yellowstone is host to hundreds of species of animal, many of which are endangered or threatened.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Yosemite National Park", "content": "Yosemite National Park covers over 750,000 acres of land in California. The park is best known for its granite cliffs, waterfalls and giant sequoia trees. It is home to a diverse range of wildlife, including mule deer, black bears, and the endangered Sierra Nevada bighorn sheep. The park has 1,200 square miles of wilderness and is a popular destination for rock climbers.", "source": "national-parks"}
{ "index": { "_index": "kibana_sample_data_vectordb_byoe" } }
{"title": "Rocky Mountain National Park", "content": "Rocky Mountain National Park receives over 4.5 million visitors annually and is known for its mountainous terrain, including Longs Peak. The park is home to elk, mule deer, moose, and bighorn sheep. It contains montane, subalpine, and alpine tundra ecosystems and is a popular destination for hiking, camping, and wildlife viewing.", "source": "national-parks"}

# ✅ You should see: {"errors": false, "took": ..., "items": [...]}
# "errors": false confirms all documents were embedded and indexed successfully.

# -----------------------------------------------
# Step B4b: Application-side embedding (alternative)
# -----------------------------------------------
# Use this instead of Steps B3/B4a if you prefer to generate vectors in your
# application before sending them to Elasticsearch. Some teams prefer this
# when they want full control over batching, retries, or preprocessing.

# ⚠️ Reminder: use the same model here as in Step B1.

# Python example (run in your app, not in this console):

# from elasticsearch import Elasticsearch, helpers
# import openai

# es = Elasticsearch("https://your-cluster:443", api_key="YOUR_API_KEY")
# client = openai.OpenAI()

# def embed(text):
# # Calls OpenAI to convert text to a list of 1536 numbers
# return client.embeddings.create(
# model="text-embedding-3-small", input=text
# ).data[0].embedding

# helpers.bulk(es, [
# {
# "_index": "kibana_sample_data_vectordb_byoe",
# "_source": {
# "title": "Yellowstone National Park",
# "content": "Yellowstone is famous for Old Faithful...",
# "content_embedding": embed("Yellowstone..."),
# # Pass the pre-computed vector directly — Elasticsearch stores it as-is
# "source": "national-parks"
# }
# }
# ])

# ⚠️ At query time (Step B5), you must also call embed() on the user's query
# before passing it to Elasticsearch. The query vector must use the same model.


# ===============================================
# PATH B — PART 5: SEARCH YOUR DATA
# ===============================================

# -----------------------------------------------
# Step B5: Run your first vector search
# -----------------------------------------------
# This step searches the index using kNN — k-nearest neighbors.
# It finds the k documents whose vectors are closest in meaning to your query.
# "query_vector_builder" tells Elasticsearch to call the inference endpoint
# to embed the search string at query time — using the same model as ingest.
# Same model = vectors are in the same "space" = meaningful comparison.

# num_candidates: how many candidate documents to evaluate per shard before
# returning top k. Higher = better recall but slower. Start at 50–100.

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
# Step B6: Run a hybrid search — the recommended default
# -----------------------------------------------
# This step upgrades from pure vector search to hybrid: combining kNN (meaning-based)
# with BM25 (keyword-based) via RRF — same idea as Step A6, different retrievers.
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
                "title": "mountain wildlife"
                // BM25: keyword matching on the title field
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
                "model_text": "mountain wildlife hiking"
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
# 📖 https://www.elastic.co/docs/solutions/search/ranking/reciprocal-rank-fusion

# -----------------------------------------------
# Step B7: Add a filter to the hybrid search
# -----------------------------------------------
# This step restricts which documents are searched — same concept as Path A Step A5.
# Apply the filter to both the BM25 retriever and the kNN retriever.
# If you only apply it to one, the other will search the full index.

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
            // Apply the filter to the kNN retriever too — otherwise it searches all documents
          }
        }
      ],
      "rank_window_size": 50
    }
  }
}

# ✅ Only documents with source="national-parks" appear in results.


# ===============================================
# PATH B — PART 6: PREPARE FOR PRODUCTION ⚠️
# ===============================================

# -----------------------------------------------
# Step B8: Create an alias and verify your mapping
# -----------------------------------------------
# This step does two things before you go to production:

# First: create an alias — a pointer to your index. Your application queries
# the alias name ("vectordb-current"), never the raw index name. This matters
# because changing your embedding model later means re-embedding all documents
# into a new index, then swapping the alias. With an alias, your application
# code never changes. Without one, every model upgrade requires a code deployment.

# Second: verify the mapping looks correct — specifically that 'dims' matches
# your model's output. If it's wrong, the time to find out is before you index
# real production data, not after.

# The reindex-on-model-change flow:
# 1. Create index_v2 with the new model's dims
# 2. Re-embed and re-index all documents into index_v2
# 3. POST /_aliases: swap alias from v1 to v2 — atomic, zero downtime
# 4. Delete index_v1

PUT /kibana_sample_data_vectordb_byoe/_alias/vectordb-current

# ✅ You should see: {"acknowledged": true}
# Your app should now reference "vectordb-current" instead of the full index name.
# 📖 https://www.elastic.co/docs/manage-data/data-store/aliases

# Verify your index looks correct before going to production:

GET /kibana_sample_data_vectordb_byoe/_mapping

# ✅ Confirm 'content_embedding' shows:
# "type": "dense_vector"
# "dims": 1024 (or whatever your model outputs)
# "index": true
# If dims is wrong, delete the index and start from Step B2 with the correct value.


# ===============================================
# PATH B — CLEANUP (optional)
# ===============================================

# Step B9: Delete all resources created in this tutorial
# Run each DELETE request below the same way as earlier — paste and hit ▶️.
# Warning: deleting the index permanently removes all stored documents and vectors.

DELETE /kibana_sample_data_vectordb_byoe

DELETE _ingest/pipeline/embedding-pipeline

DELETE _inference/text_embedding/my-embedding-endpoint

# ✅ You should see: {"acknowledged": true} for each deletion.

# -----------------------------------------------
# Path B complete.

# What you built: a vector database with full control over the embedding model.

# Key things to remember:
# - Same model at ingest time AND query time — always
# - dims must match your model's output size — check before indexing real data
# - Create the alias before indexing production data — model changes require reindex
# - Hybrid search (kNN + BM25 via RRF) is the default — don't use vector-only

# When you're ready to improve search quality:
# - Reranking: a second AI pass on the top results for higher precision
# 📖 https://www.elastic.co/docs/solutions/search/ranking/semantic-reranking
# - _rank_eval: measure your search quality objectively with labeled test queries
# 📖 https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-rank-eval
# -----------------------------------------------
`;
