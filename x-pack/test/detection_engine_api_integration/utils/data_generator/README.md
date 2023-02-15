# Data Generator for functional tests

## DataGenerator

### Initialization

### Use **indexListOfDocuments**
### Use **indexGeneratedDocuments**

## Utils

### Use **generateDocuments**

Util `generateDocuments` can generate list of documents based on basic seed JSON or callback

* #### **Use of simple JSON object**

 | Property        | Description                                            | Type   |
 | --------------- | ------------------------------------------------------ | ------ |
 | docsCount       | number of documents to generate                        | `number` |
 | document       | JSON of document to replicate           | `Record<string, unknown>` |
 | enhance       | enhance document with {@link enhanceDocument} function if true          | `boolean` _(optional)_|
 | interval        | interval in which generate documents, defined by '@timestamp' field | `[string | Date, string | Date]` _(optional)_ |


 #### Examples:
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

* #### **Use of seed callback**

 | Property        | Description                                            | Type   |
 | --------------- | ------------------------------------------------------ | ------ |
 | docsCount       | number of documents to generate                        | `number` |
 | seed       | function that receives index of document, generated id, timestamp as arguments and can used it create a document                    | `(index: number, id: string, timestamp: string) => Document` |
 | interval        | interval in which generate documents, defined by '@timestamp' field | `[string | Date, string | Date]` _(optional)_ |

 #### Examples:
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