/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// TODO: get docs team approval on the copy
export const esqlQuickstartCommands: string = `# Welcome to the Elasticsearch ES|QL Quickstart!
# This quickstart will guide you through basic ES|QL queries in Elasticsearch
# using API calls from within the Kibana Dev console.

# After selecting a command, execute it by clicking the "Send Request" button or
# pressing Ctrl+Enter or Cmd+Enter.

# -----------------------------------------------
# Step 1: Create the 'cooking_blog' index and mapping
# -----------------------------------------------
PUT /cooking_blog
{
  "mappings": {
    "properties": {
      "title": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "description": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "author": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "date": { "type": "date" },
      "category": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "tags": { "type": "text", "fields": { "keyword": { "type": "keyword", "ignore_above": 256 } } },
      "rating": { "type": "float" }
    }
  }
}
#
# Response includes a confirmation that the index and mapping were created.

# -----------------------------------------------
# Step 2: Add sample blog posts to your index
# -----------------------------------------------
POST /cooking_blog/_bulk?refresh=wait_for
{ "index": { "_id": "1" } }
{ "title": "Perfect Pancakes: A Fluffy Breakfast Delight", "description": "Learn the secrets to making the fluffiest pancakes, so amazing you won't believe your tastebuds. This recipe uses buttermilk and a special folding technique to create light, airy pancakes that are perfect for lazy Sunday mornings.", "author": "Maria Rodriguez", "date": "2023-05-01", "category": "Breakfast", "tags": ["pancakes", "breakfast", "easy recipes"], "rating": 4.8 }
{ "index": { "_id": "2" } }
{ "title": "Spicy Thai Green Curry: A Vegetarian Adventure", "description": "Dive into the flavors of Thailand with this vibrant green curry. Packed with vegetables and aromatic herbs, this dish is both healthy and satisfying. Don't worry about the heat - you can easily adjust the spice level to your liking.", "author": "Liam Chen", "date": "2023-05-05", "category": "Main Course", "tags": ["thai", "vegetarian", "curry", "spicy"], "rating": 4.6 }
{ "index": { "_id": "3" } }
{ "title": "Classic Beef Stroganoff: A Creamy Comfort Food", "description": "Indulge in this rich and creamy beef stroganoff. Tender strips of beef in a savory mushroom sauce, served over a bed of egg noodles. It's the ultimate comfort food for chilly evenings.", "author": "Emma Watson", "date": "2023-05-10", "category": "Main Course", "tags": ["beef", "pasta", "comfort food"], "rating": 4.7 }
{ "index": { "_id": "4" } }
{ "title": "Vegan Chocolate Avocado Mousse", "description": "Discover the magic of avocado in this rich, vegan chocolate mousse. Creamy, indulgent, and secretly healthy, it's the perfect guilt-free dessert for chocolate lovers.", "author": "Alex Green", "date": "2023-05-15", "category": "Dessert", "tags": ["vegan", "chocolate", "avocado", "healthy dessert"], "rating": 4.5 }
{ "index": { "_id": "5" } }
{ "title": "Crispy Oven-Fried Chicken", "description": "Get that perfect crunch without the deep fryer! This oven-fried chicken recipe delivers crispy, juicy results every time. A healthier take on the classic comfort food.", "author": "Maria Rodriguez", "date": "2023-05-20", "category": "Main Course", "tags": ["chicken", "oven-fried", "healthy"], "rating": 4.9 }
#
# Response includes a summary of successes and errors for each operation.

# -----------------------------------------------
# Step 3: Run a basic full-text search
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE description:"fluffy pancakes"
    | LIMIT 1000
  """
}
#
# Response includes matching documents containing 'fluffy' or 'pancakes'.

# -----------------------------------------------
# Step 4: Show specific fields in results
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE description:"fluffy pancakes"
    | KEEP title, description, rating
    | LIMIT 1000
  """
}
#
# Response includes only the title, description, and rating fields.

# -----------------------------------------------
# Step 5: Sort by relevance score
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog METADATA _score
    | WHERE description:"fluffy pancakes"
    | KEEP title, description, _score
    | SORT _score DESC
    | LIMIT 1000
  """
}
#
# Response includes documents sorted by relevance score.

# -----------------------------------------------
# Step 6: Exact match filtering
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE category.keyword == "Breakfast"
    | KEEP title, category, rating
    | SORT rating DESC
    | LIMIT 1000
  """
}
#
# Response includes documents with category exactly 'Breakfast'.

# -----------------------------------------------
# Step 7: Require all search terms (AND logic)
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE match(description, "fluffy pancakes", {"operator": "AND"})
    | LIMIT 1000
  """
}
#
# Response includes documents where both 'fluffy' and 'pancakes' appear in description.

# -----------------------------------------------
# Step 8: Minimum number of terms to match
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE match(title, "fluffy pancakes breakfast", {"minimum_should_match": 2})
    | LIMIT 1000
  """
}
#
# Response includes documents matching at least 2 of the 3 terms.

# -----------------------------------------------
# Step 9: Search for exact phrases
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE MATCH_PHRASE(description, "rich and creamy")
    | KEEP title, description
    | LIMIT 1000
  """
}
#
# Response includes documents where 'rich and creamy' appears as a phrase.

# -----------------------------------------------
# Step 10: Date range filtering
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE date >= "2023-05-01" AND date <= "2023-05-31"
    | KEEP title, author, date, rating
    | LIMIT 1000
  """
}
#
# Response includes documents published in May 2023.

# -----------------------------------------------
# Step 11: Numerical range filtering
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE rating >= 4.5
    | KEEP title, author, rating, tags
    | SORT rating DESC
    | LIMIT 1000
  """
}
#
# Response includes highly-rated recipes.

# -----------------------------------------------
# Step 12: Search across multiple fields
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE title:"vegetarian curry" OR description:"vegetarian curry" OR tags:"vegetarian curry"
    | LIMIT 1000
  """
}
#
# Response includes documents matching 'vegetarian curry' in any field.

# -----------------------------------------------
# Step 13: Weight different fields
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog METADATA _score
    | WHERE match(title, "vegetarian curry", {"boost": 2.0}) OR match(description, "vegetarian curry") OR match(tags, "vegetarian curry")
    | KEEP title, description, tags, _score
    | SORT _score DESC
    | LIMIT 1000
  """
}
#
# Response includes documents with title matches ranked higher.

# -----------------------------------------------
# Step 14: Use query string for complex patterns
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog
    | WHERE QSTR(description, "fluffy AND pancak* OR (creamy -vegan)")
    | KEEP title, description
    | LIMIT 1000
  """
}
#
# Response includes documents matching the query string pattern.

# -----------------------------------------------
# Step 15: Advanced relevance scoring (custom score)
# -----------------------------------------------
# POST /_query
{
  "query": """
    FROM cooking_blog METADATA _score
    | WHERE NOT category.keyword == "Dessert"
    | EVAL tags_concat = MV_CONCAT(tags.keyword, ",")
    | WHERE tags_concat LIKE "*vegetarian*" AND rating >= 4.5
    | WHERE match(title, "curry spicy", {"boost": 2.0}) OR match(description, "curry spicy")
    | EVAL category_boost = CASE(category.keyword == "Main Course", 1.0, 0.0)
    | EVAL date_boost = CASE(DATE_DIFF("month", date, NOW()) <= 1, 0.5, 0.0)
    | EVAL custom_score = _score + category_boost + date_boost
    | WHERE custom_score > 0
    | SORT custom_score DESC
    | LIMIT 1000
  """
}
#
# Response includes documents scored and filtered by custom logic.

# Explore the Playground to experiment with ES|QL queries against your own data!
# Easily ingest data from many sources: https://www.elastic.co/docs/solutions/search/ingest-for-search

# -----------------------------------------------
# Conclusion
# -----------------------------------------------
# In this quickstart, you learned the basics of running ES|QL queries in Elasticsearch
# using the Kibana Dev Tools console.
# You covered creating an index, indexing documents, searching, filtering, and advanced scoring.
# For more, see: https://www.elastic.co/docs/solutions/search/esql-for-search
`;
