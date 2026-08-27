import path from 'node:path';
import { writeJson, writeText, toCsv } from './json.ts';
import { corpusDirs } from './paths.ts';
import type { ConnectorFrequencyRow, GapEvent, PlaybookIR } from './types.ts';

export function connectorFrequency(playbooks: PlaybookIR[]): ConnectorFrequencyRow[] {
  const map = new Map<
    string,
    {
      tasks: number;
      critical: number;
      optional: number;
      blockers: number;
      playbooks: Set<string>;
      packs: Set<string>;
      match: ConnectorFrequencyRow['elastic_match'];
      id: string | null;
    }
  >();
  for (const ir of playbooks) {
    for (const task of ir.tasks) {
      const brand = task.connectorBrand;
      if (!brand || brand.startsWith('Unmapped command:')) {
        continue;
      }
      if (task.type === 'start' || task.type === 'title') {
        continue;
      }
      let row = map.get(brand);
      if (!row) {
        row = {
          tasks: 0,
          critical: 0,
          optional: 0,
          blockers: 0,
          playbooks: new Set(),
          packs: new Set(),
          match: task.elasticMatch ?? 'none',
          id: task.elasticConnectorId,
        };
        map.set(brand, row);
      }
      row.tasks += 1;
      if (task.isCritical) {
        row.critical += 1;
      }
      if (task.skipunavailable || task.isOptional) {
        row.optional += 1;
      }
      if (task.isBlocker) {
        row.blockers += 1;
      }
      row.playbooks.add(ir.id);
      row.packs.add(ir.pack);
    }
  }
  return [...map.entries()]
    .map(([brand, row]) => ({
      connector_brand: brand,
      tasks: row.tasks,
      distinct_playbooks: row.playbooks.size,
      distinct_packs: row.packs.size,
      critical_tasks: row.critical,
      optional_tasks: row.optional,
      blocker_tasks: row.blockers,
      elastic_match: row.match,
      elastic_connector_id: row.id,
    }))
    .sort((a, b) => b.tasks - a.tasks || a.connector_brand.localeCompare(b.connector_brand));
}

export function gapEvents(playbooks: PlaybookIR[]): GapEvent[] {
  const ts = new Date().toISOString();
  const events: GapEvent[] = [];
  for (const ir of playbooks) {
    for (const task of ir.tasks) {
      if (!task.gapBucket) {
        continue;
      }
      events.push({
        '@timestamp': ts,
        event: { kind: 'event', dataset: 'xsoar.workflow.gap' },
        xsoar: {
          pack: ir.pack,
          playbook: ir.name,
          playbook_id: ir.id,
          task: task.name,
          task_id: task.id,
          gap: {
            bucket: task.gapBucket,
            is_critical: task.isCritical,
            is_optional: task.skipunavailable || task.isOptional,
            is_blocker: task.isBlocker,
          },
          trigger: ir.inboundTrigger,
          approval_type: task.approvalType,
          command: task.command,
          script_name: task.scriptName,
        },
        connector: { brand: task.connectorBrand, brand_raw: task.brandRawResolved },
        elastic: { match: task.elasticMatch, connector_id: task.elasticConnectorId },
      });
    }
  }
  return events;
}

export function writeAnalysis(
  playbooks: PlaybookIR[],
  label: string,
  prefix = ''
): {
  frequency: ConnectorFrequencyRow[];
  events: GapEvent[];
} {
  const frequency = connectorFrequency(playbooks);
  const events = gapEvents(playbooks);
  const p = prefix;

  writeText(
    path.join(corpusDirs.analysis, `${p}connector_frequency.csv`),
    toCsv(
      [
        'connector_brand',
        'tasks',
        'distinct_playbooks',
        'distinct_packs',
        'critical_tasks',
        'optional_tasks',
        'blocker_tasks',
        'elastic_match',
        'elastic_connector_id',
      ],
      frequency.map((r) => [
        r.connector_brand,
        r.tasks,
        r.distinct_playbooks,
        r.distinct_packs,
        r.critical_tasks,
        r.optional_tasks,
        r.blocker_tasks,
        r.elastic_match,
        r.elastic_connector_id,
      ])
    )
  );

  const approvalRows: Array<Array<string | number | boolean | null>> = [];
  for (const ir of playbooks) {
    for (const a of ir.approvals) {
      approvalRows.push([ir.pack, ir.name, a.taskName, a.approvalType, a.isCritical]);
    }
  }
  writeText(
    path.join(corpusDirs.analysis, `${p}approval_inventory.csv`),
    toCsv(['pack', 'playbook', 'approval_text', 'approval_type', 'is_critical'], approvalRows)
  );

  const buckets = { connector_gap: 0, mapping_debt: 0, platform_primitive_gap: 0 };
  let criticalGaps = 0;
  let blockerGaps = 0;
  let nonBlockerGaps = 0;
  let blockedPlaybooks = 0;
  let hitl = 0;
  let techPreview = 0;
  const unmapped = new Map<string, number>();
  for (const ir of playbooks) {
    hitl += ir.approvals.length;
    if (ir.isBlocked) {
      blockedPlaybooks += 1;
    }
    for (const t of ir.tasks) {
      if (t.gapBucket) {
        buckets[t.gapBucket] += 1;
        if (t.isCritical) {
          criticalGaps += 1;
        }
        if (t.isBlocker) {
          blockerGaps += 1;
        } else {
          nonBlockerGaps += 1;
        }
      }
      if (t.elasticStability === 'tech_preview') {
        techPreview += 1;
      }
      if (t.connectorBrand?.startsWith('Unmapped command:')) {
        unmapped.set(t.connectorBrand, (unmapped.get(t.connectorBrand) ?? 0) + 1);
      }
    }
  }

  const top = frequency.slice(0, 25);
  const missing = frequency.filter((r) => r.elastic_match === 'none').slice(0, 25);
  const md = [
    `# XSOAR → Elastic Workflows gap metrics (${label})`,
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Corpus',
    '',
    `- Playbooks: ${playbooks.length}`,
    `- Packs: ${new Set(playbooks.map((p) => p.pack)).size}`,
    `- Connector brands: ${frequency.length}`,
    `- Gap events: ${events.length} (${blockerGaps} blockers, ${nonBlockerGaps} non-blockers, ${criticalGaps} on happy path)`,
    `- Blocked playbooks (any blocker gap): ${blockedPlaybooks}`,
    `- Human-approval tasks: ${hitl}`,
    `- Tech-preview Kibana mappings: ${techPreview}`,
    '',
    'A **blocker** is an unsupported step on the default success path that is not optional. Optional vendor fan-out (`skipunavailable`), off-path branches, and layout/SLA/ML side tasks are **non-blockers**.',
    '',
    '## Gap buckets',
    '',
    `- connector_gap: ${buckets.connector_gap}`,
    `- mapping_debt: ${buckets.mapping_debt}`,
    `- platform_primitive_gap: ${buckets.platform_primitive_gap}`,
    '',
    '## Top connector brands',
    '',
    '| Connector Brand | Tasks | Blocker tasks | Playbooks | Packs | Elastic match | Connector id |',
    '| --- | ---: | ---: | ---: | ---: | --- | --- |',
    ...top.map(
      (r) =>
        `| ${r.connector_brand} | ${r.tasks} | ${r.blocker_tasks} | ${r.distinct_playbooks} | ${r.distinct_packs} | ${r.elastic_match} | ${r.elastic_connector_id ?? ''} |`
    ),
    '',
    '## Brands with no Elastic connector (backlog candidates)',
    '',
    ...missing.map((r) => `- ${r.connector_brand} (${r.tasks} tasks, ${r.distinct_playbooks} playbooks)`),
    '',
    '## Unmapped brandless commands',
    '',
    ...[...unmapped.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([k, n]) => `- ${k} (${n})`),
    '',
  ].join('\n');
  writeText(path.join(corpusDirs.analysis, `${p}presentation_metrics.md`), md);

  const ndjson = events.map((e) => JSON.stringify(e)).join('\n');
  writeText(
    path.join(corpusDirs.telemetry, p ? `${p}gap_events.ndjson` : 'gap_events.ndjson'),
    events.length ? `${ndjson}\n` : ''
  );
  writeJson(path.join(corpusDirs.analysis, `${p}connector_frequency.json`), frequency);

  return { frequency, events };
}
