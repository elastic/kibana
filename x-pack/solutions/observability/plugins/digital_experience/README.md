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

Enabling again is safe. It refreshes the transforms' stored credentials to the enabling user,
restarts failed transforms, replaces transforms left over from a previous version, and applies a
changed `frequency` or partition count.

### Scaling and freshness

Each checkpoint re-aggregates every session that received new events over its full history, so
cost grows with active sessions × events per session. Two settings trade cost for freshness and
throughput:

```yaml
xpack.digital_experience.sessions:
  frequency: 1m   # 1s–1h. Longer means fewer re-aggregations of each active session: cheaper, but staler.
  partitions: 1   # 1–32. Splits sessions by session.id range across that many transforms.
```

- **`frequency`**: an active session is re-read and rewritten once per checkpoint. Going from `1m`
  to `2m`–`5m` cuts background work roughly 2–5× for long sessions, and adds about the same time to
  the session list's lag. Session detail always reads raw events, so it stays current.
- **`partitions`**: transforms run one request at a time, so partitions are how the work spreads
  across transform nodes. They share the sessions index, document ids depend only on
  `service.name` + `session.id`, and a single retention policy (partition 0) covers them all, so
  changing the count rewrites documents in place without emptying the list. EDOT Browser session
  ids are random UUIDs, so the slices are even.

Settings changes take effect after a user with `manage_digital_experience` enables sessions again.
The status route reports the drift until then.

A background task (`digital_experience:sessions-health`, every 5 minutes) only reads transform
health, version and lag. It logs when transforms are degraded, lagging (more than three missed
checkpoints plus the sync delay behind, at least 5 minutes) or need an update. It never creates or
updates a transform: an update re-stamps the transform with the updater's privileges, which as the
internal user would bypass the enabling user's index privileges. If transforms fall behind under
peak traffic, they lag and then catch up; no data is lost.

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
