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
exposed by `@kbn/ux-plugin`; the EDOT Browser Overview is a placeholder for now. Without `source`, the
page shows the Classic RUM application.

## Code layout

- `common/`: the API types (`common/types/`), Core Web Vitals thresholds and shared constants.
- `server/routes/applications/`: the list's route, its merge step and one folder per source (`otel/`,
  `classic/`); helpers shared across features are in `server/lib/helpers/`.
- `public/pages/`: one folder per page (`applications_list/`, `application_details/`) with its own
  components, hooks and utils; what several pages share is in `public/components/`, `public/hooks/`
  and `public/utils/`. `public/application/` is the app shell.
