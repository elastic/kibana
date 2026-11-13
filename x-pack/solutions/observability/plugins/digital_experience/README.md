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

- **Summary:** applications, sessions, page loads, JS errors per page load, failed HTTP requests and
  the applications with a poor Core Web Vital. Like the chart, it covers the selected environment and
  source; the search narrows only the table. The sessions are the total of the sessions that started
  in the range, over the EDOT Browser applications, which only the sessions index counts, so it shows
  a dash while they are read from the raw events (sessions not set up, a range past their lookback,
  no access to them) and for Classic RUM, which has no sessions. It adds up to the same total as the
  sessions in the chart.
- **Partial data:** when one source fails to load, a warning above the summary names it.
- **Chart:** page loads over time, or the sessions that started, picked with a toggle whose choice
  is kept in local storage; drag over it to zoom into that range. The sessions are counted only
  while the applications are read from the sessions index, so the toggle disables **Sessions**, and
  says why, when they are not or when only Classic RUM is selected. The choice is kept until they are
  back, the chart showing page loads meanwhile.
- **Filters:** environment and source (kept in the URL), and a search on the name.
- **Table:** per application, its source, page loads, JS errors per page load, LCP / INP / CLS / FCP /
  TTFB p75 colored by rating (with the good / needs improvement / poor shares in the tooltip), JS
  errors, failed HTTP requests and when it was last seen. Page loads, which the table is sorted by, is
  always shown; a column selector, kept in local storage, hides FCP, TTFB and JS errors by default.
- **Empty states:** with no applications at all, a link to the EDOT Browser docs; with none in the
  selected environment, a button to show all environments.
- With all sources, a name with data in both shows its EDOT Browser row with a "+ Classic RUM" hint
  that switches the list to the Classic RUM rows.

**Where the EDOT Browser rows come from:** the sessions index (see [Sessions](#sessions)) when it can
answer, which takes one cheap search over session summaries instead of aggregating every raw event,
and the raw OTel events otherwise. The response has the same shape either way, and Classic RUM
always reads its own indices. The sessions are read when all of these hold, which is checked with the
summaries task's state, read by Kibana and shared by the requests of the next 30 seconds, so a
change of their status shows up within that time:

- sessions are set up, the task's last run succeeded, it isn't lagging, and it has caught up since
  sessions were enabled, so a build in progress is never shown as lower numbers;
- the time range starts within the sessions' 30 day lookback (from the start of that day, in UTC);
- the user can read `digital-experience-sessions-*`, otherwise the raw events are read quietly;
- the sessions hold at least one application, so applications that send no `session.id`, which the
  summaries skip, still appear when no application sends one.

A failing sessions search falls back to the raw events too, with a warning in the server log. The
counts (page loads, JS errors, HTTP requests, failed requests, web vital samples and their ratings)
are the sums of what each session counted with the list's own event names, so both sources count the
same events of a session, and the environments are the sessions'. What differs when the sessions are
read:

- **Time range:** a session that overlaps the range counts in full in the page loads, errors and
  requests, with its events outside the range, as its events can't be told apart. The sessions are
  those that started in the range, in the stat, the table and the chart alike, so they agree, where
  the Sessions tab counts every session that overlaps the range. The page loads chart puts a
  session's page loads at its start, in the same buckets, and leaves out the sessions that started
  before the range, so its shape differs and its total is a little lower than the table's.
- **Percentiles:** the p75 of a web vital is the p75 of the sessions' own p75s, as the summaries keep
  no samples. It is exact when a session has at most one sample of that vital, and higher than the
  p75 of the samples otherwise: on 3 hours of the synthtrace EDOT Browser data, with about seven
  samples of a vital per session, it was 2% to 8% higher for LCP, INP, FCP and TTFB and 3% to 18%
  higher for CLS. The sample counts and the good, needs improvement and poor shares are sums over the
  sessions, so they only differ by the events below. The Overview, whose figures need samples, always
  reads the raw events.
- **Freshness:** the sessions are about `frequency` and the sync delay (a minute) behind the events.
- **Access:** the sessions hold what the user who enabled them could read, not what the current user
  can read in the raw indices (see the security note under [Sessions](#sessions)).
- **Events without `session.id`:** the summaries skip them, so they are not counted. In the
  synthtrace data that is 8.7% of the HTTP requests and 3.8% of the exceptions (every page load and
  web vital carried one), so the JS errors and HTTP requests of the list are that much lower than
  from the raw events. An application that sends none is missing while others have sessions.
- **Last seen:** the end of the application's latest session, which any event can extend.

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
  the alternatives the session summaries read (`SESSION_ATTRIBUTE_FIELDS` in
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
  **Set up session summaries** privilege and tells everyone else whom to ask. A failed setup names the
  step that failed. Once set up, a callout flags an API key that no longer works (with a **Set up
  sessions again** button for those users, which a visit of theirs also does by itself), a failing
  run of the summaries task with its error, or summaries that are behind. A line next to the time
  picker says up to when events are in. While the sessions index is first built, an empty list says
  sessions are being built.
- **KPIs:** sessions, sessions with JS errors, sessions with failed requests, median duration, page
  views per session and bounce rate, over the listed sessions, so they follow the search and filters.
- **Filters:** a debounced search (session ID, user, pages, browser, OS, location), **JS errors**,
  **Failed requests**, duration ranges, and browser, OS, country and entry page facets with their
  counts. The environment picked in the app filters the sessions too.
- **Table:** start time, user with browser and OS, journey (entry → number of pages in between →
  exit), duration, page views, clicks, JS errors and failed requests; sortable and paged on the
  server. A column selector, kept in local storage, adds environment, location, entry and exit page,
  device, session ID, last activity, events, bounced, and LCP / INP / CLS colored by rating. The
  search, filters, sort and page are kept in the URL, and links to a session carry them so its
  **Sessions** breadcrumb leads back to the same list. **Page views** count page loads and in-app
  navigations, unlike the applications list's page loads, and say so on hover.
- **Empty states:** with no sessions, how they get there; with none matching, a button to clear the
  filters. A time range that starts before the 30 days sessions are kept says so.

### Session (`/{serviceName}/sessions/{sessionId}`)

- **Summary:** duration, page views, page loads, clicks, JS errors and failed requests; when, who,
  environment, browser and OS, location, entry and exit pages; and the session's Core Web Vitals.
- **Timeline:** one bar for the session, with a segment per page visit as wide as the time spent on
  the page and a marker per error. Selecting a segment scrolls to that visit.
- **Page journey:** a card per page visit with its time, share of the session, clicks, errors and web
  vitals, and its page views, clicks, errors and web vitals in order. Spans and logs are left out.
- **States:** a 404 leads back to the list; a timeline cut at the event limit is flagged.

## Sessions

A Task Manager task (`digital_experience:sessions-summaries`, every minute) summarizes EDOT Browser
sessions from `traces-*.otel-*,logs-*.otel-*` into `digital-experience-sessions-<version>` with
ES|QL, one document per `service.name` + `session.id`: start/end time and duration, page views with
entry/exit page and journey, page loads, clicks, JS errors, HTTP requests and failed requests, p75
Core Web Vitals with their samples by rating, and environment, user, browser, OS and geo attributes.
Like the applications list, it only reads browser SDK data (`telemetry.sdk.language: webjs`), and it
skips events with an empty `service.name` or `session.id`.

Each run:

1. Takes the events since its checkpoint, up to a minute ago (the sync delay), in windows.
2. Counts the sessions with an event in the window, and fetches their ids with one query per
   100,000 of them. ES|QL returns at most 10,000 rows, but a row can hold any number of ids, so
   each query aggregates the window once and returns the ids in 4,096 buckets of the SHA-256 of
   their `session.id`, a row each; more sessions take ranges of that hash. Querying ranges of 5,000
   instead made 28 queries for 137,000 sessions, 13s of Elasticsearch time against 0.6s. Hashing
   keeps the ranges even whatever the ids look like (EDOT iOS writes them in uppercase). The task
   relies on that default of
   `esql.query.result_truncation_max_size`: a cluster that lowers it below 10,000 truncates the
   responses without saying so, and the sessions past the cap are missing.
3. Rebuilds the sessions, 5,000 at a time, from their events of the last 24 hours, the longest a
   session lasts, with their ids as a literal `IN` list, which Elasticsearch looks up in the index:
   an `IN (subquery)` scanned the whole lookback. One query aggregates per session and page URL,
   then per session, for the counts, times, latest attributes, web vitals and journey. It keeps the
   raw attribute fields of each group's latest event and cleans them into attributes once per
   session, after the aggregation: cleaning every event's fields first took about 40% of the
   query, and the same 5,000 sessions now take about 22% less time with identical rows.
4. Turns the rows into summaries 500 at a time, letting the event loop run between chunks, as a
   whole batch at once blocked a small Kibana for about half a second. Writes one summary per
   session, keyed by a hash of `service.name` + `session.id`, and moves the checkpoint past the
   window.

A run starts no window after 45 seconds, and runs again right away while it is behind. On the first
run after sessions are enabled, it starts from 30 days ago, at the start of that day in UTC, so it
catches up window by window, oldest first, and status reports `rebuilding` until it has. A window
grows while it holds few sessions and halves when it holds more than 320,000, so a run always
finishes the windows it starts. Failures are kept in the task's state, not thrown, so the next run
retries from the same checkpoint, and status shows the error. Events that arrive later than the sync
delay after their `@timestamp` are only summarized when another event of their session arrives.

Once an hour, after the summaries are written, a run deletes the summaries of sessions that ended
more than 31 days ago. It waits for that deletion, so a failure is logged, and it only logs it: a
run's checkpoint survives, and the next attempt waits for the hour.

Readers don't depend on how summaries are built. A new `SESSIONS_VERSION` makes the task rebuild
every summary into the new index and delete the indices of *older* versions. A newer version's index
is left alone, as during a rolling upgrade, or a rollback, a node of this version runs beside one
that writes it.

The journey lists distinct pages in first-view order (revisits are not repeated), from the first 30
page-view URLs, and the exit page is the one viewed last. Each attribute group (environment, user,
user agent, geo) comes from its own latest event that carries any of its fields, and each attribute
from the first of its fields that has a value (`SESSION_ATTRIBUTE_FIELDS`). A session bounced when
it has exactly one page view. Sessions without a captured page view (only clicks or errors) aren't
bounces, and the bounce rate is over sessions with at least one page view. `page_view_count` counts
page loads and in-app navigations (`documentLoad`, `browser.navigation`); `page_load_count`,
`js_error_count` and the HTTP request counts use the applications list's own definitions. The
summary also keeps a lowercased `search` field (`wildcard`) of the session id, user, browser, OS,
country, city and pages, which the list's search matches anywhere in.

### Enabling sessions

Sessions are set up by an explicit action, `POST /internal/digital_experience/sessions/enable`,
which requires the `manage_digital_experience_sessions` API privilege. Only the **Sessions → Set up
session summaries** sub-feature privilege grants it. It is not part of **All**, as setting sessions up
runs the task with the user's data access for every reader, and it can only be granted in all
spaces, as the task and index serve every space. The user also needs these Elasticsearch privileges;
when any is missing the request fails with a 403 listing them, before anything is written:

- `traces-*.otel-*`, `logs-*.otel-*`: `read`, `view_index_metadata`
- `digital-experience-sessions-*`: `read`, `view_index_metadata`, `index`, `create_index`, `delete`,
  `delete_index`
- On serverless, the cluster privilege `read_security` (the predefined `admin` role has it; custom
  roles may not)

The read on `traces-*.otel-*` and `logs-*.otel-*` must also be unrestricted: no document- or
field-level security. Otherwise the task would only see that user's slice of the data, so every
other application's sessions (or fields) would silently stop updating for everyone. `has_privileges`
doesn't report these restrictions, so enabling also reads the user's index privileges and fails with
a 403 naming the affected patterns. It reads them with `GET _security/user/_privileges`, which
serverless only allows operator users; for everyone else there it reads the user's roles with
`_security/_authenticate` and the Query Role API, hence `read_security`. A pattern is refused when a
role's read that could apply to it has a `query` or field restriction, unless another role provably
reads all of it: one role with unrestricted read on a pattern is enough, even if another role
filters it. Roles that grant read through a regular expression, like serverless `editor`, pass when
unfiltered, as `has_privileges` already checked the read, but never lift another role's filter.
Elasticsearch can't report the privileges of an API key with its own role descriptors, nor of any API
key on serverless, so such keys are refused too; enable sessions as a user.

After the checks, enabling runs these steps, and a failure answers 500 naming the step
(`attributes.data.step`) with its details in the server log:

1. `credentials`: Kibana can store an API key, so `xpack.encryptedSavedObjects.encryptionKey` is set.
2. `template`: puts the `digital-experience-sessions` index template, as Kibana's internal user.
3. `index`: creates the sessions index, as the user.
4. `task`: schedules the summaries task with an API key that Task Manager grants on the user's behalf,
   and runs it right away.

Every step is safe to repeat, and the steps before a failed one are harmless on their own, so
enabling again retries from where it failed. Enabling again also gives the task a new key, granted
on behalf of whoever enabled it last, and Task Manager invalidates the previous one. The task keeps
its state, so its summaries are kept. The task never runs as the Kibana internal user: only the
index template is the internal user's. Each enable writes a `digital_experience_sessions_enable`
audit event, successful or not. Status reports who last enabled sessions, and why the last run
failed, only to users who can set them up: Elasticsearch errors can name that user, their roles
and indices, so the others get a generic message. A run in progress doesn't stop enabling again
from replacing the key. Without Task Manager, sessions can't be enabled.

Like any granted key, the task's key has the access the user had when it was granted, and no
expiration. Anyone with `manage_api_key` or `manage_security`, or the enabling user with
`manage_own_api_key`, can invalidate it. The task's runs then fail with a 401, which status reports
as `apiKeyInvalid`. When a user with the privilege opens the Sessions tab, it enables sessions again,
as the **Set up sessions again** button would.

There is no disable action. Removing the task (`digital_experience:sessions-summaries`) with the
Task Manager API stops it and invalidates its key.

### Scaling and freshness

Each run rebuilds every session that received new events from its whole history, so cost grows with
active sessions × events per session. On the same data at about 3M sessions a day, a prototype of
the same loop used 2 to 3 times less Elasticsearch CPU than the transform: about 23,000 changed
sessions in 2.1 to 2.7 seconds a run against 7.2 to 9.6, and a 625,000 session backfill in 99 to
126 seconds against 295. One setting trades cost for freshness, another speed for resources:

```yaml
xpack.digital_experience.sessions:
  frequency: 1m   # 1s–1h. Longer means fewer rebuilds of each active session: cheaper, but staler.
  concurrency: 2  # 1–8 summary queries at once. More keeps up with busier sites, for more resources.
```

- **`frequency`**: an active session is re-read and rewritten once per run. Going from `1m` to
  `2m`–`5m` cuts the work roughly 2–5× for long sessions, and adds about the same time to the session
  list's lag. Session detail reads raw events up to the longest a session lasts, so its timeline
  stays current; its summary figures are as fresh as the last run. A changed `frequency` applies
  after a restart, from the task's next run once it has caught up.
- **`concurrency`**: a run rebuilds the changed sessions in queries of 5,000, this many at a time.
  At 75× the scale of the load tests each query took about 2 seconds, so one at a time needed more
  than the minute; each one more in flight costs Elasticsearch CPU and about 50 MB of Kibana memory
  while a run is busy. It applies after a restart.

Status reports the summaries as lagging when their checkpoint is more than three runs plus the sync
delay behind, and at least 5 minutes, once they have caught up; the task logs when a run starts
failing, with its error, and when runs work again. If the task falls behind under peak traffic, it
lags and then catches up; no data is lost.

> **Security note:** the sessions index contains summaries of everything the enabling user could
> read in the source indices, regardless of the document- and field-level security or index
> privileges of the people who later read it. Enable sessions with a user whose source access is
> appropriate for every reader of `digital-experience-sessions-*`.

### Reading sessions

The applications list reads the sessions index as the current user too, and without `read` on it the
raw events answer instead (see [Applications](#applications-)). Session routes require
`read_digital_experience` and query Elasticsearch as the current user, so
readers also need `read` on `digital-experience-sessions-*` (and on the source indices for the
session detail timeline). Without it they answer 403 naming those privileges; other failures are
logged and answer 500 without Elasticsearch details:

- `GET /internal/digital_experience/sessions/status`: whether sessions are set up, the task's health,
  lag and last error, whether it is still building, and how many days sessions are kept.
- `GET /internal/digital_experience/applications/{serviceName}/sessions`: search, facets (browser,
  OS, country, entry page), the `environment`, `withJsErrors`, `withFailedRequests` and
  `minDurationMs` / `maxDurationMs` filters, sorting, pagination, KPIs, and how many days sessions
  are kept (`retentionDays`). Facets count their values without their own selection; the other
  filters narrow every count.
- `GET /internal/digital_experience/applications/{serviceName}/sessions/{sessionId}`: summary,
  event timeline, per-page journey, and web vitals. The raw events are read from just before the
  session's start up to the longest a session lasts, with only the fields the timeline shows.

## Code layout

- `common/`: the API types (`common/types/`), Core Web Vitals thresholds and shared constants.
- `server/routes/applications/`: the list's route, its merge step and one folder per source (`otel/`,
  `classic/`); `server/routes/overview/` is the EDOT Browser Overview's route. Helpers shared across
  features are in `server/lib/` (`helpers/`, and `otel/` for the OTel queries).
- `server/services/sessions/`: the session summaries: the task, its ES|QL queries, the index, status,
  and enabling, with their routes and readers in `server/routes/sessions/`.
- `public/pages/`: one folder per page (`applications_list/`, `application_details/`, `sessions/`,
  `session_detail/`) with its own components, hooks and utils; what several pages share is in
  `public/components/`, `public/hooks/` and `public/utils/`. `public/application/` is the app shell.
