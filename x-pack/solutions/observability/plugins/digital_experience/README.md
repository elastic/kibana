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

The EDOT Browser Overview can be narrowed by environment, by **Browser**, **OS**, **Device**,
**Country** and **Page**, and by a KQL query, and shows its load time at a chosen percentile. All of
it is kept in the URL (`browser`, `os`, `device`, `country`, `pageUrl`, `percentile`, `kuery`).

- **Layout:** the KQL bar, the filter buttons and the date picker share one row. What the filters
  select shows as pills in the row below, each with a cross that removes its value, next to the
  button that clears them all.
- **Panel heights:** the Core Web Vitals and Trends panels are as tall as each other, and the two
  trend charts share the height of the Trends panel (at least 128px each), so it has no empty space
  under them.
- **The KQL bar expands:** while it has the focus it takes the whole row, over the filters and the
  date picker beside it (the row keeps its space for the bar, so nothing moves), and goes back to
  its place when the focus leaves.
- **A narrow window:** the row never wraps while it can help it. It measures where its items are
  (`useFittingCount`) and, when they do not fit, takes filter buttons away one at a time, the ones
  without a selection and the least important first (browser, OS, country, page), down to none.
  A filter without a button is still in its pill, the count of **All filters** and the flyout, and
  its button is back when the window grows. The KQL bar is never narrower than 300px and the date
  picker takes the width of its label, which a range changes, so below roughly 1350px of window
  width the date picker still moves down. When it does, or when it wraps with no filter button
  left, every button comes back, as taking them away does not help.
- **Filters:** browser, OS, app version, country and page have a button in the row, which counts the
  values it selects; **All filters** opens a flyout with every filter, device included, whose picks
  apply together. Each filter lists its ten most
  used values with their page loads in the time range, environment and the other selected filters,
  but not its own selection, so its other values stay selectable. A pinned filter without values,
  e.g. the country when the collector does no GeoIP processing, is hidden unless it is selected.
  A click on a row of the breakdowns or the top pages filters the Overview by it, or takes the
  filter off when it is selected already; the arrow of a browser or system opens its sessions
  instead.
- **App version and URL contains:** the version is `service.version` of the resource (or of the
  event). **URL contains** has no list: the text is written in the flyout and matches part of the
  page URL, whatever its case (`*` and `?` in it are the text itself). Like the page, it narrows the
  page loads only, and the errors route rejects both.
- **Several values, and exclusions:** a filter takes up to ten values, each included or excluded,
  and the other values are disabled once it has ten. The included values keep the documents with any
  of them and the excluded values leave out those with any of them. The filters are one `filters`
  param: Kibana filters (`Filter[]` from `@kbn/es-query`), as rison, a `phrase` or `phrases` filter
  per field with `meta.negate` for the values to leave out, e.g.
  `filters=!((meta:(key:browser,negate:!f,params:!(Chrome,Safari),type:phrases)),(meta:(key:browser,negate:!t,params:(query:Firefox),type:phrase)))`
  (`common/overview_filters_param.ts`). The routes read `meta` only, never a query a client wrote,
  and answer a param they would have to repair, e.g. one with more than ten values or a repeated
  one, with a 400, so a request gets the filters it asked for.
- **Sessions tab:** `browser`, `os` and `country` are the Sessions tab's own params, which take one
  value, so the tab links carry a filter over only when it is exactly one included value. The
  Sessions list's **Entry page** facet is its page filter; it is a different question from the
  Overview's page (a session's first page against the URL of a page load), so it stays separate.
- **Fields:** the raw documents have no field per dimension, so browser, OS, device and country read
  the alternatives the sessions transform reads (`SESSION_ATTRIBUTE_FIELDS` in
  `common/session_attribute_fields.ts`, shared by both) and take the first non-empty one, with a
  runtime field. The page is `attributes.url.full`.
- **Scope:** browser, OS, device, country, app version and the KQL query narrow every panel of the Overview: the
  KPIs, Core Web Vitals and trends (`/overview`), the pages, breakdowns and clicks (`/usage`) and the
  top errors (`/errors`). The Errors tab reads the same URL params, so **View all** lists the errors
  the Overview counted; the page is left out there. The breakdowns aggregate the same fields the
  filters do, so each row is a value a filter takes. Web vitals, errors and clicks carry no page URL
  yet, and an HTTP request's `url.full` is the URL requested, so the page narrows the page loads,
  with their load time, trend, pages and breakdowns only; the page says so while a page is selected.
- **Percentile:** the load time (its KPI and its trend) is the 50th, 75th (default), 90th, 95th or
  99th percentile, picked above the trends. The Core Web Vitals stay at the 75th percentile, which
  is how their good, needs improvement and poor ratings are defined.
- **KQL:** the bar before the filters takes a KQL query, sent as `kuery` and translated on the server
  to a query on the stored fields of the OTel logs and traces; it narrows every search of the
  Overview and of the Errors tab, and the HTTP requests of the Overview, so a clause on a field only
  one of them has leaves nothing of the other. The bar suggests fields and values through an ad hoc
  data view over `logs-*.otel-*,traces-*.otel-*`, which is never saved. A query that does not parse
  is shown as an error and not applied; the routes answer one with a 400. The Sessions index has
  other fields, so the query does not carry over to the Sessions tab.

### Sessions (`/{serviceName}/sessions?source=otel`)

A tab of EDOT Browser applications only, as sessions are built from EDOT Browser data (see
[Sessions](#sessions)).

- **Status:** before sessions are set up, the tab shows a **Set up sessions** button to users with the
  manage sessions privilege and tells everyone else whom to ask. Once set up, a callout flags sessions
  that need an update (with an **Update sessions** button for those users, or a note that the update
  applies by itself when the transforms run with a stored API key), a failing transform, an
  invalidated API key, or one that is behind. While the sessions index is first built, after setup
  or a version update, an empty list says sessions are being built.
- **KPIs:** sessions, sessions with errors, median duration, pages per session and bounce rate, over
  the listed sessions, so they follow the search and filters.
- **Filters:** a debounced search (session ID, user, pages, browser, OS, location), **Has errors**,
  duration ranges, and browser, OS, country and entry page facets with their counts.
- **Table:** start time, user with browser and OS, journey (entry → number of pages in between →
  exit), duration, pages, clicks and errors; sortable and paged on the server. A column selector,
  kept in local storage, adds location, entry and exit page, device, session ID, last activity,
  events, bounced, and LCP / INP / CLS colored by rating. The search, filters, sort and page are
  kept in the URL, and links to a session carry them so its **Sessions** breadcrumb leads back to
  the same list.
- **Empty states:** with no sessions, how they get there; with none matching, a button to clear the
  filters. A callout counts sessions the transform could not summarize.

### Session (`/{serviceName}/sessions/{sessionId}`)

- **Summary:** duration, page views, clicks and errors; when, who, browser and OS, location, entry and
  exit pages; and the session's Core Web Vitals.
- **Timeline:** one bar for the session, with a segment per page visit as wide as the time spent on
  the page and a marker per error. Selecting a segment scrolls to that visit.
- **Page journey:** a card per page visit with its time, share of the session, clicks, errors and web
  vitals, and its page views, clicks, errors and web vitals in order. Spans and logs are left out.
- **States:** a 404 leads back to the list; a timeline cut at the event limit is flagged.

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

- Cluster: `manage_transform`, `manage_ingest_pipelines`, `manage_index_templates`, and on
  serverless also `read_security` (the predefined `admin` role has it; custom roles may not)
- `traces-*.otel-*`, `logs-*.otel-*`: `read`, `view_index_metadata`
- `digital-experience-sessions-*`: `read`, `index`, `create_index`, `delete`, `delete_index`

The read on `traces-*.otel-*` and `logs-*.otel-*` must also be unrestricted: no document- or
field-level security. Otherwise the transforms would only see that user's slice of the data, so
every other application's sessions (or fields) would silently stop updating for everyone, and
retention would then delete them. `has_privileges` doesn't report these restrictions, so enabling
also reads the user's index privileges and fails with a 403 naming the affected patterns. It reads
them with `GET _security/user/_privileges`, which serverless only allows operator users; for
everyone else there it reads the user's roles with `_security/_authenticate` and the Query Role
API, hence `read_security`. A pattern is refused when a role's read that could apply to it has a
`query` or field restriction, unless another role provably reads all of it: one role with
unrestricted read on a pattern is enough, even if another role filters it. Roles that grant read
through a regular expression, like serverless `editor`, pass when unfiltered, as `has_privileges`
already checked the read, but never lift another role's filter. Elasticsearch can't report the
privileges of an API key with its own role descriptors, nor of any API key on serverless, so such
keys are refused too; enable sessions as a user.

Each enable records the username and time on the transforms (`_meta.enabled_by`,
`_meta.enabled_at`) and writes a `digital_experience_sessions_enable` audit event, successful or
not. The status route reports who last enabled sessions, and the roles or API key the transforms
run with, only to users who can set sessions up.

When `xpack.encryptedSavedObjects.encryptionKey` is set and Task Manager is available (it runs the
health task that uses the key), enabling also grants an API key on the user's behalf and the transforms run with that key instead of the user's own credentials. Its role
descriptors only allow what transform secondary credentials need: `read` and `view_index_metadata`
on `traces-*.otel-*` and `logs-*.otel-*`, and the `digital-experience-sessions-*` privileges above.
Like any granted key, it keeps the access the user had when it was granted, and it has no
expiration: an expiring key would stop automatic updates on a fixed date. The key is stored in an
encrypted saved object (`digital-experience-sessions-api-key`, one per cluster), with its name, id
and who granted it bound to the encrypted key. Enabling again grants a new key, applies it, and
invalidates the previous one. The saved object is replaced only if nothing replaced it since it was
read, so when two enables run at the same time, the key stored first is kept and the other is
invalidated; the health task moves any transform left on it to the stored key. Without an
encryption key, when security or API keys are disabled, or when the user can't grant a key (for
example when authenticated with an API key), the transforms run with the user's credentials as
before, and any stored key is deleted and invalidated, so it can't be put back. A grant that fails
because Elasticsearch is unavailable fails the enable instead, and changes nothing.

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

Settings changes take effect on the health task's next run when the transforms run with a stored
API key, and otherwise after a user with that privilege enables sessions again. The status route
reports the drift until then.

A background task (`digital_experience:sessions-health`, every 5 minutes) reads transform health,
version and lag. It logs when transforms become degraded or lagging (more than three missed
checkpoints plus the sync delay behind, at least 5 minutes), recover, need an update, or come from a
newer Kibana: once per change, not on every run. When an update is needed (a new sessions version
after a Kibana upgrade, or changed settings) and the transforms run with the stored API key, it
applies the update with that same key, so they keep running with the same access, and writes a
`digital_experience_sessions_auto_update` audit event naming the key and who granted it.
`_meta.enabled_by` and `enabled_at` keep their enable-time values. If the update fails, the next
runs retry it, and status stops saying it applies by itself and asks a user with the manage
sessions privilege to update sessions instead. New transforms are created before the ones they
replace are removed, so a failure part-way leaves the old ones running. A version update drops the old
sessions index and rebuilds it from up to 30 days of data. The task never updates transforms from a
newer Kibana, and never updates a transform as the internal user: an update re-stamps the transform
with the updater's privileges, which as the internal user would bypass the enabling user's index
privileges. Elasticsearch can't protect an API key from deletion: anyone with `manage_api_key` or
`manage_security`, or the enabling user with `manage_own_api_key`, can invalidate it. The key is
named "Digital Experience sessions (used by the sessions transforms)" and marked managed, so the API
keys page warns before deleting it. A deleted key doesn't stop the transforms: they keep the
identity they were last created or updated with, and keep summarizing sessions. It only stops
Kibana from updating them without a user, so an upgrade or settings change then needs **Update
sessions**. The health task checks the key until it finds it deleted, then logs it once, as a
warning, and doesn't authenticate with that key again. Status checks it for users with the manage
sessions privilege, and shows the others what the health task found. When one of those users opens
the Sessions tab, it grants a new key automatically, as the **Update sessions** button would. If the
key or the health task's state can't be read, status still loads, without automatic updates. If
transforms fall behind under peak traffic, they lag and then catch up; no data is lost.

There is no disable action yet. One must invalidate the stored API key and delete its saved object.

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
- `GET /internal/digital_experience/applications/{serviceName}/sessions`: search, facets (browser,
  OS, country, entry page), the `hasErrors` and `minDurationMs` / `maxDurationMs` filters, sorting,
  pagination, and KPIs. Facets count their values without their own selection; the other filters
  narrow every count.
- `GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}`: summary,
  event timeline, per-page journey, and web vitals

## Code layout

- `common/`: the API types (`common/types/`), Core Web Vitals thresholds and shared constants.
- `server/routes/applications/`: the list's route, its merge step and one folder per source (`otel/`,
  `classic/`); `server/routes/overview/` is the EDOT Browser Overview's route. Helpers shared across
  features are in `server/lib/` (`helpers/`, and `otel/` for the OTel queries).
- `server/sessions/`: the sessions transform spec, setup, status and health task, with its routes in
  `server/routes/sessions/`.
- `public/pages/`: one folder per page (`applications_list/`, `application_details/`, `sessions/`,
  `session_detail/`) with its own components, hooks and utils; what several pages share is in
  `public/components/`, `public/hooks/` and `public/utils/`. `public/application/` is the app shell.
