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
  - [Utils](#utils)
    - [**generateDocuments**](#generatedocuments)
      - [Simple JSON object](#simple-json-object)
        - [Examples](#examples)
      - [Seed callback](#seed-callback)
        - [Examples](#examples-1)
    - [**enhanceDocument**](#enhancedocument)
      - [Examples](#examples-2)

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

## Utils

### **generateDocuments**

Util `generateDocuments` can generate list of documents based on basic seed JSON or callback

#### Simple JSON object

Pass json object as document example and it will generate specified number of these documents.
Option `enhance` will randomly generated `id` and `@timestamp` in specified interval or current time

 | Property        | Description                                            | Type   |
 | --------------- | ------------------------------------------------------ | ------ |
 | docsCount       | number of documents to generate                        | `number` |
 | document       | JSON of document to replicate           | `Record<string, unknown>` |
 | enhance       | enhance document with {@link enhanceDocument} function if true          | `boolean` _(optional)_|
 | interval        | interval in which generate documents, defined by '@timestamp' field | `[string | Date, string | Date]` _(optional)_ |


 ##### Examples

 1. Generate 10 documents with random id, timestamp in interval between '2020-10-28T07:30:00.000Z', '2020-10-30T07:30:00.000Z', by using `enhance=true`

 ```ts

    const documents = generateDocuments({
        docsCount: 10,
        interval: ['2020-10-28T07:30:00.000Z', '2020-10-30T07:30:00.000Z'],
        document: { foo: "bar" },
        enhance: true
    })
 ```

<details>
<summary>Generated docs</summary>

```JSON
    [
        {
            "foo": "bar",
            "id": "f07df596-65ec-4ab1-b0b2-f3b69558ed26",
            "@timestamp": "2020-10-29T07:10:51.989Z"
        },
        {
            "foo": "bar",
            "id": "e07614f9-1dc5-4849-90c4-31362bbdf8d0",
            "@timestamp": "2020-10-30T00:32:48.987Z"
        },
        {
            "foo": "bar",
            "id": "e03a5b12-77e6-4aa3-b0be-fbe5b0843f07",
            "@timestamp": "2020-10-29T03:40:35.318Z"
        },
        {
            "foo": "bar",
            "id": "7ed3a989-8319-4630-a5b9-78aad1dad61d",
            "@timestamp": "2020-10-28T14:38:40.180Z"
        },
        {
            "foo": "bar",
            "id": "9c7c1771-d0dd-41be-b9e1-30537d37472a",
            "@timestamp": "2020-10-30T05:47:35.240Z"
        },
        {
            "foo": "bar",
            "id": "bd643e54-47c4-48a5-89e5-8ee84909f81f",
            "@timestamp": "2020-10-29T07:13:01.925Z"
        },
        {
            "foo": "bar",
            "id": "fe32029a-52c0-4d3f-8afb-1e8091000ee5",
            "@timestamp": "2020-10-29T07:26:04.694Z"
        },
        {
            "foo": "bar",
            "id": "25c705aa-08c6-4201-a236-e8c312c46ede",
            "@timestamp": "2020-10-29T00:31:39.135Z"
        },
        {
            "foo": "bar",
            "id": "e03b2e3f-d0f5-4b13-8fa8-0eab0cbcc2fc",
            "@timestamp": "2020-10-29T12:51:42.669Z"
        },
        {
            "foo": "bar",
            "id": "06dbbaf9-0e56-49f6-b6e9-e7c0968be77c",
            "@timestamp": "2020-10-29T17:58:09.648Z"
        }
    ]
```

</details>

 2. Generate 3 identical documents `{foo: bar}` by using default `enhance=false`

 ```ts

    const documents = generateDocuments({
        docsCount: 3,
        document: { foo: "bar" }
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

 3. Generate 4 documents `{foo: bar}` by using `enhance=true` without interval

 ```ts

    const documents = generateDocuments({
        enhance: true,
        docsCount: 4,
        document: { foo: "bar" }
    })
 ```

<details>
<summary>Generated docs</summary>

    ```JSON
        [
            {
                "foo": "bar",
                "id": "73ec5c8d-3123-4faa-966c-9c6ef7c812b6",
                "@timestamp": "2023-02-15T17:37:50.824Z"
            },
            {
                "foo": "bar",
                "id": "f9435e8b-faa8-415f-a3af-cf4ecfaca1cf",
                "@timestamp": "2023-02-15T17:37:50.824Z"
            },
            {
                "foo": "bar",
                "id": "55b526ce-d2f2-47c7-a01e-0b23d6bc7de1",
                "@timestamp": "2023-02-15T17:37:50.824Z"
            },
            {
                "foo": "bar",
                "id": "eb4a33d1-fa7b-4a57-8ab5-ba245fac5c20",
                "@timestamp": "2023-02-15T17:37:50.824Z"
            }
        ]
    ```

</details>

#### Seed callback

 Seed callback will receive sequential number of document of document, generated id, timestamp.
 Can be used to generate custom document with large set of options depends on needs. See examples below.

 | Property        | Description                                            | Type   |
 | --------------- | ------------------------------------------------------ | ------ |
 | docsCount       | number of documents to generate                        | `number` |
 | seed       | function that receives sequential number of document, generated id, timestamp as arguments and can used it create a document                    | `(index: number, id: string, timestamp: string) => Document` |
 | interval        | interval in which generate documents, defined by '@timestamp' field | `[string | Date, string | Date]` _(optional)_ |

 ##### Examples

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

#### Examples

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
    
3. Enhance document with predefined id `uuidv4` id and and current time as `@timestamp` 


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