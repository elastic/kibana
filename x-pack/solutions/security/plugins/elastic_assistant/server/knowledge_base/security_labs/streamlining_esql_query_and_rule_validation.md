---
title: "Streamlining ES|QL Query and Rule Validation: Integrating with GitHub CI"
slug: "streamlining-esql-query-and-rule-validation"
date: "2023-11-17"
description: "ES|QL is Elastic's new piped query language. Taking full advantage of this new feature, Elastic Security Labs walks through how to run validation of ES|QL rules for the Detection Engine."
author:
  - slug: mika-ayenson
  - slug: eric-forte
image: "photo-edited-01.png"
category:
  - slug: security-research
---

One of the amazing, recently premiered [8.11.0 features](https://www.elastic.co/guide/en/elasticsearch/reference/current/release-highlights.html), is the Elasticsearch Query Language ([ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html)). As highlighted in an earlier [post by Costin Leau](https://www.elastic.co/blog/elasticsearch-query-language-esql), it’s a full-blown, specialized query and compute engine for Elasitcsearch. Now that it’s in technical preview, we wanted to share some options to _validate_ your ES|QL queries. This overview is for engineers new to ES|QL. Whether you’re searching for insights in Kibana or investigating security threats in [Timelines](https://www.elastic.co/guide/en/security/current/timelines-ui.html), you’ll see how this capability is seamlessly interwoven throughout Elastic.       

## ES|QL validation basics ft. Kibana & Elasticsearch

If you want to quickly validate a single query, or feel comfortable manually testing queries one-by-one, the Elastic Stack UI is all you need. After navigating to the Discover tab in Kibana, click on the "**Try ES|QL**" Technical Preview button in the Data View dropdown to load the query pane. You can also grab sample queries from the  [ES|QL Examples](https://www.elastic.co/guide/en/elasticsearch/reference/master/esql-examples.html) to get up and running. Introducing non-[ECS](https://www.elastic.co/guide/en/ecs/current/index.html) fields will immediately highlight errors prioritizing syntax errors, then unknown column errors.  

![](/assets/images/streamlining-esql-query-and-rule-validation/image7.png)

In this example, there are two syntax errors that are highlighted:  
* the invalid syntax error on the input `wheres` which should be `where` and  
* the unknown column `process.worsking_directory`, which should be `process.working_directory`.  

![](/assets/images/streamlining-esql-query-and-rule-validation/image3.png)

After resolving the syntax error in this example, you’ll observe the Unknown column errors. Here are a couple reasons this error may appear: 

 - **Fix Field Name Typos**: Sometimes you simply need to fix the name as suggested in the error; consult the ECS or any integration schemas and confirm the fields are correct
 - **Add Missing Data**: If you’re confident the fields are correct, sometimes adding data to your stack, which will populate the columns
 - **Update Mapping**: You can configure [Mappings](https://www.elastic.co/guide/en/elasticsearch/reference/8.11/mapping.html) to set explicit fields, or add new fields to an existing data stream or index using the [Update Mapping API](https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-put-mapping.html) 

## ES|QL warnings

Not all fields will appear as errors, in which case you’re presented with warnings and a dropdown list. Hard failures (e.g. errors), imply that the rule cannot execute, whereas warnings indicate that the rule can run, but the functions may be degraded.  

![](/assets/images/streamlining-esql-query-and-rule-validation/image6.png)

When utilizing broad ES|QL queries that span multiple indices, such as `logs-* | limit 10`, there might be instances where certain fields fail to appear in the results. This is often due to the fields being undefined in the indexed data, or not yet supported by ES|QL. In cases where the expected fields are not retrieved, it's typically a sign that the data was ingested into Elasticsearch without these fields being indexed, as per the established mappings. Instead of causing the query to fail, ES|QL handles this by returning "null" for the unavailable fields, serving as a warning that something in the query did not execute as expected. This approach ensures the query still runs, distinguishing it from a hard failure, which occurs when the query cannot execute at all, such as when a non-existent field is referenced.  

![](/assets/images/streamlining-esql-query-and-rule-validation/image12.png)

There are also helpful performance warnings that may appear. Providing a `LIMIT` parameter to the query will help address performance warnings. Note this example highlights that there is a default limit of 500 events returned. This limit may significantly increase once this feature is generally available. 

## Security 

In an investigative workflow, security practitioners prefer to iteratively hunt for threats, which may encompass manually testing, refining, and tuning a query in the UI. Conveniently, security analysts and engineers can natively leverage ES|QL in timelines, with no need to interrupt workflows by pivoting back and forth to a different view in Kibana. You’ll receive the same errors and warnings in the same security component, which shows Elasticsearch feedback under the hood.

![](/assets/images/streamlining-esql-query-and-rule-validation/image1.png)

In some components, you will receive additional feedback based on the context of where ES|QL is implemented. One scenario is when you create an ES|QL rule using the create new rule feature under the Detection Rules (SIEM) tab.

![](/assets/images/streamlining-esql-query-and-rule-validation/image8.png)

For example, this query could easily be converted to an [EQL](https://www.elastic.co/guide/en/elasticsearch/reference/current/eql.html) or [KQL](https://www.elastic.co/guide/en/kibana/current/kuery-query.html) query as it does not leverage powerful features of ES|QL like statistics, frequency analysis, or parsing unstructured data. If you want to learn more about the benefits of queries using ES|QL check out this [blog by Costin](https://www.elastic.co/blog/elasticsearch-query-language-esql), which covers performance boosts. In this case, we must add `[metadata _id, _version, _index]` to the query, which informs the UI which components to return in the results.

## API calls? Of course!

Prior to this section, all of the examples referenced creating ES|QL queries and receiving feedback directly from the UI. For illustrative purposes, the following examples leverage Dev Tools, but these calls are easily migratable to cURL bash commands or the language / tool of your choice that can send an HTTP request.

![](/assets/images/streamlining-esql-query-and-rule-validation/image4.png)

Here is the same query as previously shown throughout other examples, sent via a POST request to the [query API](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql-query-api.html) with a valid query.  

![](/assets/images/streamlining-esql-query-and-rule-validation/image10.png)

As expected, if you supply an invalid query, you’ll receive similar feedback observed in the UI. In this example, we’ve also supplied the `?error_trace` flag which can provide the stack trace if you need additional context for why the query failed validation. 

As you can imagine, we can use the API to programmatically validate ES|QL queries. You can also still use the [Create rule](https://www.elastic.co/guide/en/kibana/current/create-rule-api.html) Kibana API, which requires a bit more metadata associated with a security rule. However, if you want to only validate a query, the `_query` API comes in handy. From here you can use the [Elasticsearch Python Client](https://www.elastic.co/guide/en/elasticsearch/client/python-api/current/index.html) to connect to your stack and validate queries.

```
from elasticsearch import Elasticsearch
client = Elasticsearch(...)
data = {
"query": """
    from logs-endpoint.events.*
    | keep host.os.type, process.name, process.working_directory, event.type, event.action
    | where host.os.type == "linux" and process.name == "unshadow" and event.type == "start"     and event.action in ("exec", "exec_event")
"""
}

# Execute the query
headers = {"Content-Type": "application/json", "Accept": "application/json"}
response = client.perform_request(
"POST", "/_query", params={"pretty": True}, headers=headers, body=data
)
```

## Leverage the grammar

One of the best parts of Elastic developing in the open is the [antlr ES|QL grammar](https://github.com/elastic/elasticsearch/tree/main/x-pack/plugin/esql/src/main/antlr) is also available.  

![](/assets/images/streamlining-esql-query-and-rule-validation/image5.png)

If you’re comfortable with [ANTLR](https://www.antlr.org), you can also download the latest JAR to build a lexer and parser.

```
pip install antlr4-tools # for antlr4
git clone git@github.com:elastic/elasticsearch.git # large repo
cd elasticsearch/x-pack/plugin/esql/src/main/antlr # navigate to grammar
antlr4 -Dlanguage=Python3 -o build EsqlBaseLexer.g4 # generate lexer
antlr4 -Dlanguage=Python3 -o build EsqlBaseParser.g4 # generate parser
```

This process will require more lifting to get ES|QL validation started, but you’ll at least have a tree object built, that provides more granular control and access to the parsed fields.

![](/assets/images/streamlining-esql-query-and-rule-validation/image13.png)

However, as you can see the listeners are stubs, which means you’ll need to build in semantics _manually_ if you want to go this route.

## The security rule GitHub CI use case

For our internal Elastic EQL and KQL query rule validation, we utilize the parsed abstract syntax tree (AST) objects of our queries to perform nuanced semantic validation across multiple stack versions. For example, having the AST allows us to validate proper field usage, verify new features are not used in older stack versions before being introduced, or even more, ensure related integrations are built based on datastreams used in the query. Fundamentally, local validation allows us to streamline a broader range of support for many stack features and versions. If you’re interested in seeing more of the design and rigorous validation that we can do with the AST, check out our [detection-rules repo](https://github.com/elastic/detection-rules/tree/main).
   
If you do not need granular access to the specific parsed tree objects and do not need to control the semantics of ES|QL validation, then out-of-the-box APIs may be all you need to validate queries. In this use case, we want to validate security detection rules using continuous integration. Managing detection rules through systems like GitHub helps garner all the benefits of using a version-controlled like tracking rule changes, receiving feedback via pull requests, and more. Conceptually, rule authors should be able to create these rules (which contain ES|QL queries) locally and exercise the git rule development lifecycle. 

CI checks help to ensure queries still pass ES|QL validation without having to manually check the query in the UI. Based on the examples shown thus far, you have to either stand up a persistent stack and validate queries against the API, or build a parser implementation based on the available grammar outside of the Elastic stack. 

One approach to using a short-lived Elastic stack versus leveraging a managed persistent stack is to use the [Elastic Container Project (ECP)](https://github.com/peasead/elastic-container). As advertised, this project will: 

_Stand up a 100% containerized Elastic stack, TLS secured, with Elasticsearch, Kibana, Fleet, and the Detection Engine all pre-configured, enabled, and ready to use, within minutes._

![](/assets/images/streamlining-esql-query-and-rule-validation/image11.png)

With a combination of: 

 - Elastic Containers (e.g. ECP)
 - CI (e.g. Github Action Workflow)
 - ES|QL rules
 - Automation Foo (e.g. python & bash scripts)

You can validate ES|QL rules via CI against the _latest stack version_ relatively easily, but there are some nuances involved in this approach.

![](/assets/images/streamlining-esql-query-and-rule-validation/image2.gif)

Feel free to check out the sample [GitHub action workflow](https://gist.github.com/Mikaayenson/7fa8f908ab7e8466178679a9a0cd9ecc) if you’re interested in a high-level overview of how it can be implemented.

**Note:** if you're interested in using the GitHub action workflow, check out their documentation on using GitHub [secrets in Actions](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions) and [setting up Action workflows](https://docs.github.com/en/actions/quickstart).

## CI nuances

 1. Any custom configuration needs to be scripted away (e.g. setting up additional policies, [enrichments](https://www.elastic.co/guide/en/elasticsearch/reference/current/match-enrich-policy-type.html), etc.) In our POC, we created a step and bash script that executed a series of POST requests to our temporary CI Elastic Stack, which created the new enrichments used in our detection rules.

```
- name: Add Enrich Policy
  env:
    ELASTICSEARCH_SERVER: "https://localhost:9200"
    ELASTICSEARCH_USERNAME: "elastic"
    ELASTICSEARCH_PASSWORD: "${{ secrets.PASSWORD }}"
  run: |
    set -x
    chmod +x ./add_enrich.sh
    bash ./add_enrich.sh
```

 2. Without data in our freshly deployed CI Elastic stack, there will be many `Unknown Column` issues as previously mentioned. One approach to address this is to build indices with the proper mappings for the queries to match. For example, if you have a query that searches the index `logs-endpoint.events.*`, then create an index called `logs-endpoint.events.ci`, with the proper mappings from the integration used in the query.  
 
 3. Once the temporary stack is configured, you’ll need extra logic to iterate over all the rules and validate using the `_query` API. For example, you can create a unit test that iterates over all the rules. We do this today by leveraging our default `RuleCollection.default()` that loads all rules, in our detection-rules repo, but here is a snippet that quickly loads only ES|QL rules.
 

```
# tests/test_all_rules.py
class TestESQLRules:
    """Test ESQL Rules."""

    @unittest.skipIf(not os.environ.get("DR_VALIDATE_ESQL"),
         "Test only run when DR_VALIDATE_ESQL environment variable set.")
    def test_environment_variables_set(self):
        collection = RuleCollection()

        # Iterate over all .toml files in the given directory recursively
        for rule in Path(DEFAULT_RULES_DIR).rglob('*.toml'):
            # Read file content
            content = rule.read_text(encoding='utf-8')
            # Search for the pattern
            if re.search(r'language = "esql"', content):
                print(f"Validating {str(rule)}")
                collection.load_file(rule)
```

 Each rule would run through a validator method once the file is loaded with `load_file`. 

```
# detection_rules/rule_validator.py
class ESQLValidator(QueryValidator):
    """Specific fields for ESQL query event types."""

    def validate(self, data: 'QueryRuleData', meta: RuleMeta) -> None:
        """Validate an ESQL query while checking TOMLRule."""
        if not os.environ.get("DR_VALIDATE_ESQL"):
            return

        if Version.parse(meta.min_stack_version) < Version.parse("8.11.0"):
            raise ValidationError(f"Rule minstack must be greater than 8.10.0 {data.rule_id}")

        client = Elasticsearch(...)
        client.info()
        client.perform_request("POST", "/_query", params={"pretty": True},
                               headers={"accept": "application/json", 
                                        "content-type": "application/json"},
                               body={"query": f"{self.query} | LIMIT 0"})
```

  As highlighted earlier, we can `POST` to the query API and validate given the credentials that were set as GitHub action secrets and passed to the validation as environment variables.  Note, the `LIMIT 0` is so the query does not return data intentionally. It’s meant to only perform validation.  Finally the single CI step would be a bash call to run the unit tests (e.g. `pytest tests/test_all_rules.py::TestESQLRules`). 

 4. Finally, CI leveraging containers may not scale well when validating many rules against multiple Elastic stack versions and configurations. Especially if you would like to test on a commit-basis. The time to deploy one stack took slightly over five minutes to complete. This measurement could greatly increase or decrease depending on your CI setup.   
 
## Conclusion

Elasticsearch's new feature, Elasticsearch Query Language (ES|QL), is a specialized query and compute engine for Elasticsearch, now in technical preview. It offers seamless integration across various Elastic services like Kibana and Timelines, with validation options for ES|QL queries. Users can validate queries through the Elastic Stack UI or API calls, receiving immediate feedback on syntax or column errors. 

Additionally, ES|QL's ANTLR grammar is [available](https://github.com/elastic/elasticsearch/tree/d5f5d0908ff7d1bfb3978e4c57aa6ff517f6ed29/x-pack/plugin/esql/src/main/antlr) for those who prefer a more hands-on approach to building lexers and parsers. We’re exploring ways to validate ES|QL queries in an automated fashion and now it’s your turn. Just know that we’re not done exploring, so check out ES|QL and let us know if you have ideas! We’d love to hear how you plan to use it within the stack natively or in CI.

We’re always interested in hearing use cases and workflows like these, so as always, reach out to us via [GitHub issues](https://github.com/elastic/detection-rules/issues), chat with us in our [community Slack](http://ela.st/slack), and ask questions in our [Discuss forums](https://discuss.elastic.co/c/security/endpoint-security/80).

Check out these additional resources to learn more about how we’re bringing the latest AI capabilities to the hands of the analyst:
Learn everything [ES|QL](https://www.elastic.co/guide/en/elasticsearch/reference/current/esql.html) 
Checkout the 8.11.0 release blog [introducing ES|QL](https://www.elastic.co/blog/whats-new-elasticsearch-platform-8-11-0)
