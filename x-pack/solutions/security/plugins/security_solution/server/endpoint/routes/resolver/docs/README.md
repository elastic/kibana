# Resolver Backend

This readme will describe the backend implementation for resolver.

## APIs

The `/tree` API only retrieves a single lifecycle event per node in the tree. This allows us to avoid hitting the Elasticsearch 10k document limit a little easier. If we didn't do this, it's possible that a single node in the tree could have 10k lifecycle events which means the API would only return a tree of a single node.

The `/events` API provides the ability retrieve all the lifecycle events for a node or a set of nodes.

## Ancestry Array

The ancestry array is an array of entity_ids. This array is included with each event sent by the elastic endpoint
and defines the ancestors of a particular process. The array is formatted such that [0] of the array contains the direct
parent of the process. [1] of the array contains the grandparent of the process. For example if Process A spawned process
B which spawned process C. Process C's array would be [B,A].

The presence of the ancestry array makes querying ancestors and children for a process more efficient.

## Ancestry Array Limit

The ancestry array is currently limited to 20 values. The exact limit should not be relied on though.

## Ancestors

To query for ancestors of a process leveraging the ancestry array, we first retrieve the lifecycle events for the event_id
passed in. Once we have the origin node we can check to see if the document has the `process.Ext.ancestry` array. If
it does we can perform a search for the values in the array. This will retrieve all the ancestors for the process of interest
up to the limit of the ancestry array. Since the array is capped at 20, if the request is asking for more than 20
ancestors we will have to examine the most distant ancestor that has been retrieved and use its ancestry array to retrieve
the next set of results to fulfill the request.

### Pagination

There is no pagination cursor for the `/tree` API. The caller should make multiple requests as needed using the most distant ancestor received from previous requests to retrieve additional ancestors.

### Code

The code for handling the ancestor logic is in [here](../tree/utils/fetch.ts)

### Ancestors Multiple Queries Example

![alt text](./resolver_tree_ancestry.png 'Retrieve ancestors')

For this example let's assume that the _ancestry array limit_ is 2. The process of interest is A (the entity_id of a node is the character in the circle). Process A has an ancestry array of `[3,2]`, its parent has an ancestry array of `[2,1]` etc. Here is the execution of a request for 3 ancestors for entity_id A.

**Request:**

```
POST /resolver/tree
{
  ancestors: 3,
  nodes: [A],
}
```

1. Retrieve lifecycle events for entity_id `A`
2. Retrieve `A`'s start event's ancestry array
   1. In the event that the node of interest does not have an ancestry array, the entity id of it's parent will be used, essentially an ancestry array of length 1, [3] in the example here
3. `A`'s ancestry array is `[3,2]`, query for the lifecycle events for processes with `entity_id` 3 or 2
4. Check to see if we have retrieved enough ancestors to fulfill the request (we have not, we only received 2 nodes of the 3 that were requested)
5. We haven't so use the most distant ancestor in our result set (process 2)
6. Use process 2's ancestry array to query for the next set of results to fulfill the request
7. Process 2's ancestry array is `[1]` so repeat the process in steps 3-4 and retrieve process with entity_id 1. This fulfills the request so we can return the results for the lifecycle events of A, 3, 2, and 1.

If process 2 had an ancestry array of `[1,0]` we know that we only need 1 more process to fulfill the request so we can truncate the array to `[1]` instead of searching for all the entries in the array.

## Descendants

We can also leverage the ancestry array to query for the descendants of a process. The basic query for the descendants of a process is: _find all processes where their ancestry array contains a particular entity_id_. The results of this query will be sorted in ascending order by the timestamp field. I will try to outline a couple different scenarios for retrieving descendants using the ancestry array below.

### Scenario Background

In the scenarios below let's assume the _ancestry array limit_ is 2. The times next to the nodes are the time the node was spawned. The value in red indicates that the process terminated at the time in red.

### Simple Scenario

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> E -> F -> G -> H.

![alt text](./resolver_tree_children_simple.png 'Descendants Simple Scenario')

**Request:**

```
POST /resolver/tree
{
  descendants: 6,
  nodes: [A],
}
```

For this scenario we will retrieve one lifecycle event for 6 descendants of the process with entity_id `A`. As shown in the diagram above ES has 6 descendants for A so the response to this request will be: `[B, C, E, F, G, H]` because the results are sorted in ascending ordering based on the `timestamp` field which is when the process was started.

### Looping Scenario

For reference the time based order of the being nodes being spawned in this scenario is: A -> B -> C -> D -> E -> F -> G -> J -> K -> H.

![alt text](./resolver_tree_children_loop.png 'Descendants Looping Scenario')

**Request:**

```
POST /resolver/tree
{
  descendants: 9,
  nodes: [A]
}
```

In this scenario the request is for more descendants than can be retrieved using a single querying with the entity_id `A`. This is because the ancestry array for the descendants in the red section do not have `A` in their ancestry array. So when we query for all process nodes that have `A` in their ancestry array we won't receive D, J, or K.

Like in the previous scenario, for the first query we will receive `[B, C, E, F, G, H]`. What we want to do next is use a subset of that response that will get us 3 more descendants to fulfill the request for a total of 9.

We _could_ use `B` and `G` to do this (mostly `B`) but the problem is that when we query for descendants that have `B` or `G` in their ancestry array we will get back some duplicates that we have already received before. For example if we use `B` and `G` we'd get `[C, D, E, F, J, K, H]` but this isn't efficient because we have already received `[E, F, G, H]` from the previous query.

What we want to do is use the most distant descendants from `A` to make the next query to retrieve the last 3 process nodes to fulfill the request. Those would be `[C, E, F, H]`. So our next query will be: _find all process nodes where their ancestry array contains C or E or F or H_. This query can be limited to a size of 3 so that we will only receive `[D, J, K]`.

We have now received all the nodes for the request and we can return the results as `[B, C, E, F, G, H, D, J, K]`.

### Important Caveats

#### Ordering

In the previous example the final results are not sorted based on timestamp in ascending order. This is because we had to perform multiple queries to retrieve all the results. The backend will not return the results in sorted order.

The backend will return the nodes in breadth-first order. If the requested node has more than 10k immediate children then the response will only contain those children even if they also have descendants.

#### Tie breaks on timestamp

In the previous example we saw that J and K had the same timestamp of `12:13 pm`. The reason they were returned in the order `[J, K]` is because the `event.id` field is used to break ties like this. The `event.id` field is unique for a particular event and an increasing value per ECS's guidelines. Therefore J comes before K because it has an `event.id` of 1 vs 2.

#### Finding the most distant descendants

In the previous scenario we saw that we needed to use the most distant descendants from a particular node. To determine if a node is a most distant descendant we can use the ancestry array. Nodes C, E, F, and H all have `A` as their last entry in the ancestry array. This indicates that they are a distant descendant that should be used in the next query. There's one problem with this approach. In a mostly impossible scenario where the node of interest (A) does not have any ancestors, its direct children will also have `A` as the last entry in their ancestry array.

This edge case will likely never be encountered but we'll try to solve it anyway. To get around this as we iterate over the results from our first query (`[B, C, E, F, G, H]`) we can bucket the ones that have `A` as the last entry in their ancestry array. We bucket the results based on the length of their ancestry array (basically a `Map<number, Set<string>>`). So after bucketing our results will look like:

```javascript
{
  1: [B, G]
  2: [C, E, F, H]
}
```

While we are iterating we also keep track of the largest ancestry array that we have seen. In our scenario that will be a size of 2. Then to determine the distant descendants we simply get the nodes that had the largest ancestry array length. In this scenario that'd be `[C, E, F, H]`.

#### Handling Pagination

The `/tree` API does not support pagination. To retrieve additional nodes in the tree the requestor can use a specific node from a previous request (ideally a leaf node) and make an additional request to the `/tree` API to retrieve that node's descendants.

#### Finding Siblings

Currently there is no support for finding siblings of a node. This is an area that needs improvement. If a request is made for descendants of a node and 10,001 children are found, only the first 10k children will be returned. The last children will not be returned.

A possible solution using the current `/tree` API is to make another request but set the time range filter to be after the child with the most recent `@timestamp` value (since the events are sorted in ascending order on the `@timestamp` field). The problem with this approach is that even if we use a different time range, the first 10k nodes could have other lifecycle events that fall within the new time range and those nodes would be returned again.

Ideally the backend would supply a `/siblings` route that could return siblings of a node in a specific direction perhaps.
