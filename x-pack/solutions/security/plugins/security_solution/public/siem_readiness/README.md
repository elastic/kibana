# SIEM Readiness

The SIEM Readiness Dashboard is a new sub plugin designed to provide users with a guided experience to improve their security readiness. It helps users discover and adopt key security features by tracking their progress against a predefined set of best practices and tasks. The goal is to provide a single, comprehensive view that helps users understand their current SIEM readiness and guides them on the next steps to take.

## Development

Enable the experimental flag in your `kibana.dev.yml` by adding this line:

```yml
xpack.securitySolution.enableExperimental: ['siemReadinessDashboard']
```

This should allow rendering of the **Enable SIEM Readiness Dashboard** setting in the _Advanced Settings_ page via `http://localhost:5601/app/management/kibana/settings`. After switching on the toggle and reloading, the SIEM Readiness link should be available via the navigation menu and the search bar.

See also the [kibana contributing guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md) for instructions setting up your development environment.

## Testing

For general guidelines, read [Kibana Testing Guide](https://www.elastic.co/guide/en/kibana/current/development-tests.html) for more details
