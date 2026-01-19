# Summary

Original PR: https://github.com/elastic/kibana/pull/127218
The goal here is to create a system of schemas that are:

- Easy to read
- Usable historical records of alert schemas from previous Kibana versions
- Accurate for every field
- Usable on both server and client side

# Motivation - Development speed and quality

We have already run into one bug (https://github.com/elastic/kibana/issues/125885) where a required field was not populated in some alert documents. Once a bug ships that creates documents incorrectly, any fix requires user action to initiate a re-index of the alerts in addition to the developer time to create and validate the fix. The changes proposed here would catch this bug at compile time. These sorts of bugs become harder to catch as the schema evolves over time and fields get added, removed, and changed. Keeping the schemas separated by version will help reduce the risk of repeated schema changes over time causing fields to be incorrectly included in or omitted from alert documents.

We are also spending more time than necessary communicating details of the alerts schema over Slack and Zoom. It will be far more efficient for the code to clearly communicate more details about the alert schema. With a more comprehensive static schema, the knowledge will transfer to new developers more efficiently.

Static types are a powerful tool for ensuring code correctness. However, each deviation of the static type from the actual runtime structure adds places where developers may need to cast, assert, or use conditional logic to satisfy the compiler. The current static types require frequent workarounds when the static types don't match what developers know or believe is true about the runtime type of the alert documents. These runtime workarounds establish patterns that evade the type system - costing developer time to create and maintain in addition to increasing the risk of bugs due to the additional complexity. Accurate static types are excellent documentation of the data structures we use but it's crucial that the static types are comprehensive to minimize cases where runtime checks are needed.

# Structure - Common Alert Schema Directory

The schemas in this directory have 2 primary purposes: (1) separate the alert document schemas from the FieldMaps, and (2) set up a code structure that enables easy versioning of alert schemas. During the Detection Engine migration to the rule registry we used the FieldMaps to define the alert schema, but ended up with numerous type casts and some bugs in the process. This common directory stores the various alert schemas by Kibana version.

## Reading vs writing alerts

When writing code that deals with creating a new alert document, always use the schema from alerts/index.ts, not from a specific version. This way when the schema is updated in the future, your code will automatically use the latest alert schema and the static type system will tell us if code is writing alerts that don't conform to the new schema.

When writing code that deals with reading alerts, it must be able to handle alerts from any schema version. The "read schema" in index.ts, `DetectionAlert`, is a union of all of the versioned alert schemas since a valid alert from the .alerts index could be from any version.

Generally, Solution code should not be directly importing alert schemas from a specific version. Alert writing code should use the latest schema, and alert reading code should use the union of all schemas.

## Adding new schemas

To add new fields, simply add your field to the schema and label it with the appropriate version. The `type` should be the type we _write_ into the alert doc - so if it's required for all new alerts going forward, make it required in the type. This will cause the field to show up as required in the newest alert version but it will not appear in generated types for older versions so when we _read_ alerts, the union type of all alert schemas will correctly represent that new required fields are maybe undefined in some alerts.

# Design decisions

- Why not combine the FieldMaps and alert schema, creating a single structure that can define both?
  FieldMaps are integrated tightly with Elasticsearch mappings already, with minimal support for accurate TypeScript types of the fields. We want to avoid adding tons of extra information in to the FieldMaps that would not be used for the Elasticsearch mappings. Instead later we can write a bit of code to ensure that the alert schemas are compatible with the FieldMap schemas, essentially ensuring that the alert schemas extend the FieldMap schemas.

- Why do we need to version the schemas instead of adding all new fields as | undefined?
  Adding new fields as | undefined when they're actually required reduces the accuracy of the schema, which makes it less useful and harder to work with. If we decide to add a new field and always populate it going forward then accurately representing that in the static type makes it easier to work with alerts during the alert creation process. When a field is typed as | undefined but a developer knows that it should always exist, it encourages patterns that fight the type system through type-casting, assertions, using ?? <some default value>, etc. This makes the code harder to read, harder to reason about, and thus harder to maintain because the knowledge of "this field is typed as | undefined but actually always exists here" is not represented in the code and only lives in developers minds. Versioned alert schemas aim to turn the static types into an asset that precisely documents what the alert document structure is.
