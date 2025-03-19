# Observability AI Assistant Evaluation Framework

## Overview

This tool is developed for our team working on the Elastic Observability platform, specifically focusing on evaluating the Observability AI Assistant. It simplifies scripting and evaluating various scenarios with Large Language Model (LLM) integrations.

## Setup requirements

- An Elasticsearch instance
- A Kibana instance
- At least one .gen-ai connector set up

## Running evaluations

### Configuration

#### To run the evaluation using a local Elasticsearch and Kibana instance:

- Run Elasticsearch locally: `yarn es snapshot --license trial`
- Start Kibana (Default address for Kibana in dev mode: `http://localhost:5601`)
- Run this command to start evaluating:
`$ node x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/index.js`

This will evaluate all existing scenarios, and write the evaluation results to the terminal.

#### To run the evaluation using a hosted deployment:

- Add the credentials of Elasticsearch to `kibana.dev.yml` as follows:

```
elasticsearch.hosts: https://<hosted-url>:<port>
elasticsearch.username: <username>
elasticsearch.password: <password>
elasticsearch.ssl.verificationMode: none
elasticsearch.ignoreVersionMismatch: true
```

- Start Kibana
- Run this command to start evaluating: `node x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/index.js --kibana http://<username>:<password>@localhost:5601`

By default the script will use the Elasticsearch credentials specified in `kibana.dev.yml`, if you want to override it use the `--es` flag when running the evaluation script:
E.g.: `node x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/index.js --kibana http://<username>:<password>@localhost:5601 --es https://<username>:<password>@<hosted-url>:<port>`

The `--kibana` and `--es` flags override the default credentials. Only basic auth is supported.

## Other (optional) configuration flags

- `--connectorId` - Specify a generative AI connector to use. If none are given, it will prompt you to select a connector based on the ones that are available. If only a single supported connector is found, it will be used without prompting.
- `--evaluateWith`: The connector ID to evaluate with. Leave empty to use the same connector, use "other" to get a selection menu.
- `--spaceId` - Specify the space ID if you want to use a specific space.
- `--persist` - By default, completed conversations are not persisted. If you want to persist them, for instance for reviewing purposes, include this flag when running the evaluation script. This will also generate a clickable link in the output of the evaluation that takes you to the conversation in Kibana.
- `--clear` - If you want to clear conversations on startup, include this command when running the evaluation script. This only works when `--persist` is enabled. If `--spaceId` is set, only conversations for the current space will be cleared
- `--autoTitle`: When storing conversations, the name of the scenario is used as a title. Set this flag to have the LLM generate a title for you. This only works when `--persist` is enabled.
- `--files`: A file or list of files containing the scenarios to evaluate. Defaults to all.
- `--grep`: A string or regex to filter scenarios by.
