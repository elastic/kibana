Within this folder is input test data for tests within the folder:

```ts
x-pack/test/security_solution_api_integration/test_suites/detections_response/detection_engine/rule_execution_logic/trial_license_complete_tier/keyword_family
```

where these are small ECS compliant input indexes that try to express tests that exercise different parts of
the detection engine around creating and validating that the keyword family and field aliases all will work 
with the detection engine. These indexes might contain extra fields or different fields but should not directly
clash with ECS or minimally clash. Nothing is stopping anyone from being ECS strict and not having additional
extra fields but the extra fields and mappings are to just try and keep these tests simple and small.

Most of these tests center around the two fields of:
* event.module
* event.dataset

To ensure that if mix and match between `keyword`, `const keyword` and field aliases within them, everything should
still be ok. It is alright if other use cases are added here if they fit within the `keyword` family as described here:
https://www.elastic.co/guide/en/elasticsearch/reference/7.12/keyword.html
 
