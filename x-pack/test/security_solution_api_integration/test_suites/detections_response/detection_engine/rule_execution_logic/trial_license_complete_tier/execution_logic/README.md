### Security Rule Execution Logic Tests

These tests use the rule preview API as a fast way to verify that rules generate alerts as expected with various parameter settings. This avoids the costly overhead of creating a real rule and waiting for it to be scheduled. The preview route also returns rule statuses directly in the API response instead of writing the statuses to saved objects, which saves significant time as well.

For assurance that the real rule execution works, one test for each rule type still creates a real rule and waits for the execution through the alerting framework and resulting alerts.

As a result, the tests here typically run ~10x faster than the tests they replaced that were creating actual rules and running them. We can therefore add more tests here and get better coverage of the rule execution logic (which is currently, as of 8.5, somewhat lacking).

Since the rule execution logic is primarily focused around generating and executing Elasticsearch queries, we need significant testing around whether or not the queries are returning the expected results. This is not achievable with unit tests at the moment, since we need to mock Elasticsearch results. The tests here are the preferred way to ensure that rules are executing the correct logic to generate alerts from source data.

Testing rules with exceptions is still slow, even with the preview API, because the exception list has to be created for real and then cleaned up after the test - exceptions live in saved objects, so creating exceptions for individual tests slows them down significantly (>1s per test vs ~200ms for a test without exceptions). This is an area for future improvement.
