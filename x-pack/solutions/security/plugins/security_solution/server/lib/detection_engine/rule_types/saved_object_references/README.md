This is where you add code when you have rules which contain saved object references. Saved object references are for
when you have "joins" in the saved objects between one saved object and another one. This can be a 1 to M (1 to many)
relationship for example where you have a rule which contains the "id" of another saved object.

Examples are the `exceptionsList` on a rule which contains a saved object reference from the rule to another set of
saved objects of the type `exception-list`

## Useful queries
How to get all your alerts to see if you have `exceptionsList` on it or not in dev tools:

```json
GET .kibana/_search
{
  "query": {
    "term": {
      "type": {
        "value": "alert"
      }
    }
  }
}
```

If you want to manually test the downgrade of an alert then you can use this script.
```json
# Set saved object array references as empty arrays and set our migration version to be 7.14.0 
POST .kibana/_update/alert:38482620-ef1b-11eb-ad71-7de7959be71c
{
  "script" : {
    "source": """
    ctx._source.migrationVersion.alert = "7.14.0";
    ctx._source.references = []
    """,
    "lang": "painless"
  }
}
```

Reload the alert in the security_solution and notice you get these errors until you restart Kibana to cause a migration moving forward. Although you get errors,
everything should still operate normally as we try to work even if migrations did not run correctly for any unforeseen reasons.

For testing idempotentence, just re-run the same script above for a downgrade after you restarted Kibana.

## Structure on disk
Run a query in dev tools and you should see this code that adds the following savedObject references
to any newly saved rule:

```json
      {
        "_index" : ".kibana-hassanabad19_8.0.0_001",
        "_id" : "alert:38482620-ef1b-11eb-ad71-7de7959be71c",
        "_score" : 6.2607274,
        "_source" : {
          "alert" : {
            "name" : "kql test rule 1",
            "tags" : [],
            "alertTypeId" : "siem.signals",
            "other data... other data": "other data...other data",
              "exceptionsList" : [
                {
                  "id" : "endpoint_list",
                  "list_id" : "endpoint_list",
                  "namespace_type" : "agnostic",
                  "type" : "endpoint"
                },
                {
                  "id" : "50e3bd70-ef1b-11eb-ad71-7de7959be71c",
                  "list_id" : "cd152d0d-3590-4a45-a478-eed04da7936b",
                  "type" : "detection",
                  "namespace_type" : "single"
                }
              ],
          "other data... other data": "other data...other data",
          "references" : [
            {
              "name" : "param:exceptionsList_0",
              "id" : "endpoint_list",
              "type" : "exception-list-agnostic"
            },
            {
              "name" : "param:exceptionsList_1",
              "id" : "50e3bd70-ef1b-11eb-ad71-7de7959be71c",
              "type" : "exception-list"
            }
          ],
         "other data... other data": "other data...other data"
          }
        }
      }
```

The structure is that the alerting framework in conjunction with this code will make an array of saved object references which are going to be:
```json
{
  "references" : [
    {
      "name" : "param:exceptionsList_1",
      "id" : "50e3bd70-ef1b-11eb-ad71-7de7959be71c",
      "type" : "exception-list"
    }
  ]
}
```

`name` is the pattern of `param:${name}_${index}`. See the functions and constants in `utils.ts` of:

* EXCEPTIONS_LIST_NAME
* getSavedObjectNamePattern
* getSavedObjectNamePatternForExceptionsList
* getSavedObjectReference
* getSavedObjectReferenceForExceptionsList

For how it is constructed and retrieved. If you need to add more types, you should copy and create your own versions or use the generic
utilities/helpers if possible.

`id` is the saved object id and should always be the same value as the `"exceptionsList" : [ "id" : "50e3bd70-ef1b-11eb-ad71-7de7959be71c" ...`.
If for some reason the saved object id changes or is different, then on the next save/persist the `exceptionsList.id` will update to that within
its saved object. Note though, that the references id replaces _always_ the `exceptionsList.id` at all times through `inject_references.ts`. If
for some reason the `references` id is deleted, then on the next `inject_references` it will prefer to use the last good known reference and log
a warning.

Within the rule parameters you can still keep the last known good saved object reference id as above it is shown
```json
{
  "exceptionsList" : [
    {
      "id" : "endpoint_list",
      "list_id" : "endpoint_list",
      "namespace_type" : "agnostic",
      "type" : "endpoint"
    },
    {
      "id" : "50e3bd70-ef1b-11eb-ad71-7de7959be71c",
      "list_id" : "cd152d0d-3590-4a45-a478-eed04da7936b",
      "type" : "detection",
      "namespace_type" : "single"
    }
  ],
}
```

## How to add a new saved object id reference to a rule

See the files of:
* extract_references.ts
* inject_references.ts

And their top level comments for how to wire up new instances. It's best to create a new file per saved object reference and push only the needed data
per file.

Good examples and utilities can be found in the folder of `utils` such as:
* EXCEPTIONS_LIST_NAME
* getSavedObjectNamePattern
* getSavedObjectNamePatternForExceptionsList
* getSavedObjectReference
* getSavedObjectReferenceForExceptionsList

You can follow those patterns but if it doesn't fit your use case it's fine to just create a new file and wire up your new saved object references

## End to end tests
See `test/alerting_api_integration/spaces_only/tests/alerting/migrations.ts` for tests around migrations
