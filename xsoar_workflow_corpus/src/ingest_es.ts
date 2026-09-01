import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { createGapAnalysisDashboard } from './create_dashboard.ts';
import { corpusDirs, ensureSeedCorpus } from './paths.ts';
import type { ConnectorFrequencyRow, GapEvent, InventoryFile } from './types.ts';

const ES_URL = process.env.ES_URL ?? 'http://localhost:9200';
const ES_AUTH = process.env.ES_AUTH ?? 'elastic:changeme';
const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const KIBANA_AUTH = process.env.KIBANA_AUTH ?? ES_AUTH;

function authHeader(auth: string): string {
  return `Basic ${Buffer.from(auth).toString('base64')}`;
}

async function es(method: string, urlPath: string, body?: unknown): Promise<{ status: number; json: unknown }> {
  const headers: Record<string, string> = {
    Authorization: authHeader(ES_AUTH),
    'Content-Type': 'application/json',
  };
  const res = await fetch(`${ES_URL}${urlPath}`, {
    method,
    headers,
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function kibana(method: string, urlPath: string, body?: unknown): Promise<{ status: number }> {
  const res = await fetch(`${KIBANA_URL}${urlPath}`, {
    method,
    headers: {
      Authorization: authHeader(KIBANA_AUTH),
      'kbn-xsrf': 'true',
      'x-elastic-internal-origin': 'Kibana',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status };
}

const KEYWORD = { type: 'keyword' as const };
const TEXT = { type: 'text' as const, fields: { keyword: { type: 'keyword', ignore_above: 1024 } } };
const BOOLEAN = { type: 'boolean' as const };
const INTEGER = { type: 'integer' as const };
const DATE = { type: 'date' as const };

async function putTemplate(name: string, patterns: string[], mappings: Record<string, unknown>): Promise<void> {
  const { status, json } = await es('PUT', `/_index_template/${name}`, {
    index_patterns: patterns,
    template: { mappings: { properties: mappings } },
    priority: 200,
  });
  if (status >= 300) {
    throw new Error(`Template ${name} failed (${status}): ${JSON.stringify(json)}`);
  }
}

function bulkNdjson(index: string, docs: Array<{ id?: string; body: unknown }>): string {
  const lines: string[] = [];
  for (const doc of docs) {
    const action: Record<string, unknown> = { index: { _index: index } };
    if (doc.id) {
      (action.index as Record<string, string>)._id = doc.id;
    }
    lines.push(JSON.stringify(action));
    lines.push(JSON.stringify(doc.body));
  }
  return `${lines.join('\n')}\n`;
}

async function bulkIndex(index: string, docs: Array<{ id?: string; body: unknown }>): Promise<number> {
  if (docs.length === 0) {
    return 0;
  }
  const chunkSize = 500;
  let indexed = 0;
  for (let i = 0; i < docs.length; i += chunkSize) {
    const chunk = docs.slice(i, i + chunkSize);
    const { status, json } = await es('POST', '/_bulk', bulkNdjson(index, chunk));
    if (status >= 300) {
      throw new Error(`Bulk ${index} failed (${status}): ${JSON.stringify(json).slice(0, 500)}`);
    }
    const result = json as { errors?: boolean; items?: Array<Record<string, { status: number }>> };
    if (result.errors) {
      const first = result.items?.find((item) => {
        const op = Object.values(item)[0];
        return op && op.status >= 300;
      });
      throw new Error(`Bulk ${index} had errors: ${JSON.stringify(first).slice(0, 500)}`);
    }
    indexed += chunk.length;
  }
  return indexed;
}

export async function ingestToElastic(): Promise<void> {
  ensureSeedCorpus();

  const ping = await es('GET', '/');
  if (ping.status >= 300) {
    throw new Error(`Elasticsearch not reachable at ${ES_URL} (${ping.status})`);
  }

  await putTemplate('xsoar-workflow-gaps', ['xsoar-workflow-gaps*'], {
    '@timestamp': DATE,
    event: { properties: { kind: KEYWORD, dataset: KEYWORD } },
    xsoar: {
      properties: {
        pack: KEYWORD,
        playbook: TEXT,
        playbook_id: KEYWORD,
        task: TEXT,
        task_id: KEYWORD,
        gap: {
          properties: {
            bucket: KEYWORD,
            is_critical: BOOLEAN,
            is_optional: BOOLEAN,
            is_blocker: BOOLEAN,
          },
        },
        trigger: KEYWORD,
        approval_type: KEYWORD,
        command: KEYWORD,
        script_name: KEYWORD,
      },
    },
    connector: { properties: { brand: KEYWORD, brand_raw: KEYWORD } },
    elastic: { properties: { match: KEYWORD, connector_id: KEYWORD } },
  });

  await putTemplate('xsoar-workflow-playbooks', ['xsoar-workflow-playbooks*'], {
    '@timestamp': DATE,
    pack: KEYWORD,
    pack_name: KEYWORD,
    playbook_id: KEYWORD,
    name: TEXT,
    inbound_trigger: KEYWORD,
    system: BOOLEAN,
    has_parallel_fanout: BOOLEAN,
    has_human_approval: BOOLEAN,
    has_ml: BOOLEAN,
    is_blocked: BOOLEAN,
    blocker_gap_count: INTEGER,
    non_blocker_gap_count: INTEGER,
    nested_playbooks: KEYWORD,
    'connector.brands': KEYWORD,
    connectors: {
      type: 'nested',
      properties: {
        brand: KEYWORD,
        brand_raw: KEYWORD,
        task_count: INTEGER,
        is_optional: BOOLEAN,
        elastic_match: KEYWORD,
        elastic_connector_id: KEYWORD,
      },
    },
    step_counts: { type: 'object', dynamic: true },
  });

  await putTemplate('xsoar-workflow-connectors', ['xsoar-workflow-connectors*'], {
    '@timestamp': DATE,
    connector_brand: KEYWORD,
    tasks: INTEGER,
    distinct_playbooks: INTEGER,
    distinct_packs: INTEGER,
    critical_tasks: INTEGER,
    optional_tasks: INTEGER,
    blocker_tasks: INTEGER,
    elastic_match: KEYWORD,
    elastic_connector_id: KEYWORD,
  });

  await putTemplate('xsoar-workflow-approvals', ['xsoar-workflow-approvals*'], {
    '@timestamp': DATE,
    pack: KEYWORD,
    playbook: TEXT,
    approval_text: TEXT,
    approval_type: KEYWORD,
    is_critical: BOOLEAN,
  });

  const ts = new Date().toISOString();
  const del = await es(
    'DELETE',
    '/xsoar-workflow-gaps,xsoar-workflow-playbooks,xsoar-workflow-connectors,xsoar-workflow-approvals'
  );
  if (del.status >= 300 && del.status !== 404) {
    console.warn(`Index delete returned ${del.status}`);
  }

  const fullInventory = path.join(corpusDirs.inventory, 'playbooks.json');
  const summaryInventory = path.join(corpusDirs.inventory, 'playbooks_summary.json');
  const inventoryPath = existsSync(fullInventory) ? fullInventory : summaryInventory;
  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8')) as InventoryFile;
  const playbookDocs = inventory.playbooks.map((p) => ({
    id: `${p.pack}:${p.id}`,
    body: {
      '@timestamp': ts,
      pack: p.pack,
      pack_name: p.pack_name,
      playbook_id: p.id,
      name: p.name,
      description: p.description,
      inbound_trigger: p.inbound_trigger,
      system: p.system,
      has_parallel_fanout: p.has_parallel_fanout,
      has_human_approval: p.has_human_approval,
      has_ml: p.has_ml,
      is_blocked: p.is_blocked,
      blocker_gap_count: p.blocker_gap_count,
      non_blocker_gap_count: p.non_blocker_gap_count,
      nested_playbooks: p.nested_playbooks,
      'connector.brands': p.connectors.map((c) => c.brand),
      connectors: p.connectors,
      step_counts: p.step_counts,
    },
  }));
  const playbookCount = await bulkIndex('xsoar-workflow-playbooks', playbookDocs);
  console.log(`Indexed ${playbookCount} playbooks`);

  let gapCount = 0;
  try {
    const ndjson = readFileSync(path.join(corpusDirs.telemetry, 'gap_events.ndjson'), 'utf8')
      .trim()
      .split('\n')
      .filter(Boolean);
    const gapDocs = ndjson.map((line) => ({ body: JSON.parse(line) as GapEvent }));
    gapCount = await bulkIndex('xsoar-workflow-gaps', gapDocs);
    console.log(`Indexed ${gapCount} gap events`);
  } catch {
    console.log('No gap_events.ndjson yet — run convert first for gap telemetry');
  }

  try {
    const frequency = JSON.parse(
      readFileSync(path.join(corpusDirs.analysis, 'connector_frequency.json'), 'utf8')
    ) as ConnectorFrequencyRow[];
    const connectorDocs = frequency.map((r) => ({
      id: r.connector_brand,
      body: { '@timestamp': ts, ...r },
    }));
    console.log(`Indexed ${await bulkIndex('xsoar-workflow-connectors', connectorDocs)} connector brands`);
  } catch {
    console.log('No connector_frequency.json yet — run convert or inventory analysis first');
  }

  const approvalDocs = inventory.playbooks.flatMap((p) =>
    p.approvals.map((a, i) => ({
      id: `${p.pack}:${p.id}:${i}`,
      body: {
        '@timestamp': ts,
        pack: p.pack,
        playbook: p.name,
        approval_text: a.task_name,
        approval_type: a.approval_type,
        is_critical: a.is_critical,
      },
    }))
  );
  console.log(`Indexed ${await bulkIndex('xsoar-workflow-approvals', approvalDocs)} approvals`);

  const dv = await kibana('POST', '/api/data_views/data_view', {
    data_view: {
      title: 'xsoar-workflow-*',
      name: 'XSOAR Workflow Gaps',
      timeFieldName: '@timestamp',
    },
    override: true,
  });
  if (dv.status >= 300 && dv.status !== 409) {
    console.warn(`Data view create returned HTTP ${dv.status} (Kibana may not be running)`);
  } else {
    console.log(`Kibana data view xsoar-workflow-* ready at ${KIBANA_URL}`);
  }

  try {
    await createGapAnalysisDashboard();
  } catch (error) {
    console.warn(`Dashboard skipped/failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
