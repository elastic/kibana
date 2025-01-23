# Timeline Batching Functional Design ADR



This document details the design of how Timeline Batching is supposed to work. The purpose of this document is to have a source of truth where reviewers of any changes can refer back and decide if the change is in line with the design or not.

This document is only applicable for Timeline datagrid.

## What is a batch
Batch ( also known as Sample ) in Unified Data table is the collection of max number of documents that are fetched in a single request. When a user queries a timeline for the first time, Batch 0 is fetched and then the user may have the option to fetch further batches on-demand.


### Batch v/s Data Grid Pagination
The concept of batch is different from the Datagrid Pagination. Datagrid Pagination is completely client driven and datagrid may decide how it wants to paginate a particular batch.

For example, let’s say we fetch a batch of 500 documents, now Datagrid may decide to display these 500 documents following configurations 
10 pages with each page consisting of 50 documents  
20 pages with each page consisting of 25 documents
5 pages with each page consisting of 100 documents.

Users will be able to fetch a new batch of documents when they reach the last page.

### Batch Parameters
Below are the parameters that affect a batch. Any changes to these parameters should trigger a re-fetch of all existing batches or the initial batch depending on the situation.

- **dataViewId**: Currently selected dataView Id in Timeline.
- **Timerange**: 
  - **startDate**
  - **endDate**
  - **timeRangeKind**
- **eqlOptions**
- **indexNames**: List of indices in Timeline.
- **id**: Timeline Id
- **fields**:  List of requested fields
- **filterQuery**:  combined query consisting: 
  * **KQL/Lucene Query**
  * **Filters**
  * **Data Providers**
- **runtimeMappings**: List of runtime mappings that need to be fetched
- **language**: KQL | Lucene
- **limit**: Sample Size or Batch Size
- **sort**

## Batch fetch/re-fetch Strategy
Batch fetch/re-fetch strategy depends on the scenario or the action the user is taking. This section will lay out all the scenarios in which a batch should be re-fetched and its corresponding strategy.

### New Batch Requested
When a user requests a new batch after clicking on `Load more` as shown below, a new batch will be fetched. For example, if user is on Batch 0 and clicks on Load more, a new batch will be fetched with below strategy :

![](./images/load_more_timeline.png)

```js
{
  /* Fetch Batch 1 */
  activePage: 1, /* current batch */
  querySize: 500 /* batch/sample size */
}
```

Consequently, if a user requests a new batch again ( for the 3rd time ), Batch 2 will be fetched with below strategy.

```js
{
	/* Fetch Batch 2 */
	activePage: 2,
	querySize: 500 /* batch/sample size */
}
```
 
### Refresh Button

When a user clicks on the Refresh button in the query tab, it should explicitly re-fetch new data ir-respective of the fact if any batch parameters have been changed or not.

#### When user is on the first (0th) batch
When user is on the first batch i.e. Batch 0, it will be re-fetched with the below strategy.

  ```js
  {
    /* Fetch Batch 0 */
    activePage: 0,
    querySize: 500 /* batch/sample size */
  }
  ```

#### When user has already fetched multiple batches
Let’s say the user has already fetched 3 batches and currently the user is on Batch 2. Clicking on Refetch will reset the result set to 0th batch:


```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

### Adding a new column
Adding a new column should not affect the result set that is currently being displayed in front of the user. We should fetch a complete result set ir-respective of the batch user is on.

#### When user is on the first(0th) batch
When user is on the first batch i.e. Batch 0, it will be re-fetched with the below strategy.

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

#### When user has already fetched multiple batches

When user is on the 4th batch i.e. Batch 3, it will be re-fetched with the below strategy. 

```js
{
  /* Fetch Batch 0 */
  activePage: 0,
  querySize: 2000 /* cumulative 4 batches ( 500 * 4 ) */
}
```

One important thing to notice here is that the querySize is 2000 instead of 500 which means we are cumulatively for all the visible batches. This comes with its own performance considerations but since the maximum allowed resultset is 10K, I think we can work through it.

### Removing a columns
As far as fetch strategy is concerned, there should not be fetching or re-fetching when a column has been removed. Since we already have the data of the column, we want to retain it as it is.

Only Effect should be on the UI side where the specified column is removed from the table.

### Sort
Any changes in `Sort` should trigger a completely new fetch of Batch 0 from the start ir-respective of the current batch user is on.

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

### Timerange
Any changes in `Timerange` should trigger a completely new fetch of Batch 0 from the start ir-respective of the current batch user is on.

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

### filterQuery
Any changes in `filterQuery` should trigger a completely new fetch of Batch 0 from the start ir-respective of the current batch user is on.

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

### Batch Size
Any changes in `filterQuery` should trigger a completely new fetch of Batch 0 from the start ir-respective of the current batch user is on.

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```
