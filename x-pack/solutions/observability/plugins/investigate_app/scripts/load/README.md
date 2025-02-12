# Investigation RCA Evaluation Framework

## Overview

This tool is developed for our team working on the Elastic Observability platform, specifically focusing on evaluating the Investigation RCA AI Integration. It simplifies archiving data critical for evaluating the Investigation UI and it's integration with large language models (LLM).

## Setup requirements

- An Elasticsearch instance

You'll need an instance configured with cross cluster search for the [edge-rca](https://studious-disco-k66oojq.pages.github.io/edge-rca/) cluster. To create one, utilize [oblt-cli](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/) and select `edge-rca` as the remote cluster.

## Running archive

Run the tool using:

`$ node x-pack/solutions/observability/plugins/investigate_app/scripts/load/index.js --kibana http://admin:[YOUR_CLUSTER_PASSWORD]@localhost:5601`

This will load all fixtures located in `./fixtures`.

### Configuration

#### Kibana and Elasticsearch

By default, the tool will look for a Kibana instance running locally (at `http://localhost:5601`, which is the default address for running Kibana in development mode). It will also attempt to read the Kibana config file for the Elasticsearch address & credentials. If you want to override these settings, use `--kibana` and `--es`. Only basic auth is supported, e.g. `--kibana http://username:password@localhost:5601`. If you want to use a specific space, use `--spaceId`
