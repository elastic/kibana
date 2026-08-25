# Security Solution - Asset Inventory

Centralized asset inventory experience within the Elastic Security solution. A central place for users to view and manage all their assets from different environments.

## Development

Open the _Advanced Settings_ page via `http://localhost:5601/app/management/kibana/settings`. Then, switch on the **Enable Asset Inventory** toggle.

Alternatively, You can add the following line to your `kibana.dev.yml`:

```yml
uiSettings.overrides.securitySolution:enableAssetInventory: true
```

See also the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

## Testing

For general guidelines, read [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details
