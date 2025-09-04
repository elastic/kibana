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

The content is often delivered to us as a zip of `.mdx` files that are in kebab case with some upper case letters. Follow the below steps to convert them to the required format:

1. Delete all existing files in the `x-pack/solutions/security/plugins/elastic_assistant/server/knowledge_base/security_labs` to ensure any removed articles are not left behind

```bash
cd x-pack/solutions/security/plugins/elastic_assistant/server/knowledge_base/security_labs
rm -rf ./*
```

2. Extract the zip of `.mdx` files into the same directory
3. Remove `callout_example.md` if present as this was a leftover example document, and also remove `signaling_from_within_how_ebpf_interacts_with_signals.md` if present as it was removed in https://github.com/elastic/kibana/pull/212525
4. Open your terminal to this directory and run this script to convert the files to the required format:

```bash
for f in *; do [ -f "$f" ] && n=$(echo "$f" | sed 's/-/_/g' | tr '[:upper:]' '[:lower:]') && n="${n%.mdx}.${n##*.}" && [ "${n##*.}" = "mdx" ] && n="${n%.mdx}.md" && [ "$f" != "$n" ] && mv "$f" "$n" && echo "Renamed: $f -> $n"; done
```

5. Run the following to create the encoded articles:

```bash
cd x-pack/solutions/security/plugins/elastic_assistant
yarn encode-security-labs-content
```

Files are encoded due to this [issue](https://github.com/elastic/kibana/issues/202114).

### Future

Once asset format and chunking strategies are finalized, we may want to either move the assets to a shared package so they can be consumed by other plugins, or potentially ship the pre-packaged ELSER embeddings as part of a Fleet Integration. For now though, the assets will be included in their source format within the plugin, and can then be processed and embedded at runtime.
