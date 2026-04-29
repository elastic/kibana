# Timeline Batching Functional Design ADR



This document details the design of how Timeline Batching is supposed to work. The purpose of this document is to have a source of truth where reviewers of any changes can refer back and decide if the change is in line with the design or not.

This document is only applicable for the Datagrid in Timeline Query and EQL tab.

## What is a batch
Batch ( also known as Sample ) in Unified Data Datagrid is the collection of max number of documents that are fetched in a single request. When a user queries a timeline for the first time, Batch 0 is fetched and then the user may have the option to fetch further batches on-demand.


### Batch v/s Datagrid Pagination
The concept of batch is different from the Datagrid Pagination. Datagrid Pagination is completely client driven and Datagrid may decide how it wants to paginate a particular batch.

For example, let’s say we fetch a batch of 500 documents, now Datagrid may decide to display these 500 documents following configurations 
- 10 pages with each page consisting of 50 documents  
- 20 pages with each page consisting of 25 documents
- 5 pages with each page consisting of 100 documents.

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

#### **Expected fetch/re-fetch logic**

```js
{
  /* Fetch Batch 1 */
  activePage: 1, /* current batch */
  querySize: 500 /* batch/sample size */
}
```

Consequently, if a user requests a new batch again, Batch 2 will be fetched with below strategy.

```js
{
	/* Fetch Batch 2 */
	activePage: 2,
	querySize: 500 /* batch/sample size */
}
```
#### **Expected UI behavior**

- When a new batch is fetched, the Datagrid should have new pages appended to it.
 
### Refresh Button

When a user clicks on the Refresh button in the query tab, it should explicitly re-fetch 0th batch again irrespective of the fact if any batch parameters have been changed or not.

This also applied to the refetch logic triggered by :
- Operations such as change in the Alert's status.
- Triggering of global query.
- Clicking Refresh button in the query tab.

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

#### Considerations
- This logic might lead to degradations in UX in the scenario given below:
  - When user is on let's say 3rd batch and they change the status of an Alert (which results in refetch). This will reset the table page to go back to 1st since we re-fetch 0th batch as mentioned above. 
Team decided that it is rare scenario since many users tend to do these kind of operations on the first page of the Datagrid. Hence, we can live with this trade-off of resetting the page to 1 when the user clicks on the refresh button.

### Adding a new column
Adding a new column should not affect the result set that is currently being displayed in front of the user. We should fetch a complete result set ( all batches cumulatively ) irrespective of the batch user is on. This will make sure that from the UI perspective, the user does not see any changes in the Datagrid except addition of the column.

#### When user is on the first(0th) batch
When user is on the first batch i.e. Batch 0, it will be re-fetched with the below strategy.

- **Expected fetch/re-fetch logic**

  ```js
  {
    /* Fetch Batch 0 */
    activePage: 0,
    querySize: 500 /* batch/sample size */
  }
  ```
- **Expected UI behavior**

  - User should see the new column added in the Datagrid without any changes in the datagrid pagination.

#### When user has already fetched multiple batches

- **Expected fetch/re-fetch logic**

  When user is on the 4th batch i.e. Batch 3, it will be re-fetched with the below strategy. 


  ```js
  {
    /* Fetch Batch 0 */
    activePage: 0,
    querySize: 2000 /* cumulative 4 batches ( 500 * 4 ) */
  }
  ```

  One important thing to notice here is that the querySize is 2000 instead of 500 which means we are cumulatively for all the visible batches. This comes with its own performance considerations but since the maximum allowed resultset is 10K, I think we can work through it.

- **Expected UI behavior**
  - User should see the new column added in the Datagrid without any changes in the datagrid pagination.

### Removing a columns

#### **Expected fetch/re-fetch logic**

  - As far as fetch strategy is concerned, there should not be fetching or re-fetching when a column has been removed. Since we already have the data of the column, we want to retain it as it is.

#### **Expected UI behavior**

  - Specified column is removed from the Datagrid without any changes in the datagrid pagination.



### Sort
Any changes in `Sort` should trigger a completely new fetch of Batch 0 from the start irrespective of the current batch user is on.

#### Expected fetch/re-fetch logic


```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

#### Expected UI behavior

- User should see the Datagrid sorted based on the new sort criteria.
- Datagrid page should be reset to 1.


### Timerange
Any changes in `Timerange` should trigger a completely new fetch of Batch 0 from the start irrespective of the current batch user is on.

#### Expected fetch/re-fetch logic
```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```

#### Expected UI behavior
- Datagrid page should be reset to 1.

### filterQuery
Any changes in `filterQuery` should trigger a completely new fetch of Batch 0 from the start irrespective of the current batch user is on.

#### Expected fetch/re-fetch logic

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```
#### Expected UI behavior
- Datagrid page should be reset to 1.

### Batch Size
Any changes in `limit/batchSize/sampleSize` should trigger a completely new fetch of Batch 0 from the start irrespective of the current batch user is on.

#### Expected fetch/re-fetch logic

```js
{
	/* Fetch Batch 0 */
	activePage: 0,
	querySize: 500 /* batch/sample size */
}
```
#### Expected UI behavior
- Datagrid page should be reset to 1.