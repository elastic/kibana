import path from 'node:path';
import { stringify } from 'yaml';
import { writeText } from './json.ts';
import { corpusDirs } from './paths.ts';
import type { AnnotatedTask, PlaybookIR } from './types.ts';

function slug(name: string, id: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return `${base || 'step'}_${id}`.replace(/_+/g, '_');
}

function uniqueNames(tasks: AnnotatedTask[]): Map<string, string> {
  const used = new Set<string>();
  const map = new Map<string, string>();
  for (const task of tasks) {
    let name = slug(task.name, task.id);
    let i = 2;
    while (used.has(name)) {
      name = `${slug(task.name, task.id)}_${i}`;
      i += 1;
    }
    used.add(name);
    map.set(task.id, name);
  }
  return map;
}

function triggerYaml(ir: PlaybookIR): unknown[] {
  if (ir.inboundTrigger === 'alert') {
    return [{ type: 'alert' }];
  }
  if (ir.inboundTrigger === 'scheduled') {
    return [{ type: 'scheduled', with: { every: '1h' } }];
  }
  const properties: Record<string, { type: string; description?: string }> = {};
  for (const input of ir.inputs.slice(0, 12)) {
    if (!input.key) {
      continue;
    }
    properties[input.key] = { type: 'string', description: input.description || undefined };
  }
  return [
    {
      type: 'manual',
      ...(Object.keys(properties).length > 0 ? { inputs: { properties } } : {}),
    },
  ];
}

function stepFor(task: AnnotatedTask, names: Map<string, string>): Record<string, unknown> | null {
  if (task.type === 'start' || task.type === 'title') {
    return null;
  }
  const name = names.get(task.id) ?? slug(task.name, task.id);
  const type = task.kibanaStepType ?? 'console';

  if (task.gapBucket) {
    return {
      name,
      type: 'console',
      with: {
        message: `GAP ${task.gapBucket} brand=${task.connectorBrand ?? ''} command=${task.command ?? ''} critical=${task.isCritical} optional=${task.skipunavailable} blocker=${task.isBlocker}`,
      },
    };
  }

  if (type === 'if') {
    return {
      name,
      type: 'if',
      condition: `${task.name.replaceAll('"', "'")}: *`,
      steps: [
        {
          name: `${name}_yes`,
          type: 'console',
          with: { message: `Condition matched: ${task.name}` },
        },
      ],
    };
  }

  if (type === 'foreach') {
    return {
      name,
      type: 'foreach',
      foreach: '${{ inputs.items | default: [] }}',
      steps: [
        {
          name: `${name}_item`,
          type: 'console',
          with: { message: 'Processing {{ foreach.item }}' },
        },
      ],
    };
  }

  if (type === 'while') {
    return {
      name,
      type: 'while',
      'max-iterations': 10,
      condition: 'steps.poll_check.output.pending : true',
      steps: [
        {
          name: 'poll_check',
          type: 'console',
          with: { message: `Poll until complete: ${task.playbookName ?? task.name}` },
        },
      ],
    };
  }

  if (type === 'wait') {
    return { name, type: 'wait', with: { duration: '30s' } };
  }

  if (type === 'data.set') {
    return {
      name,
      type: 'data.set',
      with: { [`${name}_value`]: `{{ inputs.${task.name.replace(/\s+/g, '_')} | default: "" }}` },
    };
  }

  if (type === 'waitForApproval') {
    return {
      name,
      type: 'waitForApproval',
      timeout: '24h',
      with: {
        message: task.name || 'Approve to continue',
        approveLabel: 'Approve',
        rejectLabel: 'Decline',
      },
    };
  }

  if (type === 'workflow.execute') {
    return {
      name,
      type: 'workflow.execute',
      with: {
        'workflow-id': 'TODO_WORKFLOW_ID',
        inputs: { playbook: task.playbookName ?? task.name },
      },
    };
  }

  if (type === 'http') {
    return {
      name,
      type: 'http',
      with: {
        url: 'https://example.invalid/todo',
        method: 'GET',
      },
    };
  }

  if (type === 'kibana.request') {
    return {
      name,
      type: 'kibana.request',
      with: {
        method: 'POST',
        path: '/api/cases',
        body: `TODO mapping_debt ${task.command ?? task.scriptName ?? task.name}`,
      },
    };
  }

  return {
    name,
    type: 'console',
    with: { message: task.name || task.description || 'step' },
  };
}

export function irToWorkflowYaml(ir: PlaybookIR): string {
  const names = uniqueNames(ir.tasks);
  const steps = ir.tasks.map((t) => stepFor(t, names)).filter((s): s is Record<string, unknown> => Boolean(s));

  const doc = {
    version: '1',
    name: ir.name,
    description: ir.description || `Converted from XSOAR playbook ${ir.id}`,
    enabled: false,
    tags: ['xsoar', 'converted', ir.pack.toLowerCase()],
    triggers: triggerYaml(ir),
    steps: steps.length > 0 ? steps : [{ name: 'noop', type: 'console', with: { message: 'Empty playbook' } }],
  };
  return stringify(doc, { indent: 2, lineWidth: 0 });
}

export function writeWorkflowYaml(ir: PlaybookIR): string {
  const fileName = `${ir.pack}_${path.basename(ir.file, path.extname(ir.file))}`.replace(
    /[^A-Za-z0-9._-]+/g,
    '_'
  ) + '.yml';
  const dest = path.join(corpusDirs.yaml, fileName);
  writeText(dest, irToWorkflowYaml(ir));
  return dest;
}
