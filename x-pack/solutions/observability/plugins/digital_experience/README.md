# Digital Experience

Digital Experience app for Observability. It lists monitored applications at `/` and shows an
application view at `/:serviceName` whose Overview renders the Classic RUM dashboard exposed by
`@kbn/ux-plugin`.

The plugin is disabled by default, on both stateful and serverless. Enable it with
`xpack.digital_experience.enabled: true`. Users who can access Digital Experience (Digital
Experience and APM privileges, with the ux plugin enabled) see it instead of the legacy User
Experience navigation entry; everyone else keeps the legacy entry. `/app/ux` stays reachable by URL.
