### Knowledge Base Assets

This directory contains assets for the Knowledge Base feature. The assets are used by the Elastic AI Assistant to answer questions about content that the underlying model may not have been trained on. Initial assets are provided for the following categories:

* ES|QL
  * General Documentation as from: <https://github.com/elastic/elasticsearch/tree/main/docs/reference/esql>
    * Excluding `functions/signature/*.svg`
  * ANTLR Language Definitions as from: <https://github.com/elastic/elasticsearch/tree/main/x-pack/plugin/esql/src/main/antlr>
  * Sample queries that represent valid (and invalid) ES|QL queries, curated manually from a variety of sources

The assets are stored in their original source format, so `.asciidoc` for documentation, and `.g4` and `.tokens` for the ANTLR language definitions. File names have been updated to be snake_case to satisfy Kibana linting rules.

NOTE: When adding knowledge base assets, please ensure that the source files and directories are not excluded as part of the Kibana build process, otherwise things will work fine locally, but will fail once a distribution has been built (i.e. cloud deployments). See `src/dev/build/tasks/copy_legacy_source_task.ts` for details on exclusion patterns.

#### Adding new security labs content

When adding new security labs content ensure that the content follows the same structure as the existing documents. The header of the files must be valid yaml format as described bellow and must be fenced by `---`.

```
---
title: <string>
slug: <string>
date: <ISO 8601 date format>
description: <string>
author: <list of slugs>
image: <string>
category: <list of slugs>
---

<content string>
```

The file name should be the article title in snakecase e.g. vulnerability_summary_follina.md

After adding new articles run the following to create the encoded article:

```bash
cd x-pack/solutions/security/plugins/elastic_assistant
yarn encode-security-labs-content
```

Files are encoded due to this [issue](https://github.com/elastic/kibana/issues/202114).

### Future

Once asset format and chunking strategies are finalized, we may want to either move the assets to a shared package so they can be consumed by other plugins, or potentially ship the pre-packaged ELSER embeddings as part of a Fleet Integration. For now though, the assets will be included in their source format within the plugin, and can then be processed and embedded at runtime.
