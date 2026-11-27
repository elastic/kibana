import path from 'node:path';
import { writeJson } from './json.ts';
import { corpusDirs } from './paths.ts';
import type { InventoryFile, InventoryPlaybook, PlaybookIR } from './types.ts';

function toInventoryPlaybook(ir: PlaybookIR): InventoryPlaybook {
  return {
    pack: ir.pack,
    pack_name: ir.packName,
    file: ir.file,
    id: ir.id,
    name: ir.name,
    description: ir.description,
    fromversion: ir.fromversion,
    system: ir.system,
    deprecated: ir.deprecated,
    inbound_trigger: ir.inboundTrigger,
    inputs: ir.inputs,
    outputs: ir.outputs,
    nested_playbooks: ir.nestedPlaybooks,
    connectors: ir.connectors.map((c) => ({
      brand: c.brand,
      brand_raw: c.brandRaw,
      commands: c.commands,
      task_count: c.taskCount,
      is_optional: c.isOptional,
      elastic_match: c.elasticMatch,
      elastic_connector_id: c.elasticConnectorId,
    })),
    step_counts: ir.stepCounts,
    has_parallel_fanout: ir.hasParallelFanout,
    has_human_approval: ir.hasHumanApproval,
    has_ml: ir.hasMl,
    is_blocked: ir.isBlocked,
    blocker_gap_count: ir.blockerGapCount,
    non_blocker_gap_count: ir.nonBlockerGapCount,
    approvals: ir.approvals.map((a) => ({
      task_name: a.taskName,
      approval_type: a.approvalType,
      is_critical: a.isCritical,
    })),
    steps: ir.tasks
      .filter((t) => t.type !== 'start')
      .map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        description: t.description,
        connector_brand: t.connectorBrand,
        brand_raw: t.brandRawResolved,
        command: t.command,
        script_name: t.scriptName,
        nested_playbook: t.playbookName,
        skipunavailable: t.skipunavailable,
        is_optional: t.isOptional || t.skipunavailable,
        is_critical: t.isCritical,
        is_blocker: t.isBlocker,
        gap_bucket: t.gapBucket,
        approval_type: t.approvalType,
        next: t.next.flatMap((h) => h.destIds),
      })),
  };
}

export function buildInventoryFile(sourceRoot: string, playbooks: PlaybookIR[]): InventoryFile {
  const triggers = { alert: 0, manual: 0, scheduled: 0, http_webhook: 0 };
  const brands = new Set<string>();
  const packs = new Set<string>();
  for (const ir of playbooks) {
    triggers[ir.inboundTrigger] += 1;
    packs.add(ir.pack);
    for (const c of ir.connectors) {
      if (!c.brand.startsWith('Unmapped command:')) {
        brands.add(c.brand);
      }
    }
  }
  return {
    generated_at: new Date().toISOString(),
    source_root: sourceRoot,
    filters: { deprecated: false, excluded_packs: ['DeprecatedContent'] },
    summary: {
      playbooks: playbooks.length,
      packs: packs.size,
      connector_brands: brands.size,
      triggers,
    },
    playbooks: playbooks.map(toInventoryPlaybook),
  };
}

export function writeInventory(sourceRoot: string, playbooks: PlaybookIR[]): InventoryFile {
  const inventory = buildInventoryFile(sourceRoot, playbooks);
  writeJson(path.join(corpusDirs.inventory, 'playbooks.json'), inventory);
  const summary = {
    ...inventory,
    playbooks: inventory.playbooks.map(({ steps: _steps, ...rest }) => rest),
  };
  writeJson(path.join(corpusDirs.inventory, 'playbooks_summary.json'), summary);
  return inventory;
}
