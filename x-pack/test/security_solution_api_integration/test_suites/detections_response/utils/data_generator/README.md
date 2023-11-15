# Data Generator for functional tests

Helper to generate and index documents for using in Kibana functional tests

- [Data Generator for functional tests](#data-generator-for-functional-tests)
  - [DataGenerator](#datagenerator)
    - [Initialization](#initialization)
      - [Prerequisites](#prerequisites)
      - [dataGeneratorFactory](#datageneratorfactory)
    - [methods](#methods)
      - [**indexListOfDocuments**](#indexlistofdocuments)
      - [**indexGeneratedDocuments**](#indexgenerateddocuments)
      - [**indexEnhancedDocuments**](#indexenhanceddocuments)
  - [Utils](#utils)
    - [**generateDocuments**](#generatedocuments)
    - [**enhanceDocument**](#enhancedocument)
    - [**enhanceDocuments**](#enhancedocuments)
  - [Usage](#usage)
    - [create test query rule that queries indexed documents within a test](#create-test-query-rule-that-queries-indexed-documents-within-a-test)

## DataGenerator

### Initialization


#### Prerequisites
1. Create index mappings in `x-pack/test/functional/es_archives/security_solution`
    - create folder for index `foo_bar`
    - add mappings file `mappings.json` in it

        <details>
        <summary>x-pack/test/functional/es_archives/security_solution/foo_bar/mappings.json</summary>

        ```JSON
            {
                "type": "index",
                "value": {
                    "index": "foo_bar",
                    "mappings": {
                        "properties": {
                            "id": {
                                "type": "keyword"
                            },
                            "@timestamp": {
                                "type": "date"
                            },
                            "foo": {
                                "type": "keyword"
                            },
                        }
                    },
                    "settings": {
                        "index": {
                            "number_of_replicas": "1",
                            "number_of_shards": "1"
                        }
                    }
                }
            }
        ```
        </details>
2. Add in `before` of the test file index initialization

    ```ts
        const esArchiver = getService('esArchiver');

        before(async () => {
            await esArchiver.load(
                'x-pack/test/functional/es_archives/security_solution/foo_bar'
            );
        });

    ```

3. Add in `after` of the test file index removal

    ```ts
        const esArchiver = getService('esArchiver');
        
        before(async () => {
            await esArchiver.unload(
                'x-pack/test/functional/es_archives/security_solution/foo_bar'
            );
        });

    ```

#### dataGeneratorFactory

`DataGeneratorParams`

| Property        | Description                                            | Type   |
| --------------- | ------------------------------------------------------ | ------ |
| es       | ES client                      | `ESClient` |
| index       | index where document will be added           | `string` |
| log       | log client      | `LogClient`|

1. import and initialize factory

    ```ts
        import { dataGeneratorFactory } from '../../utils/data_generator';

        const es = getService('es');
        const log = getService('log');

        const { indexListOfDocuments, indexGeneratedDocuments } = dataGeneratorFactory({
            es,
            index: 'foo_bar',
            log,
        });

    ```
2. Factory will return 2 methods which can be used to index documents into `foo_bar`

where `getService` is method from `FtrProviderContext`

### methods

#### **indexListOfDocuments**

| Property        | Description                                            | Type   |
| --------------- | ------------------------------------------------------ | ------ |
| documents       | list of documents to index                     | `Record<string, unknown>` |

Will index list of documents to `foo_bar` index as defined in `dataGeneratorFactory` params

```ts
    await indexListOfDocuments([{ foo: "bar" }, { id: "test-1" }])

```

#### **indexGeneratedDocuments**

Will generate 10 documents in defined interval and index them in `foo_bar` index as defined in `dataGeneratorFactory` params
Method receives same parameters as [generateDocuments](#generateDocuments) util.

```ts
    await indexGeneratedDocuments({
        docsCount: 10,
        interval: ['2020-10-28T07:30:00.000Z', '2020-10-30T07:30:00.000Z'],
        seed: (i, id, timestamp) => ({ id, '@timestamp': timestamp, seq: i })
    })

```

#### **indexEnhancedDocuments**

Will index list of enhanced documents to `foo_bar` index as defined in `dataGeneratorFactory` params
Method receives same parameters as [enhanceDocuments](#enhanceDocuments) util.

```ts
    await indexEnhancedDocuments({
        interval: ['1996-02-15T13:02:37.531Z', '2000-02-15T13:02:37.531Z'],
        documents: [{ foo: 'bar' }, { foo: 'bar-1' }, { foo: 'bar-2' }]
    })

```

## Utils

### **generateDocuments**

Util `generateDocuments` can generate list of documents based on basic seed function

 Seed callback will receive sequential number of document of document, generated id, timestamp.
 Can be used to generate custom document with large set of options depends on needs. See examples below.

 | Property        | Description                                            | Type   |
 | --------------- | ------------------------------------------------------ | ------ |
 | docsCount       | number of documents to generate                        | `number` |
 | seed       | function that receives sequential number of document, generated id, timestamp as arguments and can used it create a document                    | `(index: number, id: string, timestamp: string) => Document` |
 | interval        | interval in which generate documents, defined by '@timestamp' field | `[string \| Date string \| Date]` _(optional)_ |

Examples:

 1. Generate 10 documents with random id, timestamp in interval between '2020-10-28T07:30:00.000Z', '2020-10-30T07:30:00.000Z', and field `seq` that represents sequential number of document

 ```ts

    const documents = generateDocuments({
        docsCount: 10,
        interval: ['2020-10-28T07:30:00.000Z', '2020-10-30T07:30:00.000Z'],
        seed: (i, id, timestamp) => ({ id, '@timestamp': timestamp, seq: i })
    })
 ```

<details>
<summary>Generated docs</summary>

    ```JSON
        [
            {
                "id": "87d3d231-13c8-4d03-9ae4-d40781b3b2d1",
                "@timestamp": "2020-10-30T04:00:55.790Z",
                "seq": 0
            },
            {
                "id": "90b99797-d0da-460d-86fd-eca40bedff39",
                "@timestamp": "2020-10-28T08:43:01.117Z",
                "seq": 1
            },
            {
                "id": "809c05be-f401-4e31-86e1-55be8af4fac4",
                "@timestamp": "2020-10-29T15:06:23.054Z",
                "seq": 2
            },
            {
                "id": "a2720f82-5401-4eab-b2eb-444a8425c937",
                "@timestamp": "2020-10-29T23:19:47.790Z",
                "seq": 3
            },
            {
                "id": "e36e4418-4e89-4388-97df-97085b3fca92",
                "@timestamp": "2020-10-29T09:14:00.966Z",
                "seq": 4
            },
            {
                "id": "4747adb3-0603-4651-8c0f-0c7df037f779",
                "@timestamp": "2020-10-28T14:23:50.500Z",
                "seq": 5
            },
            {
                "id": "1fbfd873-b0ca-4cda-9c96-9a044622e712",
                "@timestamp": "2020-10-28T10:00:20.995Z",
                "seq": 6
            },
            {
                "id": "9173cf93-1f9f-4f91-be5e-1e6888cb3aae",
                "@timestamp": "2020-10-28T08:52:27.830Z",
                "seq": 7
            },
            {
                "id": "53245337-e383-4b28-9975-acbd79901b7c",
                "@timestamp": "2020-10-29T08:58:02.385Z",
                "seq": 8
            },
            {
                "id": "0c700d33-df10-426e-8f71-677f437923ec",
                "@timestamp": "2020-10-29T16:33:10.240Z",
                "seq": 9
            }
        ]
    ```

</details>

 2. Generate 3 identical documents `{foo: bar}`

 ```ts

    const documents = generateDocuments({
        docsCount: 3,
        seed: () => ({ foo: 'bar' })
    })
 ```

<details>
<summary>Generated docs</summary>

    ```JSON
        [
            {
                "foo": "bar"
            },
            {
                "foo": "bar"
            },
            {
                "foo": "bar"
            }
        ]
    ```

</details>
 
 3. Generate 5 documents with custom ingested timestamp, with no interval. If interval not defined, timestamp will be current time

 ```ts

    const documents = generateDocuments({
        docsCount: 5,
        seed: (i, id, timestamp) => ({ foo: 'bar', event: { ingested: timestamp } })
    })
 ```

<details>
<summary>Generated docs</summary>

    ```JSON
    [
        {
            "foo": "bar",
            "event": {
            "ingested": "2023-02-15T13:02:37.531Z"
            }
        },
        {
            "foo": "bar",
            "event": {
            "ingested": "2023-02-15T13:02:37.531Z"
            }
        },
        {
            "foo": "bar",
            "event": {
            "ingested": "2023-02-15T13:02:37.531Z"
            }
        },
        {
            "foo": "bar",
            "event": {
            "ingested": "2023-02-15T13:02:37.531Z"
            }
        },
        {
            "foo": "bar",
            "event": {
            "ingested": "2023-02-15T13:02:37.531Z"
            }
        }
    ]
    ```

</details>

  4. Generate 4 documents with custom if based on sequential number id

 ```ts

    const documents = generateDocuments({
        docsCount: 4,
        seed: (i) => ({ foo: 'bar', id: `id-${i}`})
    })
 ```

<details>
<summary>Generated docs</summary>

    ```JSON
        [
            {
                "foo": "bar",
                "id": "id-0"
            },
            {
                "foo": "bar",
                "id": "id-1"
            },
            {
                "foo": "bar",
                "id": "id-2"
            },
            {
                "foo": "bar",
                "id": "id-3"
            }
        ]
    ```

</details>


### **enhanceDocument**

Adds generated `uuidv4` id and current time as `@timestamp` to document if `id`, `timestamp` params are not specified


`EnhanceDocumentOptions`

| Property        | Description                                            | Type   |
| --------------- | ------------------------------------------------------ | ------ |
| id       | id for document                      | `string` _(optional)_ |
| timestamp       | timestamp for document                   | `string` _(optional)_ |
| document        | document to enhance | `Record<string, unknown>` |

Examples:

1. Enhance document with generated `uuidv4` id and current time as `@timestamp`

    ```ts
        const document = enhanceDocument({
            document: { foo: 'bar' },
        });
    ```
    <details>
    <summary>document</summary>

    ```JSON
        {
            "foo": "bar",
            "id": "b501a64f-0dd4-4275-a38c-889be6a15a4d",
            "@timestamp": "2023-02-15T17:21:21.429Z"
        }
    ```

    </details>

2. Enhance document with generated `uuidv4` id and predefined timestamp


    ```ts
        const document = enhanceDocument({
            timestamp: '1996-02-15T13:02:37.531Z',
            document: { foo: 'bar' },
        });
    ```
    <details>
    <summary>document</summary>

    ```JSON
        {
            "foo": "bar",
            "id": "7b7460bf-e173-4744-af15-2c01ac52963b",
            "@timestamp": "1996-02-15T13:02:37.531Z"
        }
    ```

    </details>
    
3. Enhance document with predefined id and and current time as `@timestamp` 


    ```ts
        const document = enhanceDocument({
            id: 'test-id',
            document: { foo: 'bar' },
        });   
    ```
    <details>
    <summary>document</summary>

    ```JSON
        {
            "foo": "bar",
            "id": "test-id",
            "@timestamp": "2023-02-15T17:21:21.429Z"
        }
    ```
    </details>

### **enhanceDocuments**



Adds generated `uuidv4` `id` property to list of documents if `id` parameter is not specified.
Adds `@timestamp` in defined interval to list of documents. If it's not specified,  `@timestamp`  will be added as current time

| Property        | Description                                            | Type   |
| --------------- | ------------------------------------------------------ | ------ |
| documents        | documents to enhance | `Record<string, unknown>[]` |
| id       | id for documents                      | `string` _(optional)_ |
| interval        | interval in which generate documents, defined by '@timestamp' field | `[string \| Date string \| Date]` _(optional)_ |

Examples:

1. Enhance documents with generated `uuidv4` id and current time as `@timestamp`

    ```ts
        const documents = enhanceDocuments({
            documents: [{ foo: 'bar' }, { foo: 'bar-1' }, { foo: 'bar-2' }]
        });
    ```
    <details>
    <summary>documents</summary>

    ```JSON
        [
            {
                "foo": "bar",
                "id": "c55ddd6b-3cf2-4ebf-94d6-4eeeb4e5b655",
                "@timestamp": "2023-02-16T16:43:13.573Z"
            },
            {
                "foo": "bar-1",
                "id": "61b157b9-5f1f-4d99-a5bf-072069f5139d",
                "@timestamp": "2023-02-16T16:43:13.573Z"
            },
            {
                "foo": "bar-2",
                "id": "04929927-6d9e-4ccc-b083-250e3fe2d7a7",
                "@timestamp": "2023-02-16T16:43:13.573Z"
            }
        ]
    ```

    </details>

2. Enhance document with generated `uuidv4` id and timestamp in predefined interval

    ```ts
        const documents = enhanceDocuments({
            interval: ['1996-02-15T13:02:37.531Z', '2000-02-15T13:02:37.531Z'],
            documents: [{ foo: 'bar' }, { foo: 'bar-1' }, { foo: 'bar-2' }]
        });
    ```
    <details>
    <summary>documents</summary>

    ```JSON
        [
            {
                "foo": "bar",
                "id": "883a67cb-0a57-4711-bdf9-e8a394a52460",
                "@timestamp": "1998-07-04T15:16:46.587Z"
            },
            {
                "foo": "bar-1",
                "id": "70691d9e-1030-412f-8ae1-c6db50e90e91",
                "@timestamp": "1998-05-15T07:00:52.339Z"
            },
            {
                "foo": "bar-2",
                "id": "b2140328-5cc4-4532-947e-30b8fd830ed7",
                "@timestamp": "1999-09-01T21:50:38.957Z"
            }
        ]
    ```

    </details>
    
3. Enhance documents with predefined id and and current time as `@timestamp` 

    ```ts
        const documents = enhanceDocuments({
            id: 'test-id',
            documents: [{ foo: 'bar' }, { foo: 'bar-1' }, { foo: 'bar-2' }]
        });   
    ```
    <details>
    <summary>documents</summary>

    ```JSON
        [
            {
                "foo": "bar",
                "id": "test-id",
                "@timestamp": "2023-02-16T16:43:13.574Z"
            },
            {
                "foo": "bar-1",
                "id": "test-id",
                "@timestamp": "2023-02-16T16:43:13.574Z"
            },
            {
                "foo": "bar-2",
                "id": "test-id",
                "@timestamp": "2023-02-16T16:43:13.574Z"
            }
        ]

    ```
    </details>

## Usage

### create test query rule that queries indexed documents within a test

When documents generated and indexed, there might be a need to create a test rule that targets only these documents. So, documents generated in the test, will be used only in context of this test.

There are few possible ways to do this

1. Create new index every time for a new test. Thus, newly indexed documents, will be the only documents present in test index. It might be costly operation, as it will require to create new index for each test, that re-initialize dataGeneratorFactory, or delete index after rule's run

2. Use the same id or specific field in documents.
   For example:

    ```ts

          const id = uuidv4();
          const firstTimestamp = new Date().toISOString();
          const firstDocument = {
            id,
            '@timestamp': firstTimestamp,
            agent: {
              name: 'agent-1',
            },
          };
          await indexListOfDocuments([firstDocument, firstDocument]);

          const rule: QueryRuleCreateProps = {
            ...getRuleForSignalTesting(['ecs_compliant']),
            query: `id:${id}`,
          };


    ```

    All documents will have the same `id` and can be queried by following `id:${id}` 

3. Use utility method `getKQLQueryFromDocumentList` that will create query from all ids in generated documents

    ```ts
        const { documents } = await indexGeneratedDocuments({
            docsCount: 4,
            document: { foo: 'bar' },
            enhance: true,
        });

        const query = getKQLQueryFromDocumentList(documents);
        const rule = {
            ...getRuleForSignalTesting(['ecs_non_compliant']),
            query,
        };
    ```

    util will generate the following query: `(id: "f6ca3ee1-407c-4685-a94b-11ef4ed5136b" or id: "2a7358b2-8cad-47ce-83b7-e4418c266f3e" or id: "9daec569-0ba1-4c46-a0c6-e340cee1c5fb" or id: "b03c2fdf-0ca1-447c-b8c6-2cc5a663ffe2")`, that will include all generated documents