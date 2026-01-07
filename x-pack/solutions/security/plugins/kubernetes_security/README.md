# Kubernetes Security
This plugin provides interactive visualizations of your Kubernetes workload and session data.

## Overview
Allow users to explore the data stream from k8s environment that being monitored by Elastic Agent(+ endpoint integration) in a session view with cloud and k8s context. For more context, see internal [doc](https://github.com/elastic/security-team/issues/3337).

This plugin is currently being used as a part of Security Solution features under the `/app/security/kubernetes` page.

## API

#### `getKubernetesPage` 
Returns the kubernetes page.
Parameters
| Property                | Description       | Type   |
| ----------------------- | ----------------- | ------ |
| kubernetesSecurityDeps  | Parameters object | object |

`kubernetesSecurityDeps`
| Property            | Description                                                   | Type      |
| ------------------- | ------------------------------------------------------------- | --------- |
| filter              | The global filter component used across pages in Kibana       | ReactNode |
| renderSessionsView  | Function to render sessions view table                        | function  |
| indexPattern        | Index pattern used for the data source in the Kubernetes page | object    |
| globalFilter        | Includes query and timerange used for filtering               | object    |

`indexPattern`
| Property  | Description                         | Type                                         |
| --------- | ----------------------------------- | -------------------------------------------- |
| fields    | A list of `FieldSpec`               | `FieldSpec[]` from `@kbn/data-plugin/common` |
| title     | Index pattern string representation | string                                       |

`globalFilter`
| Property    | Description                                                                                                                                   | Type              |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------  | ----------------- |
| filterQuery | Stringified Elasticsearch filter query. See [doc](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-filter-context.html). | Optional, string  |
| startDate   | Start date time of timerange filter, in ISO format                                                                                            | string            |
| endDate     | End date time of timerange filter, in ISO format                                                                                              | string            |


## Page preview
![preview](https://user-images.githubusercontent.com/91196877/171646384-ff7041ae-13ae-4abc-bb25-636c38e7efbb.png)