# Investigation RCA Evaluation Framework

## Overview

This tool is developed for our team working on the Elastic Observability platform, specifically focusing on evaluating the Investigation RCA AI Integration. It simplifies scripting and evaluating various scenarios with the Large Language Model (LLM) integration.

## Setup requirements

- An Elasticsearch instance configured with cross cluster search pointing to the edge-rca cluster
- A Kibana instance
- At least one .gen-ai connector set up

## Running evaluations

### Prerequists

#### Elasticsearch instance

You'll need an instance configured with cross cluster search for the [edge-rca](https://studious-disco-k66oojq.pages.github.io/edge-rca/) cluster. To create one, utilize [oblt-cli](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/) and select `edge-rca` as the remote cluster.

Once your cluster is created, paste the the yml config provided in your `kibana.dev.yml` file.

#### Fixture data

To load the fixtures needed for the tests, first run:

`$ node x-pack/solutions/observability/plugins/investigate_app/scripts/load/index.js --kibana http://admin:[YOUR_CLUSTER_PASSWORD]@localhost:5601`

### Executing tests

Run the tool using:

`$ $ node x-pack/solutions/observability/plugins/observability_ai_assistant_app/scripts/evaluation/index.js --files=x-pack/solutions/observability/plugins/investigate_app/scripts/evaluate/scenarios/rca/index.spec.ts --kibana http://admin:[YOUR_CLUSTER_PASSWORD]@localhost:5601`

This will evaluate all existing scenarios, and write the evaluation results to the terminal.

### Configuration

#### Kibana and Elasticsearch

By default, the tool will look for a Kibana instance running locally (at `http://localhost:5601`, which is the default address for running Kibana in development mode). It will also attempt to read the Kibana config file for the Elasticsearch address & credentials. If you want to override these settings, use `--kibana` and `--es`. Only basic auth is supported, e.g. `--kibana http://username:password@localhost:5601`. If you want to use a specific space, use `--spaceId`

#### Connector

Use `--connectorId` to specify a `.gen-ai` or `.bedrock` connector to use. If none are given, it will prompt you to select a connector based on the ones that are available. If only a single supported connector is found, it will be used without prompting.

#### Persisting conversations

By default, completed conversations are not persisted. If you do want to persist them, for instance for reviewing purposes, set the `--persist` flag to store them. This will also generate a clickable link in the output of the evaluation that takes you to the conversation.

If you want to clear conversations on startup, use the `--clear` flag. This only works when `--persist` is enabled. If `--spaceId` is set, only conversations for the current space will be cleared.

When storing conversations, the name of the scenario is used as a title. Set the `--autoTitle` flag to have the LLM generate a title for you.
