# Digital Experience

Digital Experience app for Observability. It lists monitored applications at `/` and shows an
application view at `/:serviceName` whose Overview renders the Classic RUM dashboard exposed by
`@kbn/ux-plugin`.

The plugin is disabled by default, on both stateful and serverless. Enable it with
`xpack.digital_experience.enabled: true`. Users who can access Digital Experience (Digital
Experience and APM privileges, with the ux plugin enabled) see it instead of the legacy User
Experience navigation entry; everyone else keeps the legacy entry. `/app/ux` stays reachable by URL.

## Sessions

An Elasticsearch continuous transform summarizes EDOT Browser sessions from
`traces-*.otel-*,logs-*.otel-*` into `digital-experience-sessions-<version>`, one document per
`service.name` + `session.id`: start/end time and duration, page views with entry/exit page and
journey, click and error counts, p75 Core Web Vitals, and user, browser, OS and geo attributes.

The journey lists distinct pages in first-view order (revisits are not repeated). The OTel templates
map `url.*` fields as `wildcard`, which `top_metrics` cannot collect, and `scripted_metric` is not
available on serverless, so the pages come from `terms` buckets with first/last view times.

### Enabling sessions

Sessions are set up by an explicit action, `POST /internal/digital_experience/sessions/enable`,
which requires the `manage_digital_experience` privilege. The transform, its destination ingest
pipeline, and the destination index template are created **with the enabling user's credentials**
(secondary authorization, like SLO transforms), never as the Kibana internal user. The user also
needs these Elasticsearch privileges; when any is missing the request fails with a 403 listing them,
before anything is written:

- Cluster: `manage_transform`, `manage_ingest_pipelines`, `manage_index_templates`
- `traces-*.otel-*`, `logs-*.otel-*`: `read`, `view_index_metadata`
- `digital-experience-sessions-*`: `read`, `index`, `create_index`, `delete`, `delete_index`

Enabling again is safe: it refreshes the transform's stored credentials to the enabling user,
restarts a failed transform, and replaces a transform left over from a previous version.

A background task (`digital_experience:sessions-health`) only reads transform health and version
and logs when the transform is unhealthy or needs an update. It never creates or updates the
transform.

> **Security note:** the sessions index contains summaries of everything the enabling user could
> read in the source indices, regardless of the document- and field-level security or index
> privileges of the people who later read it. Enable sessions with a user whose source access is
> appropriate for every reader of `digital-experience-sessions-*`.

### Reading sessions

Session routes require `read_digital_experience` and query Elasticsearch as the current user, so
readers also need `read` on `digital-experience-sessions-*` (and on the source indices for the
session detail timeline):

- `GET /internal/digital_experience/sessions/status`
- `GET /internal/digital_experience/applications/{serviceName}/sessions`: search, facets, sorting,
  pagination, and KPIs
- `GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}`: summary,
  event timeline, per-page journey, and web vitals
