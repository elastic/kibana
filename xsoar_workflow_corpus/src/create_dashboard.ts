const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const KIBANA_AUTH = process.env.KIBANA_AUTH ?? process.env.ES_AUTH ?? 'elastic:changeme';
const DASHBOARD_ID = 'xsoar-workflow-gap-analysis';
const API_VERSION = '2023-10-31';

type Grid = { x: number; y: number; w: number; h: number };

function authHeader(auth: string): string {
  return `Basic ${Buffer.from(auth).toString('base64')}`;
}

async function kibana(
  method: string,
  urlPath: string,
  body?: unknown
): Promise<{ status: number; json: unknown; text: string }> {
  const res = await fetch(`${KIBANA_URL}${urlPath}`, {
    method,
    headers: {
      Authorization: authHeader(KIBANA_AUTH),
      'kbn-xsrf': 'true',
      'elastic-api-version': API_VERSION,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json, text };
}

function markdownPanel(grid: Grid, content: string): Record<string, unknown> {
  return {
    grid,
    type: 'markdown',
    config: { content },
  };
}

function metricPanel(grid: Grid, title: string, query: string, column: string): Record<string, unknown> {
  return {
    grid,
    type: 'vis',
    config: {
      type: 'metric',
      title,
      data_source: { type: 'esql', query },
      metrics: [{ type: 'primary', column }],
    },
  };
}

function barPanel(
  grid: Grid,
  title: string,
  query: string,
  xColumn: string,
  yColumn: string,
  layerType: 'bar' | 'bar_horizontal'
): Record<string, unknown> {
  return {
    grid,
    type: 'vis',
    config: {
      type: 'xy',
      title,
      layers: [
        {
          type: layerType,
          data_source: { type: 'esql', query },
          x: { column: xColumn },
          y: [{ column: yColumn }],
        },
      ],
    },
  };
}

function dashboardBody(): Record<string, unknown> {
  return {
    title: 'XSOAR Workflow Gap Analysis',
    time_range: { from: 'now-10y', to: 'now' },
    panels: [
      markdownPanel(
        { x: 0, y: 0, w: 48, h: 8 },
        [
          '## Blocker vs non-blocker',
          '',
          'A **blocker** is an unsupported step on the default success path that is **not** optional (`skipunavailable` / `isOptional`). The happy-path investigation cannot complete without that capability.',
          '',
          'A **non-blocker** is optional vendor fan-out, an off-path branch, or a layout/SLA/ML side task. The converted workflow can still run without it.',
          '',
          'Console stubs mean YAML *parses*; blocker is about whether the happy-path investigation can complete without that capability.',
        ].join('\n')
      ),
      metricPanel(
        { x: 0, y: 8, w: 12, h: 5 },
        'Playbooks',
        'FROM xsoar-workflow-playbooks | STATS playbooks = COUNT()',
        'playbooks'
      ),
      metricPanel(
        { x: 12, y: 8, w: 12, h: 5 },
        'Blocked playbooks',
        'FROM xsoar-workflow-playbooks | WHERE is_blocked == true | STATS blocked = COUNT()',
        'blocked'
      ),
      metricPanel(
        { x: 24, y: 8, w: 12, h: 5 },
        'Blocker gaps',
        'FROM xsoar-workflow-gaps | WHERE xsoar.gap.is_blocker == true | STATS blockers = COUNT()',
        'blockers'
      ),
      metricPanel(
        { x: 36, y: 8, w: 12, h: 5 },
        'Non-blocker gaps',
        'FROM xsoar-workflow-gaps | WHERE xsoar.gap.is_blocker == false | STATS non_blockers = COUNT()',
        'non_blockers'
      ),
      barPanel(
        { x: 0, y: 13, w: 24, h: 12 },
        'Gaps by blocker flag',
        'FROM xsoar-workflow-gaps | STATS c = COUNT() BY blocker = xsoar.gap.is_blocker',
        'blocker',
        'c',
        'bar_horizontal'
      ),
      barPanel(
        { x: 24, y: 13, w: 24, h: 12 },
        'Blocker gaps by bucket',
        'FROM xsoar-workflow-gaps | WHERE xsoar.gap.is_blocker == true | STATS c = COUNT() BY bucket = xsoar.gap.bucket',
        'bucket',
        'c',
        'bar'
      ),
      barPanel(
        { x: 0, y: 25, w: 24, h: 14 },
        'Top 15 blocker brands with no Elastic connector',
        'FROM xsoar-workflow-gaps | WHERE xsoar.gap.is_blocker == true AND elastic.match == "none" AND connector.brand IS NOT NULL | STATS c = COUNT() BY brand = connector.brand | SORT c DESC | LIMIT 15',
        'brand',
        'c',
        'bar'
      ),
      barPanel(
        { x: 24, y: 25, w: 24, h: 14 },
        'Top packs by blocked playbooks',
        'FROM xsoar-workflow-playbooks | WHERE is_blocked == true | STATS c = COUNT() BY pack | SORT c DESC | LIMIT 15',
        'pack',
        'c',
        'bar'
      ),
      barPanel(
        { x: 0, y: 39, w: 48, h: 12 },
        'Elastic match for blocker connector gaps',
        'FROM xsoar-workflow-gaps | WHERE xsoar.gap.is_blocker == true AND xsoar.gap.bucket == "connector_gap" | STATS c = COUNT() BY match = elastic.match',
        'match',
        'c',
        'bar'
      ),
    ],
  };
}

export function dashboardUrls(): { dashboard: string; discover: string } {
  return {
    dashboard: `${KIBANA_URL}/app/dashboards#/view/${DASHBOARD_ID}`,
    discover: `${KIBANA_URL}/app/discover#/?_g=(time:(from:now-10y,to:now))`,
  };
}

export async function createGapAnalysisDashboard(): Promise<{ dashboard: string; discover: string }> {
  const { status, json, text } = await kibana(
    'PUT',
    `/api/dashboards/${DASHBOARD_ID}`,
    dashboardBody()
  );
  if (status >= 300) {
    throw new Error(
      `Dashboard upsert failed (${status}): ${typeof json === 'object' ? JSON.stringify(json).slice(0, 800) : text.slice(0, 800)}`
    );
  }
  const urls = dashboardUrls();
  console.log(`Dashboard ${status === 201 ? 'created' : 'updated'}: ${urls.dashboard}`);
  console.log(`Discover: ${urls.discover}`);
  return urls;
}
