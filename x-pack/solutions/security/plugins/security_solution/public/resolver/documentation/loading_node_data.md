# Loading Node Data

## Introduction

### Lifecycle Events and Node Data

A lifecycle event is a document sent by the elastic endpoint that has `event.category` set to start, end, exec, or info.
Lifecycle events indicate the lifecycle of a process. The lifecycle events mainly pertain to endpoint data graphed
within resolver. Resolver uses end events to mark nodes as terminated.

The resolve code base and this README uses the term _node data_. Node data for endpoint events refers to the lifecycle
events for a particular node in a resolver graph. As resolver becomes more generic in what it is able to graph, node
data will refer to whatever information helps determine what visual state a particular node in the graph should have.

### Tree API

The resolver backend `{id}/tree` API is tied to an `process.entity_id` and attempts to return all the lifecycle events
for each node in the returned graph. This posed a problem if a particular node in the graph had an unusually large
amount of lifecycle events. If this occurred it would mean that the request would hit its limit for the number of total
documents (10K) potentially on the first node in the graph and instead of displaying multiple nodes in the graph, it
would only display a single node.

To get around this issue, the new `/tree` API that does not rely on the field `process.entity_id` only returns a single
document per node in the graph. This avoids means we could theoretically retrieve a graph with 10k nodes without
running into limit with ES. This adds a complication in that the UI must now request the _rest_ of the lifecycle
events for the nodes in the graph.

## Loading Additional Lifecycle Events

For resolver to mark whether a node has terminated, it needs the lifecycle events that would include an _end_ event
indicating the termination. Since the new `/tree` API only returns a single lifecycle event per node, resolver needs
to request the rest of the lifecycle events. Another approach could have been to have the `/tree` API return a
termination event as the single event if one existed. The advantage of having resolver request all of the lifecycle
events is that it can give the user additional insight into the events as the user is analyzing the graph.

The backend provides an `/events` API that takes a free form `filter` parameter to narrow the request for retrieving
additional lifecycle events. This API allows lifecycle events to be retrieved for multiple nodes in the graph at the
same time.

Resolver makes requests to the `/events` API for the node data of the nodes in view based on the current view box
of the camera. When a user moves the camera (panning, camera controls, zooming, etc) and new nodes come into view,
they initial are shown with a loading state if we have not seen those nodes in the view previously. The loading state is
to indicate that we have made a request for the their node data (i.e. lifecycle events). Once the data is returned
from the `/events` API, the nodes are updated with whether they are terminated or running.

## Node States

These are the different states a node can be in:

- _**Loading**_ - The lifecycle events have been requested and we're waiting for the server to respond
- _**Error**_ - An error occurred after we requested the node's lifecycle events
- _**Running**_ - We received the node's lifecycle information and we did not see a termination event, so the process
  must still be running
- _**Terminated**_ - We received the node's lifecycle information and we found a termination event

The state is stored in a map so it can be quickly referenced. The map uses the node's ID as the key and maps to an
object containing the lifecycle events and whether the node has terminated.
