# Investigation RCA Evaluation Framework

## Overview

This tool is developed for our team working on the Elastic Observability platform, specifically focusing on evaluating the Investigation RCA AI Integration. It simplifies archiving data critical for evaluating the Investigation UI and it's integration with large language models (LLM).

## Setup requirements

- An Elasticsearch instance

You'll need an instance configured with cross cluster search for the [edge-rca](https://studious-disco-k66oojq.pages.github.io/edge-rca/) cluster. To create one, utilize [oblt-cli](https://studious-disco-k66oojq.pages.github.io/user-guide/cluster-create-ccs/) and select `edge-rca` as the remote cluster.

## Running archive

Run the tool using:

`$ node x-pack/solutions/observability/plugins/investigate_app/scripts/archive/index.js --kibana http://admin:[YOUR_CLUSTER_PASSWORD]@localhost:5601`

This will archive the observability alerts index to use as fixtures within the tests.

Archived data will automatically be saved at the root of the kibana project in the `.rca/archives` folder.

## Creating a test fixture

To create a test fixture, create a new folder in `x-pack/solutions/observability/plugins/investigate_app/scripts/load/fixtures` with the `data.json.gz` file and the `mappings.json` file. The fixture will now be loaded when running `$ node x-pack/solutions/observability/plugins/investigate_app/scripts/load/index.js`

### Configuration

#### Kibana and Elasticsearch

By default, the tool will look for a Kibana instance running locally (at `http://localhost:5601`, which is the default address for running Kibana in development mode). It will also attempt to read the Kibana config file for the Elasticsearch address & credentials. If you want to override these settings, use `--kibana` and `--es`. Only basic auth is supported, e.g. `--kibana http://username:password@localhost:5601`. If you want to use a specific space, use `--spaceId`

#### filePath

Use `--filePath` to specify a custom file path to store your archived data. By default, data is stored at `.rca/archives`
