import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { EXCLUDED_PACKS, PACKS_ROOT } from './paths.ts';
import type { InboundTrigger, PlaybookInput, PlaybookIR, PlaybookOutput, PlaybookTask } from './types.ts';

export interface PackMeta {
  folder: string;
  name: string;
  dependencies: Array<{ id: string; displayName: string }>;
}

export interface DiscoveredPlaybook {
  pack: PackMeta;
  file: string;
  absPath: string;
  raw: Record<string, unknown>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
}

function hopLabel(key: unknown): string {
  if (key === true) {
    return 'yes';
  }
  if (key === false) {
    return 'no';
  }
  return String(key);
}

function hopDests(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (value === undefined || value === null) {
    return [];
  }
  return [String(value)];
}

export function loadPackMeta(packDir: string): PackMeta {
  const folder = path.basename(packDir);
  const metaPath = path.join(packDir, 'pack_metadata.json');
  try {
    const json = JSON.parse(readFileSync(metaPath, 'utf8')) as {
      name?: string;
      dependencies?: Record<string, { display_name?: string }>;
    };
    const dependencies = Object.entries(json.dependencies ?? {}).map(([id, dep]) => ({
      id,
      displayName: dep.display_name ?? id,
    }));
    return { folder, name: json.name ?? folder, dependencies };
  } catch {
    return { folder, name: folder, dependencies: [] };
  }
}

export function listPackDirs(root: string = PACKS_ROOT): string[] {
  return readdirSync(root)
    .map((name) => path.join(root, name))
    .filter((dir) => {
      try {
        return statSync(dir).isDirectory() && !EXCLUDED_PACKS.has(path.basename(dir));
      } catch {
        return false;
      }
    });
}

export function discoverPlaybooks(root: string = PACKS_ROOT): DiscoveredPlaybook[] {
  const discovered: DiscoveredPlaybook[] = [];
  for (const packDir of listPackDirs(root)) {
    const playbooksDir = path.join(packDir, 'Playbooks');
    let files: string[] = [];
    try {
      files = readdirSync(playbooksDir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
    } catch {
      continue;
    }
    const pack = loadPackMeta(packDir);
    for (const file of files) {
      const absPath = path.join(playbooksDir, file);
      let raw: unknown;
      try {
        raw = parseYaml(readFileSync(absPath, 'utf8'));
      } catch (error) {
        console.warn(`Skipping unreadable YAML ${absPath}: ${String(error)}`);
        continue;
      }
      if (!isRecord(raw)) {
        continue;
      }
      if (raw.deprecated === true) {
        continue;
      }
      discovered.push({
        pack,
        file: path.relative(root, absPath).split(path.sep).join('/'),
        absPath,
        raw,
      });
    }
  }
  return discovered;
}

export function parseTasks(raw: Record<string, unknown>): PlaybookTask[] {
  const tasksRaw = raw.tasks;
  if (!isRecord(tasksRaw)) {
    return [];
  }
  const tasks: PlaybookTask[] = [];
  for (const [id, value] of Object.entries(tasksRaw)) {
    if (!isRecord(value)) {
      continue;
    }
    const inner = isRecord(value.task) ? value.task : {};
    const nextRaw = isRecord(value.nexttasks) ? value.nexttasks : {};
    const next = Object.entries(nextRaw).map(([label, dests]) => ({
      label: hopLabel(label),
      destIds: hopDests(dests),
    }));
    tasks.push({
      id: asString(value.id) ?? id,
      type: asString(value.type) ?? asString(inner.type) ?? 'regular',
      name: asString(inner.name) ?? '',
      description: asString(inner.description) ?? '',
      script: asString(inner.script),
      brandRaw: asString(inner.brand),
      scriptName: asString(inner.scriptName),
      playbookName: asString(inner.playbookName) ?? (asString(value.type) === 'playbook' ? asString(inner.name) : null),
      isCommand: inner.iscommand === true,
      skipunavailable: value.skipunavailable === true,
      isOptional: value.isOptional === true || inner.isOptional === true,
      hasTimerTriggers: Array.isArray(value.timertriggers) && value.timertriggers.length > 0,
      next,
      conditions: value.conditions ?? null,
    });
  }
  return tasks;
}

export function inferTrigger(raw: Record<string, unknown>): InboundTrigger {
  const name = `${asString(raw.name) ?? ''} ${asString(raw.id) ?? ''}`.toLowerCase();
  if (name.includes('webhook') || name.includes('http listener')) {
    return 'http_webhook';
  }
  if (name.includes('scheduled') || name.includes('periodic') || name.includes('timer job')) {
    return 'scheduled';
  }
  if (raw.system === true) {
    return 'alert';
  }
  return 'manual';
}

export function parseInputs(raw: Record<string, unknown>): PlaybookInput[] {
  const inputs = raw.inputs;
  if (!Array.isArray(inputs)) {
    return [];
  }
  return inputs.filter(isRecord).map((item) => ({
    key: asString(item.key) ?? '',
    required: item.required === true,
    description: asString(item.description) ?? '',
  }));
}

export function parseOutputs(raw: Record<string, unknown>): PlaybookOutput[] {
  const outputs = raw.outputs;
  if (!Array.isArray(outputs)) {
    return [];
  }
  return outputs.filter(isRecord).map((item) => ({
    contextPath: asString(item.contextPath) ?? '',
    description: asString(item.description) ?? '',
  }));
}

const HAPPY_LABELS = new Set(['#none#', 'yes', 'malicious', 'true', 'success']);

export function criticalTaskIds(startTaskId: string | null, tasks: PlaybookTask[]): Set<string> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const critical = new Set<string>();
  if (!startTaskId) {
    return critical;
  }
  const queue = [startTaskId];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const task = byId.get(id);
    if (!task) {
      continue;
    }
    if (!task.skipunavailable && !task.isOptional) {
      critical.add(id);
    }
    const happy = task.next.filter((hop) => HAPPY_LABELS.has(hop.label.toLowerCase()));
    const hops = happy.length > 0 ? happy : task.next.filter((hop) => hop.label !== '#default#');
    const follow = hops.length > 0 ? hops : task.next;
    for (const hop of follow) {
      queue.push(...hop.destIds);
    }
  }
  return critical;
}

export function buildPlaybookIndex(discovered: DiscoveredPlaybook[]): Map<string, DiscoveredPlaybook> {
  const index = new Map<string, DiscoveredPlaybook>();
  for (const item of discovered) {
    const id = asString(item.raw.id);
    const name = asString(item.raw.name);
    if (id) {
      index.set(id.toLowerCase(), item);
    }
    if (name) {
      index.set(name.toLowerCase(), item);
    }
  }
  return index;
}

export function collectNestedPlaybooks(
  seed: DiscoveredPlaybook,
  index: Map<string, DiscoveredPlaybook>,
  maxDepth = 8
): DiscoveredPlaybook[] {
  const result: DiscoveredPlaybook[] = [];
  const seen = new Set<string>();
  const walk = (current: DiscoveredPlaybook, depth: number): void => {
    const key = current.absPath;
    if (seen.has(key) || depth > maxDepth) {
      return;
    }
    seen.add(key);
    result.push(current);
    const tasks = parseTasks(current.raw);
    for (const task of tasks) {
      if (task.type !== 'playbook' || !task.playbookName) {
        continue;
      }
      const nested = index.get(task.playbookName.toLowerCase());
      if (nested) {
        walk(nested, depth + 1);
      }
    }
  };
  walk(seed, 0);
  return result;
}

export function toBareIr(item: DiscoveredPlaybook): Omit<PlaybookIR, 'tasks' | 'connectors' | 'approvals' | 'hasHumanApproval' | 'hasMl' | 'nestedPlaybooks' | 'stepCounts' | 'hasParallelFanout'> & {
  tasks: PlaybookTask[];
} {
  const tasks = parseTasks(item.raw);
  return {
    pack: item.pack.folder,
    packName: item.pack.name,
    file: item.file,
    id: asString(item.raw.id) ?? path.basename(item.file, path.extname(item.file)),
    name: asString(item.raw.name) ?? asString(item.raw.id) ?? item.file,
    description: asString(item.raw.description) ?? '',
    fromversion: asString(item.raw.fromversion),
    system: item.raw.system === true,
    deprecated: item.raw.deprecated === true,
    inboundTrigger: inferTrigger(item.raw),
    startTaskId: asString(item.raw.starttaskid),
    inputs: parseInputs(item.raw),
    outputs: parseOutputs(item.raw),
    tasks,
  };
}
