# Digital Experience

Digital Experience app for Observability: real user monitoring of web applications, from two
sources:

- **EDOT Browser** (`otel`): OTel data in `logs-*.otel-*` / `traces-*.otel-*` with
  `telemetry.sdk.language: webjs`.
- **Classic RUM** (`classic`): the RUM agent's data in the APM indices. Stateful only, and only with
  the optional `apmDataAccess` plugin; serverless lists EDOT Browser applications only.

## Enabling it

The plugin is always installed, and the `digitalExperience.enabled` feature flag (fallback `false`)
controls whether users see it. With the flag off there is no navigation entry, the app is inaccessible,
the legacy User Experience stays, and the `/internal/digital_experience/*` routes answer 404 to
authorized requests with valid parameters (authorization and validation run first, so others still get
403 or 400; neither reads data). With it on, users who can access Digital Experience (Digital
Experience and APM privileges, with the ux plugin enabled) see it instead of the legacy User Experience
navigation entry; users without Digital Experience access keep whatever the legacy entry shows them,
which needs APM access. `/app/ux` stays reachable by URL.

The flag doesn't hide what the plugin registers at setup: the "Digital experience" feature and its
"Sessions" sub-feature are listed in Roles and in Spaces feature visibility, whatever the flag.
Serverless Logs Essentials hides the feature (`xpack.features.overrides`), as that tier has no APM.

- **Serverless and Elastic Cloud Hosted:** a LaunchDarkly rule on `digitalExperience.enabled`, per project or deployment.
- **On-prem and local:** set `feature_flags.overrides: { digitalExperience.enabled: true }` in `kibana.yml`.
- **Kill switch:** turn the flag off. It takes effect on the next page load and on the next API request.
- **GA:** the flag goes away.

`xpack.digital_experience.enabled` is deprecated and ignored; Kibana logs a warning when it is set.

## Pages

### Applications (`/`)

The monitored applications in the selected time range, served by
`GET /internal/digital_experience/applications`, which requires the Digital Experience and APM
privileges like the app.

- **Summary:** applications, sessions, page loads, JS errors per page load, failed HTTP requests and
  the applications with a poor Core Web Vital. Like the chart, it covers the selected environment and
  source; the search narrows only the table. The sessions are the total of the sessions that started
  in the range, over the EDOT Browser applications, so it shows a dash for Classic RUM, which has no
  sessions, and when the EDOT Browser source failed. It adds up to the same total as the sessions in
  the chart.
- **Sessions states:** as EDOT Browser applications are read from the sessions index only, a callout
  above the summary says when it can't answer for the whole range, unless only Classic RUM is
  selected:
  - not set up: the app sets them up for any user who can (see
    [Enabling sessions](#enabling-sessions)), with a **Set up sessions** button to retry a failed
    setup; everyone else is told who sets them up; while they are set up, a message says so;
  - turned off: the summaries built so far are still listed, with a **Turn sessions on** button for
    users who manage sessions in all spaces, and whom to ask for everyone else;
  - being built, after they are set up or after an upgrade with a new `SESSIONS_VERSION`: applications
    and metrics may be missing or incomplete;
  - an API key that no longer works, a failing summaries task, or summaries that are behind: the
    Sessions tab's callouts;
  - a range that starts before the 30 days sessions are kept: the earliest date they cover;
  - no `read` on the sessions index: the partial data warning below.

  With no EDOT Browser application to list, the table says sessions aren't set up or are being
  built instead of pointing to the EDOT Browser docs, and it lists them again once they are.
- **Partial data:** when one source fails to load, a warning above the summary names it (the
  response lists it in `unavailableSources`). A source the user can only partly read is listed in
  `partiallyAvailableSources` and gets its own warning, as Elasticsearch skips the indices of a
  wildcard the user can't read instead of failing, so rows may be missing. The check resolves the
  index expression the source's search sends (exclusions included) as the internal user and as
  the user, which Elasticsearch limits to what they can access, keeps the names the user holds
  `read` on (`security.hasPrivileges`, as `view_index_metadata` also resolves names), and warns
  when the user reaches less data: indices, data streams (a backing index counts as its data
  stream) and alias targets.
  Unused defaults such as `apm-*` don't count, and a role narrower than the wildcard passes when it
  covers every existing index. EDOT Browser is checked on `digital-experience-sessions-browser-*`,
  the only index it reads, whatever the user can read in the raw OTel indices, as the sessions are
  summarized with the access of the user who enabled them. Classic RUM leaves out the EDOT wildcards
  of the default APM indices and the Agent Builder OTel indices, as in APM Diagnostics, and remote
  (CCS or CPS) patterns aren't checked. With security disabled, or if the check fails, no warning
  is shown. It doesn't name the indices, and document- or field-level security isn't reported.
- **Chart:** page loads over time, or the sessions that started, picked with a toggle whose choice
  is kept in local storage; drag over it to zoom into that range. Only EDOT Browser has sessions, so
  the toggle disables **Sessions**, and says why, when only Classic RUM is selected or the EDOT
  Browser source failed. The choice is kept until they are back, the chart showing page loads
  meanwhile.
- **Filters:** environment and source (kept in the URL), and a search on the name.
- **Table:** per application, its source, page loads, JS errors per page load, LCP / INP / CLS / FCP /
  TTFB p75 colored by rating (with the good / needs improvement / poor shares in the tooltip), JS
  errors, failed HTTP requests and when it was last seen. Page loads, which the table is sorted by, is
  always shown; a column selector, kept in local storage, hides FCP, TTFB and JS errors by default.
- **Empty states:** with no applications at all, a link to the EDOT Browser docs; with none in the
  selected environment, a button to show all environments.
- With all sources, a name with data in both shows its EDOT Browser row with a "+ Classic RUM" hint
  that switches the list to the Classic RUM rows.

**Where the EDOT Browser rows come from:** the sessions index only (see [Sessions](#sessions)), as
the current user, over session summaries instead of aggregating every raw event; the list never
reads `logs-*.otel-*` or `traces-*.otel-*`. Classic RUM reads its own indices. Two searches run at
once, one for the metrics and one for the p75 of the vitals: Elasticsearch runs a search on a
shard in one thread, and the percentiles are half the cost, so on a single shard the two finish in
about half the time of one. On 12M synthetic sessions, a 30-day range took about 0.9 s instead of
2 s, 7 days 0.3 s instead of 0.5 s, and 24 hours under 0.1 s; the time grows with the sessions in
the range, not the size of the index. They use the same Elasticsearch CPU in total, so the gain
shrinks when many users load the list at once. Computing the p75 only for the applications of the
table's page was slower: the busiest applications hold most sessions, and the table sorts by the
vitals in the browser. ES|QL took about as long as the search.
Without sessions set up there is no index and so no EDOT Browser application, and a failing
sessions search leaves the source out like any other (`unavailableSources`); the sessions states
above say why rows are missing. The user needs `read` on `digital-experience-sessions-browser-*`,
which a `digital-experience-sessions-*` grant covers.

The counts (page loads, JS errors, HTTP requests, failed requests, web vital samples and their
ratings) are the sums of what each session counted with the same event names the raw search used,
and the environments are the sessions'. How they differ from aggregating the raw events, which the
list did before:

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
  sessions, so they only differ by the events below. The Overview, whose figures need samples, still
  reads the raw events.
- **Freshness:** the sessions are about `frequency` and the sync delay (a minute) behind the events.
  While they are first built, or rebuilt for a new `SESSIONS_VERSION`, older sessions are missing.
- **Lookback:** sessions are kept for 30 days, so a range that starts earlier has no EDOT Browser
  data before then.
- **Access:** the sessions hold what the user who enabled them could read, not what the current user
  can read in the raw indices (see the security note under [Sessions](#sessions)).
- **Events without `session.id`:** the summaries skip them, so they are not counted. In the
  synthtrace data that is 8.7% of the HTTP requests and 3.8% of the exceptions (every page load and
  web vital carried one), so the JS errors and HTTP requests of the list are that much lower than
  from the raw events. An application that sends none is not listed.
- **Last seen:** the end of the application's latest session, which any event can extend.

Numbers, percents, dates and the chart's time zone follow the Advanced Settings.

#### Chart buckets and time zones

The page loads chart and the Overview trends bucket by the time zone of Advanced Settings
(`dateFormat:tz`, or the browser's for `Browser`). From 1 day up, the buckets are calendar days,
weeks or months, so they start at local midnight. Below that they are fixed intervals (up to 12
hours) that keep their local alignment across daylight saving changes; the bucket holding a change
is an hour shorter or longer. The first and last buckets, which cover only part of the selected
range, are shaded as partial data, as in Lens (`Endzones` from `@kbn/charts-plugin`), with its
limits: area charts aren't shaded, and as every bucket is measured by the shortest one, a last
bucket longer than that (a 31-day month after February, a day after a daylight saving change) may
not be.

Both routes take an optional `timeZone` (at most 64 characters; `UTC` when left out): a name
moment-timezone knows, or a `+HH:MM`/`-HH:MM` offset, which the browser sends when it can't name
its time zone. Anything else is a 400. The page sends the four `dateFormat:tz` names Elasticsearch
rejects (`EST`, `HST`, `MST`, `ROC`) as the zones they link to. They return the bucket interval and
the queried range next to the buckets: `pageLoadsOverTime.histogram` on the Applications route and
`overview.trendHistogram` on the Overview route.

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
- **Saved views:** **Views** lists the views of the space, each a name with the filters, KQL query and
  percentile, and optionally the time range; applying one replaces them in one step. Everyone who
  can read the app sees the views of the space and applies them. Saving, saving again and deleting
  need `all` (the `manage` API and `save` UI privileges, and the saved object privilege for the
  `digital-experience-view` type). A view belongs to the space, not to an application, and the space
  holds up to 100, each with a name of its own. The routes are `GET`, `POST`, `PUT` and `DELETE`
  `/internal/digital_experience/views`.
- **Sharing:** the **Share** action in an application's header opens Kibana's Share modal on the
  page the URL shows, any tab. The page is named by the app's locator (`DIGITAL_EXPERIENCE_LOCATOR`,
  `common/locator.ts`): the service, the tab and the URL params it lists (time range, environment,
  source, the Overview's filters, KQL query and percentile, the Sessions list's state). It is
  registered on the browser and on the server, which creates short URLs, and other plugins can look
  it up by its id, e.g. for the link of a rule or a report. With the **Short URLs** sub-feature
  privilege (included in `all`) **Copy link** copies a short URL, a `url` saved object of the space,
  and the modal can fix a relative time range; without it the link is the long URL. Following a
  short URL needs no privilege of its own. A param the pages gain has to be added to
  `DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS`, which a test checks against the params of the Overview
  and the Sessions list.
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

- **Status:** before sessions are set up, the app sets them up for a user who can, and tells everyone
  else who sets them up. A failed setup names the step that failed, with a **Set up sessions**
  button to retry. Once set up, a callout flags sessions that were turned off, an API key that no
  longer works (re-granted by itself for a user who can set sessions up, with a **Set up sessions
  again** button to retry), a failing run of the summaries task with its error, or summaries that
  are behind. Users who manage sessions in all spaces get a **Turn sessions off** action above the
  list, behind a confirmation, and a **Turn sessions on** button once they are off. A line next to the time
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
  Every page view opens a visit, so loading the same URL again is a visit of its own with the web
  vitals it measured, and the visits add up to the summary's `page_view_count`.
- **States:** a 404 leads back to the list; a timeline cut at the event limit is flagged.

## Sessions

A Task Manager task (`digital_experience:sessions-summaries`, every minute) summarizes EDOT Browser
sessions from `traces-*.otel-*,logs-*.otel-*` into `digital-experience-sessions-browser-<version>` with
ES|QL, one document per `service.name` + `session.id`: start/end time and duration, page views with
entry/exit page and journey, page loads, clicks, JS errors, HTTP requests and failed requests, p75
Core Web Vitals with their samples by rating, the p75 load time (`load_time`, from the page loads'
`browser.navigation_timing.load_event_end`, with how many page loads had one, as the Overview leaves
out those without), and environment, user, browser, OS and geo attributes.
Like the applications list, it only reads browser SDK data (`telemetry.sdk.language: webjs`), and it
skips events with an empty `service.name` or `session.id`.

The Sessions tab, the session detail and the applications list read `digital-experience-sessions-browser-*`,
and the index template covers only that pattern, so session summaries of another platform under
`digital-experience-sessions-*` never mix with the browser ones. The privileges below name
`digital-experience-sessions-*`, which covers the browser index.

Setups that enabled sessions before the index was named `digital-experience-sessions-browser-<version>`
keep an unused `digital-experience-sessions-1` index, which can be deleted. Delete their old
`digital-experience-sessions` index template before enabling sessions again, so it does not conflict
with the new `digital-experience-sessions-browser` template.

Each run:

1. Takes the events since its checkpoint, up to a minute ago (the sync delay), in windows.
2. Counts the sessions with an event in the window, and fetches their ids with one query per
   100,000 of them. ES|QL returns at most 10,000 rows, but a row can hold any number of ids, so
   each query aggregates the window once and returns the ids in 4,096 buckets of the SHA-256 of
   their `session.id`, a row each; more sessions take ranges of that hash. Querying ranges of 5,000
   instead made 28 queries for 137,000 sessions, 13s of Elasticsearch time against 0.6s. Hashing
   keeps the ranges even whatever the ids look like (EDOT iOS writes them in uppercase). ES|QL cuts
   a response to `esql.query.result_truncation_max_size` rows without saying so, so each run reads
   that setting, as the internal user, and works within it: fewer id buckets, summary batches of
   half that many sessions, windows sized in those batches, and a batch whose rows still fill the
   cap split in two. A cluster that refuses the read, as serverless does, keeps the default of
   10,000, and a raised setting buys nothing, as the task never asks for more. What it can't split
   is one session id whose applications alone fill the cap, which takes a cap below the number of
   applications sharing an id.
3. Rebuilds the sessions, 5,000 at a time, from their events of the last 24 hours, the longest a
   session lasts, with their ids as a literal `IN` list, which Elasticsearch looks up in the index:
   an `IN (subquery)` scanned the whole lookback. One query returns the counts, times, latest
   attributes, web vitals and journey of each session (see [Summary query](#summary-query)).
4. Turns the rows into summaries 500 at a time, letting the event loop run between chunks, as a
   whole batch at once blocked a small Kibana for about half a second. Writes one summary per
   session, keyed by a hash of `service.name` + `session.id`, in one bulk request per batch, and
   moves the checkpoint past the window. On serverless a bulk waits about 0.15 to 0.4 seconds for
   durability whatever its size: 8,000 summaries took 2.3 s in four sequential bulks and 1.4 s in
   one.

A run starts no window after 45 seconds, and runs again right away while it is behind. On the first
run after sessions are enabled, it starts from 30 days ago, at the start of that day in UTC, so it
catches up window by window, oldest first, and status reports `rebuilding` until it has. A window
grows while it holds few sessions and halves when it holds more than 64 batches (320,000 sessions
at the default row limit). A window still running after 4 minutes stops between rounds of summary
queries, a minute before the task's 5 minute timeout, as Task Manager drops the result of a run
that outlasts it and the next run would retry the same window without end. The run keeps the
windows it finished and its checkpoint, and the next one starts at once: on the same window when
the run reached it after others, with the whole limit this time, and on half of it when it was the
run's first; the summaries already written are just rebuilt again. A one-minute window, the
smallest, that still can't finish in a run of its own fails the run with an error that says so, as
the summaries can't move past it until the task gets more concurrency or Elasticsearch more
capacity. Failures are kept in the task's state, not thrown, so the next run
retries from the same checkpoint, and status shows the error. A summary Elasticsearch refuses
outright, such as one with a value longer than its mapping takes, is left out with a warning
instead, so a single session can't hold up the window and everything behind it. Events that arrive later than the sync
delay after their `@timestamp` are only summarized when another event of their session arrives.

Readers don't depend on how summaries are built. A new `SESSIONS_VERSION` makes the task rebuild
every summary into the new index. The task stands down instead when its state comes from a newer
`SESSIONS_VERSION`, after a rollback or while a rolling upgrade still has older nodes: that version
owns the index and its template, so rebuilding as this one would overwrite them and restart the
backfill.

The journey lists distinct pages in first-view order (revisits are not repeated), from the first 30
page-view URLs, and the exit page is the one viewed last. Each attribute group (environment, user,
user agent, geo) comes from its own latest event that carries any of its fields, and each attribute
from the first of its fields that has a value (`SESSION_ATTRIBUTE_FIELDS`). A session bounced when
it never left the page it landed on, counted from the distinct pages it saw rather than its page
views, as a browser can report more than one of those for the same page. Sessions without a captured
page (only clicks or errors) aren't bounces, and the bounce rate is over sessions with at least one
page view. `page_view_count` counts
page loads and in-app navigations (`documentLoad`, `browser.navigation`); `page_load_count`,
`js_error_count` and the HTTP request counts use the applications list's own definitions. The
summary also keeps a lowercased `search` field (`wildcard`) of the session id, user, browser, OS,
country, city and pages, which the list's search matches anywhere in.

`has_replay` is mapped but never written yet. Session replay records one `elastic.replay.start`
per recorded segment to `logs-rum.replay.otel-*`, which the task already reads as part of
`logs-*.otel-*`, so it can set the field without a `SESSIONS_VERSION` bump and the rebuild one
would cost. It is absent rather than `false` until something sets it, and readers expose it as
`hasReplay`.

`load_time` was added without a bump too, as nothing reads it yet. An index built before it keeps
it in `_source` only (`dynamic: false`), and the summaries it already holds lack it until their
session gets new events, so the first reader of `load_time` needs a `SESSIONS_VERSION` bump.

### Summary query

`sessionSummaryQuery` (`server/services/sessions/summary_queries.ts`) rebuilds a batch of sessions
in one ES|QL query. Its shape, with the aggregations elided:

```esql
FROM traces-*.otel-*, logs-*.otel-*
| WHERE <window> AND <browser SDK> AND attributes.session.id IN (<5,000 ids>)
| EVAL <event flags>, seen_<group> = <timestamp of events with any field of the group>
| FORK (STATS <counts>, start_time, end_time,
              raw_<field> = LAST(TO_STRING(<field>), seen_<group>)
          BY service, session)
       (WHERE event_name IN (<page views>) OR name IN (<page views>)
        | STATS first_view = MIN(@timestamp), last_view = MAX(@timestamp)
            BY service, session, page_url = attributes.url.full)
       (WHERE (event_name == "browser.web_vital" OR name == "browser.web_vital") AND <has a value>
        | EVAL lcp = CASE(vital == "lcp", vital_value, null), ...
        | STATS lcp_p75 = PERCENTILE(lcp, 75), lcp_samples = COUNT(lcp), ...
            BY service, session)
       (WHERE event_name == "browser.navigation_timing" AND <has a load event>
        | STATS load_time_p75 = PERCENTILE(load_time, 75), load_time_samples = COUNT(load_time)
            BY service, session)
| STATS <every session, vital and load time column> = MAX(<column>),
        pages = TOP(first_view, 30, "asc", page_url) WHERE page_url IS NOT NULL,
        exit = LAST(page_url, last_view) WHERE page_url IS NOT NULL
  BY service, session
| EVAL attribute_<name> = COALESCE(<cleaned raw_<field>>, ...)
| EVAL <vital and load time count> = COALESCE(<count>, 0), ...
| DROP raw_*
```

- **The journey is its own branch.** Grouping every aggregation by page URL as well was the main
  cost of the query. The second branch reads only page views and runs alongside the session stats;
  the last `STATS` merges them, taking each column from the one row that has it. The branch filters
  are on the source fields, as the event flags wrap them in `COALESCE`, which keeps Lucene from
  applying them.
- **So are the web vitals**, which are about 7% of the events: computing their columns, p75s and
  counts on every event cost 19% to 32% of the query. A session without a vital has no row in
  their branch, so its vital counts are set to 0 after the merge. The load time, from the page
  loads only, has a branch of its own for the same reason.
- **A column per web vital**, so its p75 and sample count need no filter, and the thresholds
  compare a number instead of the vital's name.
- **Attributes are cleaned once per session.** The query keeps the raw fields of each group's
  latest event and cleans them (trimmed, `""` and `"null"` as missing) after the last stage:
  cleaning every event's fields first took about 40% of the query. Coalescing a group's fields per
  event, before the aggregation, would save another 5% to 9% but isn't equivalent: a blank value
  in a higher-priority field would win over a real value in a lower one, and then be cleaned to
  null.
- `FORK` needs Elasticsearch 9.4 or later, where its branches have no implicit `LIMIT 1000`.

On 5,000 sessions of synthtrace data, the `FORK` version takes 10% to 27% less time and 5% to 15%
less data-node CPU than aggregating per page URL first, depending on the segment layout, with
identical rows ([#306059](https://github.com/elastic/kibana/issues/306059)), and the vitals branch
another 19% to 32%. The measurements behind the task's design, where the time goes, and what was
tried and dropped are in
[`server/services/sessions/query_performance.md`](server/services/sessions/query_performance.md),
with how to check a change: run the old and new query on the same session ids and compare every
column of every row.

### Enabling sessions

Sessions are set up with `POST /internal/digital_experience/sessions/enable`, which requires only
`read_digital_experience`: the Elasticsearch privileges below are the real gate. As the applications
list needs them, the app calls it by itself, once per visit, when status reports `autoEnable`:
sessions aren't set up (or their API key no longer works) and weren't turned off, Task Manager is
available, Kibana can store an API key, and the user passes the Elasticsearch checks below, which
status runs so that users who would fail write no failed audit event. The **Set up sessions** button
retries a failed setup. The first such user to open the app is the one whose access the summaries
hold (see the security note below).

Once sessions work, changing that identity, or turning sessions off and back on, takes the
**Sessions → Manage session summaries** sub-feature privilege, part of **All**, in all spaces:
the task and index serve every space. Kibana only enforces all spaces in the role editor and role
API, so the routes also check `manage_digital_experience_sessions` globally. For anyone else,
enabling sessions that already work answers their current status without changing anything, so an
automatic setup that races another user's is harmless. The user also needs these Elasticsearch
privileges; when any is missing the request fails with a 403 listing them, before anything is
written:

- `traces-*.otel-*`, `logs-*.otel-*`: `read`, `view_index_metadata`
- `digital-experience-sessions-*`: `read`, `view_index_metadata`, `index`, `create_index`
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
2. `template`: puts the `digital-experience-sessions-browser` index template, as Kibana's internal user.
3. `index`: creates the sessions index, as the user.
4. `task`: schedules the summaries task with an API key that Task Manager grants on the user's behalf,
   turns it back on if it was turned off, and runs it right away.

Every step is safe to repeat, and the steps before a failed one are harmless on their own, so
enabling again retries from where it failed. Enabling again also gives the task a new key, granted
on behalf of whoever enabled it last, and Task Manager invalidates the previous one. The task keeps
its state, so its summaries are kept. The task never runs as the Kibana internal user: only the
index template is the internal user's. Each enable writes a `digital_experience_sessions_enable`
audit event, successful or not. Status reports who last enabled sessions, and why the last run
failed, only to users who manage sessions: Elasticsearch errors can name that user, their roles
and indices, so the others get a generic message. A run in progress doesn't stop enabling again
from replacing the key. Without Task Manager, sessions can't be enabled.

Like any granted key, the task's key has the access the user had when it was granted, and no
expiration. Anyone with `manage_api_key` or `manage_security`, or the enabling user with
`manage_own_api_key`, can invalidate it. The task's runs then fail with a 401, which status reports
as `apiKeyInvalid`. The app then sets sessions up again for the next user who can, which grants a
new key on their behalf; while that user lacks the Elasticsearch privileges, the callout stays.

`POST /internal/digital_experience/sessions/disable` turns sessions off for every space. It
requires `manage_digital_experience_sessions` in all spaces, answers 404 when sessions aren't set
up, and writes a `digital_experience_sessions_disable` audit event. It disables the summaries task,
keeping its state, its key and the sessions index, so readers still see the summaries built so far,
marked as turned off (`disabled`, health `disabled`). The app never sets turned-off sessions up by
itself, and enabling them answers 403 to anyone who doesn't manage sessions in all spaces. Turning
them back on grants a new key, Task Manager invalidates the old one, and the task carries on from
its checkpoint, rebuilding what it missed within the lookback. Removing the task
(`digital_experience:sessions-summaries`) with the Task Manager API also stops it and invalidates
its key, after which sessions are set up again like the first time.

### Scaling and freshness

Each run rebuilds every session that received new events from its whole history, so cost grows with
active sessions × events per session. On the same data at about 3M sessions a day, a prototype of
the same loop used 2 to 3 times less Elasticsearch CPU than the transform: about 23,000 changed
sessions in 2.1 to 2.7 seconds a run against 7.2 to 9.6, and a 625,000 session backfill in 99 to
126 seconds against 295. One setting trades cost for freshness, another speed for resources:

```yaml
xpack.digital_experience.sessions:
  frequency: 1m   # 1s–1h. Longer means fewer rebuilds of each active session: cheaper, but staler.
  concurrency: 2  # 1–4 summary queries at once. More keeps up with busier sites, for more resources.
```

- **`frequency`**: an active session is re-read and rewritten once per run. Going from `1m` to
  `2m`–`5m` cuts the work roughly 2–5× for long sessions, and adds about the same time to the session
  list's lag. Session detail reads raw events up to the longest a session lasts, so its timeline
  stays current; its summary figures are as fresh as the last run. A changed `frequency` applies
  after a restart, from the task's next run once it has caught up.
- **`concurrency`**: a run rebuilds the changed sessions in queries of 5,000, this many at a time.
  At 75× the scale of the load tests each query took about 2 seconds, so one at a time needed more
  than the minute; each one more in flight costs Elasticsearch CPU and about 50 MB of Kibana memory
  while a run is busy. On two 32 vCPU Elasticsearch nodes at about 300,000 changed sessions a
  minute, 4 took runs from about 106 to 77 seconds. It applies after a restart, which is also when
  the task's Task Manager cost is set from it, so a node budgets for the memory the queries
  actually hold: `Normal` for one, `Large` for the default two and `ExtraLarge` for three or four,
  which Task Manager budgets about 50, 100 and 250 MB for. Four is the most that covers, so it is
  the maximum.

Status reports the summaries as lagging when their checkpoint is more than three runs plus the sync
delay behind, and at least 5 minutes, once they have caught up; the task logs when a run starts
failing, with its error, and when runs work again. If the task falls behind under peak traffic, it
lags and then catches up; no data is lost.

> **Security note:** the sessions index contains summaries of everything the enabling user could
> read in the source indices, regardless of the document- and field-level security or index
> privileges of the people who later read it. Enable sessions with a user whose source access is
> appropriate for every reader of `digital-experience-sessions-*`.

### Reading sessions

The applications list reads the sessions index as the current user too, and without `read` on it
lists no EDOT Browser application and warns of partial data (see [Applications](#applications-)).
Session routes require
`read_digital_experience` and query Elasticsearch as the current user, so
readers also need `read` on `digital-experience-sessions-*` (and on the source indices for the
session detail timeline). Without it they answer 403 naming those privileges; other failures are
logged and answer 500 without Elasticsearch details:

- `GET /internal/digital_experience/sessions/status`: whether sessions are set up or turned off, the
  task's health, lag and last error, whether it is still building, how many days sessions are kept, and whether the
  app should set them up for the current user (`autoEnable`).
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
