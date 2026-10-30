# Digital Experience

Digital Experience app for Observability: real user monitoring of web applications, from two
sources:

- **EDOT Browser** (`otel`): OTel data in `logs-*.otel-*` / `traces-*.otel-*` with
  `telemetry.sdk.language: webjs`.
- **Classic RUM** (`classic`): the RUM agent's data in the APM indices. Stateful only, and only with
  the optional `apmDataAccess` plugin; serverless lists EDOT Browser applications only.

## Enabling it

The plugin is disabled by default, on both stateful and serverless. Enable it with
`xpack.digital_experience.enabled: true`. Users who can access Digital Experience (Digital Experience
and APM privileges, with the ux plugin enabled) see it instead of the legacy User Experience navigation
entry; everyone else keeps the legacy entry. `/app/ux` stays reachable by URL.

## Pages

### Applications (`/`)

The monitored applications in the selected time range, served by
`GET /internal/digital_experience/applications`, which requires the Digital Experience and APM
privileges like the app.

- **Summary:** applications, page loads, JS errors per page load, failed HTTP requests and the
  applications with a poor Core Web Vital. Like the chart, it covers the selected environment and
  source; the search narrows only the table.
- **Partial data:** when one source fails to load, a warning above the summary names it.
- **Page loads chart:** page loads over time; drag over it to zoom into that range.
- **Filters:** environment and source (kept in the URL), and a search on the name.
- **Table:** per application, its source, page loads, JS errors per page load, LCP / INP / CLS / FCP /
  TTFB p75 colored by rating (with the good / needs improvement / poor shares in the tooltip), JS
  errors, failed HTTP requests and when it was last seen. Page loads, which the table is sorted by, is
  always shown; a column selector, kept in local storage, hides FCP, TTFB and JS errors by default.
- **Empty states:** with no applications at all, a link to the EDOT Browser docs; with none in the
  selected environment, a button to show all environments.
- With all sources, a name with data in both shows its EDOT Browser row with a "+ Classic RUM" hint
  that switches the list to the Classic RUM rows.

Numbers, percents, dates and the chart's time zone follow the Advanced Settings.

### Application details (`/{serviceName}?source=otel|classic`)

Opened from the list. The Overview of a Classic RUM application renders the Classic RUM dashboard
exposed by `@kbn/ux-plugin`. The Overview of an EDOT Browser application shows its page loads, load
time, JS errors and failed HTTP requests, its Core Web Vitals, and page loads and load time over
time, from `GET /internal/digital_experience/applications/{serviceName}/overview`. Without `source`,
the page shows the Classic RUM application.

## Sessions

An Elasticsearch continuous transform summarizes EDOT Browser sessions from
`traces-*.otel-*,logs-*.otel-*` into `digital-experience-sessions-<version>`, one document per
`service.name` + `session.id`: start/end time and duration, page views with entry/exit page and
journey, click and error counts, p75 Core Web Vitals, and user, browser, OS and geo attributes.
Like the applications list, it only reads browser SDK data (`telemetry.sdk.language: webjs`), and
it skips events with an empty `service.name` or `session.id`. User, user agent and geo each come
from their own latest event that carries them.

The journey lists distinct pages in first-view order (revisits are not repeated), from the first 30
page-view URLs. The OTel templates map `url.*` fields as `wildcard`, which `top_metrics` cannot
collect, and `scripted_metric` is not available on serverless, so the pages come from `terms`
buckets with first/last view times. If the dest pipeline fails on a summary, the session is still
indexed, with the failure in `error.message`. Its counts are missing, so the list and its KPIs leave
it out and report how many there are (`failedSummaries`).

A session bounced when it has exactly one page view. Sessions without a captured page view (only
clicks or errors) aren't bounces, and the bounce rate is over sessions with at least one page view.

### Enabling sessions

Sessions are set up by an explicit action, `POST /internal/digital_experience/sessions/enable`,
which requires the `manage_digital_experience_sessions` API privilege. Only the **Sessions → Set up
and update session summaries** sub-feature privilege grants it. It is not part of **All**, as setting
sessions up runs the transforms with the user's data access for every reader, and it can only be
granted in all spaces, as the transforms and index serve every space. The transform, its
destination ingest pipeline, and the destination index template are created **with the enabling
user's credentials**
(secondary authorization, like SLO transforms), never as the Kibana internal user. The user also
needs these Elasticsearch privileges; when any is missing the request fails with a 403 listing them,
before anything is written:

- Cluster: `manage_transform`, `manage_ingest_pipelines`, `manage_index_templates`
- `traces-*.otel-*`, `logs-*.otel-*`: `read`, `view_index_metadata`
- `digital-experience-sessions-*`: `read`, `index`, `create_index`, `delete`, `delete_index`

The read on `traces-*.otel-*` and `logs-*.otel-*` must also be unrestricted: no document- or
field-level security. Otherwise the transforms would only see that user's slice of the data, so
every other application's sessions (or fields) would silently stop updating for everyone, and
retention would then delete them. `has_privileges` doesn't report these restrictions, so enabling
also reads the user's roles (`GET _security/user/_privileges`) and fails with a 403 naming the
affected patterns. One role with unrestricted read on a pattern is enough, even if another role
filters it. Elasticsearch can't report the privileges of an API key with its own role descriptors,
so such keys are refused too; enable sessions as a user, or with an API key without role
descriptors.

Each enable records the username and time on the transforms (`_meta.enabled_by`,
`_meta.enabled_at`) and writes a `digital_experience_sessions_enable` audit event, successful or
not. The status route reports who last enabled sessions, and the roles or API key the transforms
run with, only to users who can set sessions up.

Enabling again is safe. It refreshes the transforms' stored credentials to the enabling user,
restarts failed transforms, replaces transforms left over from an older version, and applies a
changed `frequency` or partition count. It never replaces transforms from a newer version (after a
Kibana rollback, or from an older node during a rolling upgrade): that would delete the newer
summaries, so enabling fails with a 409 and the status asks to upgrade Kibana instead.

The transforms, pipeline and index template are marked `managed`, so the Transforms and Index
Management UIs warn before anyone edits or deletes them there. There is no disable action in
Digital Experience; a user with Elasticsearch's `manage_transform` privilege can still stop or
delete the transforms directly.

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
  the session list's lag. Session detail reads raw events with no upper time bound, so its
  timeline stays current; its summary figures are as fresh as the last checkpoint.
- **`partitions`**: transforms run one request at a time, so partitions are how the work spreads
  across transform nodes. They share the sessions index, document ids depend only on
  `service.name` + `session.id`, and each partition's retention policy prunes the whole index, so
  changing the count rewrites documents in place without emptying the list. EDOT Browser session
  ids are random UUIDs, so the slices are even.

Settings changes take effect after a user with that privilege enables sessions again.
The status route reports the drift until then.

A background task (`digital_experience:sessions-health`, every 5 minutes) only reads transform
health, version and lag. It logs when transforms become degraded or lagging (more than three missed
checkpoints plus the sync delay behind, at least 5 minutes), recover, need an update, or come from a
newer Kibana: once per change, not on every run. It never creates or
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
session detail timeline). Without it they answer 403 naming those privileges; other failures are
logged and answer 500 without Elasticsearch details:

- `GET /internal/digital_experience/sessions/status`
- `GET /internal/digital_experience/applications/{serviceName}/sessions`: search, facets, sorting,
  pagination, and KPIs
- `GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}`: summary,
  event timeline, per-page journey, and web vitals

## Code layout

- `common/`: the API types (`common/types/`), Core Web Vitals thresholds and shared constants.
- `server/routes/applications/`: the list's route, its merge step and one folder per source (`otel/`,
  `classic/`); `server/routes/overview/` is the EDOT Browser Overview's route. Helpers shared across
  features are in `server/lib/` (`helpers/`, and `otel/` for the OTel queries).
- `server/sessions/`: the sessions transform spec, setup, status and health task, with its routes in
  `server/routes/sessions/`.
- `public/pages/`: one folder per page (`applications_list/`, `application_details/`) with its own
  components, hooks and utils; what several pages share is in `public/components/`, `public/hooks/`
  and `public/utils/`. `public/application/` is the app shell.
