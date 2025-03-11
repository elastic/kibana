import { formatEntriesAtKey, getEntriesAtKey, GetEntriesAtKeyMapping } from "./inspect_index_utils"

const sampleMapping1 = {
    "mappings": {
        "properties": {
            "field1": {
                "type": "keyword"
            },
            "field2": {
                "properties": {
                    "nested_field": {
                        "type": "keyword"
                    }
                }
            }
        }
    }
}

describe("inspect index", () => {
    it.each([
        [sampleMapping1, ["mappings", "properties"], {
            "field1": {
                "type": "keyword"
            },
            "field2": {
                "properties": {
                    "nested_field": {
                        "type": "keyword"
                    }
                }
            }
        }],
        [sampleMapping1, ["mappings", "properties", "field1"], {
            "type": "keyword"
        }],
    ])('getEntriesAtKey input %s returns %s', (mapping: GetEntriesAtKeyMapping, key: string[], expectedResult: GetEntriesAtKeyMapping) => {
        expect(getEntriesAtKey(mapping, key)).toEqual(expectedResult)
    })

    it.each([
        [{
            "type": "keyword"
        }, {
            "type": "keyword"
        }],
        [{
            "field1": {
                "type": "keyword"
            },
            "field2": {
                "properties": {
                    "nested_field": {
                        "type": "keyword"
                    }
                }
            }
        }, {
            "field1": "Object",
            "field2": "Object"
        }],
        [{
            "field1": "keyword",
            "field2": {
                "properties": {
                    "nested_field": {
                        "type": "keyword"
                    }
                }
            }
        }, {
            "field1": "keyword",
            "field2": "Object"
        }]
    ])('formatEntriesAtKey input %s returns %s', (mapping: GetEntriesAtKeyMapping, expectedResult: Record<string, string>) => {
        expect(formatEntriesAtKey(mapping)).toEqual(expectedResult)
    })
})