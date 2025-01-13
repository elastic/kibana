# @kbn/index-adapter

Utility library for Elasticsearch index management.

## IndexAdapter

Manage single index. Example:

```
// Setup
const indexAdapter = new IndexAdapter('my-awesome-index', { kibanaVersion: '8.12.1' });

indexAdapter.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

indexAdapter.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
});

// Start
await indexAdapter.install({ logger, esClient, pluginStop$ }); // Installs templates and the 'my-awesome-index' index, or updates existing.
```


## IndexPatternAdapter

Manage index patterns. Example:

```
// Setup
const indexPatternAdapter = new IndexPatternAdapter('my-awesome-index', { kibanaVersion: '8.12.1' });

indexPatternAdapter.setComponentTemplate({
    name: 'awesome-component-template',
    fieldMap: {
        'awesome.field1: { type: 'keyword', required: true },
        'awesome.nested.field2: { type: 'number', required: false },
        // ...
    },
});

indexPatternAdapter.setIndexTemplate({
    name: 'awesome-index-template',
    componentTemplateRefs: ['awesome-component-template', 'ecs-component-template'],
});

// Start
indexPatternAdapter.install({ logger, esClient, pluginStop$ }); // Installs/updates templates for the index pattern 'my-awesome-index-*', and updates mappings of all specific indices

// Create a specific index on the fly
await indexPatternAdapter.installIndex('12345'); // creates 'my-awesome-index-12345' index if it does not exist.
```
