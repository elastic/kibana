# Entities grid queries

This folder builds the ES|QL queries that fill the entities grid. This page explains which
query runs for each sort, and why. For how the grid loads a page (rows, count, extra columns),
see the comment on `useEntityGridData` in `../hooks/use_entity_grid_data.ts`.

## Words used here

- **Entities in view**: the entities that are rows of the grid. That means the allowed entity
  types, only the main entity of each group when rows are resolved, and the current filters.
  See `entities_in_view.ts`.
- **Search** vs **entity filters**: the search is the search bar text and its filter pills.
  Entity filters are the filter dropdowns and the selected tile. Queries keep them apart
  because KQL (the search) can't run after a `LOOKUP JOIN`.
- **Native sort**: the sorted value is stored on the entity, like name or risk score. One query
  on the entity index does it.
- **Foreign sort**: the sorted value comes from somewhere else, like alert counts or anomaly
  counts, and has to be counted per entity first. The entity's own fields are then added with a
  `LOOKUP JOIN`.
- **Value rows** and **empty rows**: for a foreign sort, value rows are entities that have a
  value (for example, at least one alert). Empty rows are the rest. Empty rows all have the same
  value, so they sort among themselves by `entity.id`.
- **Group** and **Records**: a group is a main entity plus the entities resolved to it (its
  aliases). Records is the number of entities in the group.
- **EUID**: an entity id built from raw fields, like `host:<host.id>`. Alerts and anomalies are
  matched to entities by EUID (`euid_pipeline.ts`). Some alerts already carry the entity id in
  `kibana.alert.entity.id` ("stamped"); for the others the id is built from their user, host
  and service fields.
- **Prefilter**: a cheap filter that Elasticsearch can run on its index before an expensive
  exact filter. It keeps more docs than needed, so the exact filter after it stays correct
  while only checking a few docs.

## What every query has in common

- **Paging**: each query returns one page plus one extra row. The extra row tells whether there
  is a next page. The last row of a page is where the next page starts (`buildCursorClause` in
  `esql.ts`).
- **Time range**: always written as `esqlLookback(range)`, which is `NOW() - N days`. The grid
  and the tiles use the same helper, so they agree on the window.
- **Count**: always the number of entities in view. Besides showing the total, it tells the
  grid how big the view is, which decides the query below.
- **Extra columns**: after the rows load, each column with computed values (alerts, anomalies,
  cases, records, risk change) reads them for just those rows. If the sort query already read a
  column, it is skipped (an alert sort already has the alert counts).

## Which query runs

A view is **large** when it has at least `SPLIT_SORT_MIN_VIEW_SIZE` entities (`split_sort.ts`).
Small views use one simple query per column. On large views that simple query gets slow (about
20s for 10M entities), so large views use the faster plans described after the table.

| Sort | Search? | Small view | Large view |
|---|---|---|---|
| Name, type, risk score, criticality, first seen, last seen | any | one query on the entity index (`native.ts`) | same |
| Alerts, last alert | no | alerts and entities read together and merged (`alerts.ts`) | split sort |
| Anomalies | no | anomalies merged with the entities in view (`anomalies.ts`, `foreign_sort.ts`) | split sort |
| Risk score change | no | old scores merged with the entities in view (`risk_score_change.ts`) | split sort for scored entities |
| Alerts, anomalies, risk change | yes | the small view query | the small view query |
| Records | no, no entity filters | count every group, sort, then add the page's entity fields (`group_size.ts`) | groups and single entities |
| Records | no, with entity filters | groups merged with the filtered single entities | groups and single entities |
| Records | yes | the matching entities, then their group sizes | same |

**Split sort** (alerts, last alert, anomalies; `buildEntityListSortPlan` in `split_sort.ts`).
It reads value rows and empty rows separately:
- Value rows: count the alerts (or anomalies) per entity, then add the entity fields.
- Empty rows: a plain query on the entity index for the entities in view that are not in the
  value rows.

A page can take the end of one part and the start of the other. Entities with no alerts have
0, so they come first when sorting ascending. A missing last alert or anomaly count has no
value, so it always comes last.

**Split sort for scored entities** (risk score change). Only entities with a risk score can
have a change.
- Value rows: compare the old and current scores of the scored entities.
- Empty rows: the entities without a score (a plain query), plus the scored entities that had
  no old score.

**Groups and single entities** (Records, `runAliasGroupsPage`). Most entities are alone in their
group. So:
- the groups with aliases are built from the alias entities, which are few;
- the single entities are read in order from the entity index, a page at a time;
- the browser merges both, and then reads the entity fields of the page's groups.

**Records with a search** (`runSearchedTargetsPage`). The search decides which rows show, but
not their values: a row keeps the size of its whole group, so it can still be expanded.
- Up to `MAX_DIRECT_TARGETS` matches: read the matching entities, then the size of just their
  groups. This is fast for narrow searches.
- More matches: use the groups and single entities plan, keeping only the groups whose main
  entity matches the search.

## When a plan can't be used

| When | What happens |
|---|---|
| More than `MAX_VALUE_ROWS` entities have a value | the split sort can't list them in one query, so the small view query runs |
| More than `MAX_ALIAS_GROUPS` groups have aliases | Records runs its small view query |
| More than `MAX_DIRECT_TARGETS` entities match a Records search | Records uses the groups and single entities plan |
| A list of ids is longer than `ID_LIST_CHUNK_SIZE` | it is split into several queries: an ES\|QL query can't be longer than 1MB, and ids can be about 100 characters long |
| The count fails | the view counts as small, so the small view queries run |
| A computed column fails | its cells stay empty, the other columns still load, and the grid shows an error toast |

## Checking a change

`query_builders.test.ts` snapshots the text of every query on this page, including all the
queries a large view runs. The tiles have their own snapshots. A change that shouldn't change
results should leave the snapshots alone; one that should, should only change the lines it
means to. Query changes so far were also checked on a 10M-entity ECH, comparing the rows and
timings of the old and new queries.
