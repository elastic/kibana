/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const agentBuilderTutorialCommands: string = `# Welcome to the Elastic Agent Builder Tutorial! 🤖
# 🚀 This tutorial will guide you through working with the Elastic Agent Builder APIs using the Kibana Console.
# After selecting a command, run it by clicking the ▶️ button or pressing Ctrl+Enter or Cmd+Enter.


# ===============================================
# SAMPLE DATA SETUP 📚
# ===============================================

# First, let's set up some sample data to work with throughout this tutorial.

# -----------------------------------------------
# Step 1: Create sample data 📚
# -----------------------------------------------
# Create an index with book data that our tools and agents can work with.

PUT /kibana_sample_data_agents
{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "author": { "type": "text" },
      "release_date": { "type": "date" },
      "page_count": { "type": "integer" }
    }
  }
}

POST /_bulk
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Snow Crash", "author": "Neal Stephenson", "release_date": "1992-06-01", "page_count": 470}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Revelation Space", "author": "Alastair Reynolds", "release_date": "2000-03-15", "page_count": 585}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "1984", "author": "George Orwell", "release_date": "1985-06-01", "page_count": 328}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Fahrenheit 451", "author": "Ray Bradbury", "release_date": "1953-10-15", "page_count": 227}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "Brave New World", "author": "Aldous Huxley", "release_date": "1932-06-01", "page_count": 268}
{ "index" : { "_index" : "kibana_sample_data_agents" } }
{"name": "The Handmaids Tale", "author": "Margaret Atwood", "release_date": "1985-06-01", "page_count": 311}

# ✅ Sample data created!


# ===============================================
# GETTING STARTED: CHAT WITH AN AGENT 💬
# ===============================================

# Let's start by chatting with the default agent to see how the Agent Builder works.
# You can send a message to any agent using the converse API.

# -----------------------------------------------
# Step 2: Chat with the default agent 💬
# -----------------------------------------------
# Send a message to the default agent and see it respond using its built-in tools.

POST kbn://api/agent_builder/converse
{
  "input": "What books are in the kibana_sample_data_agents index?"
}

# ✅ The agent responds with information about the books in our sample data.
# Notice the token usage in the response - we'll compare this later when using a custom agent.


# ===============================================
# TOOLS 🔧
# ===============================================

# Tools are reusable functions that agents can call to perform specific tasks.
# Built-in tools handle common operations like searching indices and generating queries.
# You can also create custom tools tailored to your specific use cases.

# -----------------------------------------------
# Step 3: List all tools 📋
# -----------------------------------------------
# See all available tools, including the built-in tools provided by the platform.

GET kbn://api/agent_builder/tools

# ✅ The response includes a list of all available tools, including built-in tools.

# -----------------------------------------------
# Step 4: Run a built-in tool 🚀
# -----------------------------------------------
# Let's run the built-in ES|QL generator tool to create a query for our sample data.

POST kbn://api/agent_builder/tools/_execute
{
  "tool_id": "platform.core.generate_esql",
  "tool_params": {
    "query": "Build an ES|QL query to get the book with the most pages",
    "index": "kibana_sample_data_agents"
  }
}

# ✅ The response includes the ES|QL query that you can use to create a custom tool.

# -----------------------------------------------
# Step 5: Create a custom ES|QL tool ✍️
# -----------------------------------------------
# You can create tools to best fit common use cases with your agent interactions.
# Using the query from the previous step, let's create a tool that gets the book with the most pages.

POST kbn://api/agent_builder/tools
{
  "id": "example-books-esql-tool",
  "type": "esql",
  "description": "An ES|QL query tool for getting the book with the most pages",
  "configuration": {
    "query": "FROM kibana_sample_data_agents | SORT page_count DESC | LIMIT 1",
    "params": {}
  }
}

# ✅ The response confirms the tool was created with its full configuration.

# Let's run our new custom tool to get the book with the most pages.

POST kbn://api/agent_builder/tools/_execute
{
    "tool_id": "example-books-esql-tool",
    "tool_params": {}
}

# ✅ The response includes a result with the "tabular_data" type showing the query's output.

# -----------------------------------------------
# Step 6: Get a tool by ID 🔍
# -----------------------------------------------
# You can retrieve a specific tool using its ID.

GET kbn://api/agent_builder/tools/example-books-esql-tool

# ✅ The response includes the full tool definition.

# -----------------------------------------------
# Step 7: Update a tool ✏️
# -----------------------------------------------
# Let's update our tool to accept parameters so it can handle different queries.

PUT kbn://api/agent_builder/tools/example-books-esql-tool
{
  "description": "An ES|QL query tool for finding the longest books published before a certain year",
  "configuration": {
    "query": "FROM kibana_sample_data_agents | WHERE DATE_EXTRACT(\\"year\\", release_date) < ?maxYear | SORT page_count DESC | LIMIT ?limit",
    "params": {
      "maxYear": {
        "type": "integer",
        "description": "Minimum year to filter books (exclusive)"
      },
      "limit": {
        "type": "integer",
        "description": "Maximum number of results to return"
      }
    }
  }
}

# ✅ The response confirms the tool was updated.

# Let's run the updated tool to get the 2 longest books published before 1960.

POST kbn://api/agent_builder/tools/_execute
{
    "tool_id": "example-books-esql-tool",
    "tool_params": {
      "maxYear": 1960,
      "limit": 2
    }
}

# ✅ The response includes a result with the "tabular_data" showing the query's output.


# ===============================================
# AGENTS 🤖
# ===============================================

# Agents combine instructions and tools to handle user conversations.
# Now let's create a custom agent that uses our new tool.

# -----------------------------------------------
# Step 8: List all agents 📋
# -----------------------------------------------
# See all available agents in your system.

GET kbn://api/agent_builder/agents

# ✅ The response includes a list of all available agents.

# -----------------------------------------------
# Step 9: Create a custom agent ✍️
# -----------------------------------------------
# Let's create an agent that helps users search our books index.
# Notice how we assign only the custom tool we created to the agent's set of tools.

POST kbn://api/agent_builder/agents
{
  "id": "books-search-agent",
  "name": "Books Search Helper",
  "description": "Hi! I can help you search and analyze the books in our sample data collection.",
  "labels": ["books", "sample-data", "search"],
  "avatar_color": "#BFDBFF",
  "avatar_symbol": "📚",
  "configuration": {
    "instructions": "You are a helpful agent that assists users in searching and analyzing book data from the kibana_sample_data_agents index. Help users find books by author, title, or analyze reading patterns.",
    "tools": [
      {
        "tool_ids": [
          "example-books-esql-tool",
          "platform.core.search",
          "platform.core.list_indices",
          "platform.core.get_index_mapping",
          "platform.core.get_document_by_id"
        ]
      }
    ]
  }
}

# ✅ The response confirms the agent was created with its full configuration.

# -----------------------------------------------
# Step 10: Get an agent by ID 🔍
# -----------------------------------------------
# You can retrieve a specific agent using its ID.

GET kbn://api/agent_builder/agents/books-search-agent

# ✅ The response includes the full agent definition.

# -----------------------------------------------
# Step 11: Update an agent ✏️
# -----------------------------------------------
# Let's update the agent's description.

PUT kbn://api/agent_builder/agents/books-search-agent
{
  "name": "Books Search Helper",
  "description": "Updated - Search and analyze our sample books collection with ease!",
  "labels": ["books", "sample-data", "search", "updated"]
}

# ✅ The response confirms the agent was updated.


# ===============================================
# CHAT WITH YOUR CUSTOM AGENT 💬
# ===============================================

# Now let's chat with our custom agent and see how it uses our custom tool.

# -----------------------------------------------
# Step 12: Chat with your custom agent 💬
# -----------------------------------------------
# Send a message to the custom agent and see it use our custom ES|QL tool.

POST kbn://api/agent_builder/converse
{
  "input": "What books do we have in our collection?",
  "agent_id": "books-search-agent"
}

# ✅ The response includes the agent's reply and creates a new conversation.
# Note the "conversation_id" at the top of the response which we will use in the next step.

# Now let's see if the agent uses our custom tool based on a specific query.

POST kbn://api/agent_builder/converse
{
  "input": "Can you find the longest book published before 1960?",
  "agent_id": "books-search-agent",
  "conversation_id": "<CONVERSATION_ID>"
}

# ✅ Instead of multiple reasoning and tool call steps, the agent completes the task in a single step.
# Compare the token usage here to Step 2 - custom tools optimized for specific use cases
# typically consume fewer tokens than general-purpose agents with many tools.

# Tip: You can also receive realtime chat responses through streaming via the async converse API:
# https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-agent-builder-converse-async


# ===============================================
# CONVERSATIONS 📝
# ===============================================

# -----------------------------------------------
# Step 13: List all conversations 📋
# -----------------------------------------------
# You can view all your conversations with agents.

GET kbn://api/agent_builder/conversations

# ✅ The response includes a list of all your conversations.

# -----------------------------------------------
# Step 14: Get a conversation by ID 🔍
# -----------------------------------------------
# You can retrieve the full history of a specific conversation.
# Replace <CONVERSATION_ID> with an actual conversation ID from the previous step.

GET kbn://api/agent_builder/conversations/<CONVERSATION_ID>

# ✅ The response includes the full conversation history with all messages.


# ===============================================
# CLEANUP (optional) 🧹
# ===============================================

# -----------------------------------------------
# Step 15: Delete a conversation 🗑️
# -----------------------------------------------
# You can remove a conversation when you no longer need it.
# Replace <CONVERSATION_ID> with an actual conversation ID.

DELETE kbn://api/agent_builder/conversations/<CONVERSATION_ID>

# ✅ The response confirms the conversation was deleted.

# -----------------------------------------------
# Step 16: Delete the agent 🗑️
# -----------------------------------------------
# Remove the agent we created.

DELETE kbn://api/agent_builder/agents/books-search-agent

# ✅ The response confirms the agent was deleted.

# -----------------------------------------------
# Step 17: Delete the tool 🗑️
# -----------------------------------------------
# Remove the custom tool we created.

DELETE kbn://api/agent_builder/tools/example-books-esql-tool

# ✅ The response confirms the tool was deleted.

# -----------------------------------------------
# Step 18: Clean up sample data 🗑️
# -----------------------------------------------
# Delete the sample index to clean up.

DELETE /kibana_sample_data_agents

# ✅ The response confirms the index was deleted.


# ===============================================
# Conclusion 🎓
# ===============================================
# 🎉 Congratulations on building your first agent!

# In this tutorial, you learned how to work with the Elastic Agent Builder APIs:
# - Chat with agents using the converse API
# - Create and manage custom tools for specific use cases
# - Build agents with tailored instructions and tools
# - Manage conversations

# Custom tools optimized for your use cases can significantly reduce token consumption
# and improve response accuracy compared to general-purpose agents.

# Use your Kibana API key and the endpoints we've covered to build and test your agents in
# your own environment, or visit the Agent Builder UI in Kibana: /app/agent_builder/agents

# 📖 For complete API details, refer to the Kibana API reference: https://www.elastic.co/docs/api/doc/kibana/group/endpoint-agent-builder
# 📖 Learn more about Agent Builder: https://www.elastic.co/docs/explore-analyze/ai-features/elastic-agent-builder
# 🤖 Use the MCP server to build agents from your own client: https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server
# 🔗 Learn about the A2A protocol for agent interoperability: https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-agent-builder-a2a-agent-json
`;
