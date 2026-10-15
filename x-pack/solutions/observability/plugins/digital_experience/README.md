# Digital Experience

Digital Experience app for Observability. It lists monitored applications at `/` and shows an
application view at `/:serviceName` whose Overview renders the Classic RUM dashboard exposed by
`@kbn/ux-plugin`.

The plugin is disabled by default, on both stateful and serverless. Enable it with
`xpack.digital_experience.enabled: true`. When enabled, the legacy User Experience navigation
entry is hidden; the `/app/ux` app stays reachable by URL.
