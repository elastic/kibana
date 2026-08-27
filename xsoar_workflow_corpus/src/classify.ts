import { elasticForBrand, extractBrand, isCommonScript, splitScript } from './brands.ts';
import { criticalTaskIds } from './parse.ts';
import type {
  AnnotatedTask,
  ApprovalRecord,
  ApprovalType,
  ConnectorUsage,
  ElasticStability,
  GapBucket,
  PlaybookIR,
  PlaybookTask,
} from './types.ts';

const MAPPING_DEBT_COMMANDS = new Set(
  [
    'setIncident',
    'closeInvestigation',
    'createNewIncident',
    'linkIncidents',
    'setIndicator',
    'extractIndicators',
  ].map((s) => s.toLowerCase())
);

const MAPPING_DEBT_SCRIPTS = new Set(
  [
    'AssignAnalystToIncident',
    'SearchIncidentsV2',
    'GetIncidentsByQuery',
    'AddEvidence',
  ].map((s) => s.toLowerCase())
);

const NATIVE_SCRIPTS: Record<string, { type: string; stability: ElasticStability }> = {
  set: { type: 'data.set', stability: 'ga' },
  setandhandleempty: { type: 'data.set', stability: 'ga' },
  sleep: { type: 'wait', stability: 'ga' },
  http: { type: 'http', stability: 'ga' },
  isintegrationavailable: { type: 'if', stability: 'ga' },
  exists: { type: 'if', stability: 'ga' },
  print: { type: 'console', stability: 'ga' },
  printerrorentry: { type: 'console', stability: 'ga' },
};

const HITL_NAME =
  /\b(manual(?:ly)?|approv|review the incident|pause to|wait for (?:analyst|user|human)|human in the loop|take manual)\b/i;

const ANALYST_JUDGMENT = /\b(malicious or benign|is the email malicious|review the incident|analyst)\b/i;

const ELASTIC_NATIVE_HITL = /\b(close|assign|tag|severity)\b/i;

function isMl(task: PlaybookTask): boolean {
  const blob = `${task.scriptName ?? ''} ${task.name} ${task.script ?? ''}`;
  return /DBotPredict|DBotPreProcess|\bML\b|machine learning/i.test(blob);
}

function isGridOrContext(task: PlaybookTask): boolean {
  const name = task.scriptName ?? '';
  return /SetGridField|GridFieldSetup|DeleteContext|ChangeContext/i.test(name);
}

function approvalFor(task: PlaybookTask, hasVendor: boolean): ApprovalType {
  const blob = `${task.name} ${task.description}`;
  if (task.type === 'title' || task.type === 'start') {
    return null;
  }
  if (!HITL_NAME.test(blob) && task.scriptName !== 'AssignAnalystToIncident') {
    return null;
  }
  if (task.scriptName === 'AssignAnalystToIncident' || ELASTIC_NATIVE_HITL.test(blob)) {
    return 'elastic_native';
  }
  if (hasVendor && !ANALYST_JUDGMENT.test(blob)) {
    return 'vendor_dependent';
  }
  return 'analyst_judgment';
}

function classifyTask(
  task: PlaybookTask,
  brand: string | null,
  command: string | null,
  elasticMatch: ReturnType<typeof elasticForBrand>['match']
): { bucket: GapBucket; kibanaStepType: string | null; stability: ElasticStability } {
  if (task.type === 'start' || task.type === 'title') {
    return { bucket: null, kibanaStepType: null, stability: null };
  }

  if (task.type === 'condition') {
    return { bucket: null, kibanaStepType: 'if', stability: 'ga' };
  }

  if (task.type === 'collection') {
    return { bucket: null, kibanaStepType: 'foreach', stability: 'ga' };
  }

  if (task.type === 'playbook') {
    const pb = task.playbookName ?? '';
    if (/genericpolling/i.test(pb)) {
      return { bucket: null, kibanaStepType: 'while', stability: 'ga' };
    }
    if (brand && elasticMatch === 'none') {
      return { bucket: 'connector_gap', kibanaStepType: 'console', stability: null };
    }
    return { bucket: null, kibanaStepType: 'workflow.execute', stability: 'tech_preview' };
  }

  if (isMl(task)) {
    return { bucket: 'platform_primitive_gap', kibanaStepType: 'console', stability: null };
  }
  if (task.hasTimerTriggers) {
    return { bucket: 'platform_primitive_gap', kibanaStepType: 'console', stability: null };
  }
  if (isGridOrContext(task)) {
    return { bucket: 'platform_primitive_gap', kibanaStepType: 'console', stability: null };
  }

  const scriptKey = (task.scriptName ?? '').toLowerCase();
  if (NATIVE_SCRIPTS[scriptKey]) {
    const native = NATIVE_SCRIPTS[scriptKey];
    return { bucket: null, kibanaStepType: native.type, stability: native.stability };
  }

  const cmd = (command ?? splitScript(task.script).command ?? '').toLowerCase();
  if (MAPPING_DEBT_COMMANDS.has(cmd) || MAPPING_DEBT_SCRIPTS.has(scriptKey)) {
    return { bucket: 'mapping_debt', kibanaStepType: 'kibana.request', stability: 'ga' };
  }
  if (brand === 'Email' || cmd === 'send-mail') {
    return { bucket: 'mapping_debt', kibanaStepType: 'console', stability: null };
  }

  if (HITL_NAME.test(`${task.name} ${task.description}`) && !task.isCommand) {
    return { bucket: null, kibanaStepType: 'waitForApproval', stability: 'tech_preview' };
  }

  if (brand) {
    if (elasticMatch === 'none' || brand.startsWith('Unmapped command:')) {
      if (brand === 'Email' || cmd === 'send-mail') {
        return { bucket: 'mapping_debt', kibanaStepType: 'console', stability: null };
      }
      return { bucket: 'connector_gap', kibanaStepType: 'console', stability: null };
    }
    return { bucket: 'connector_gap', kibanaStepType: 'console', stability: null };
  }

  if (task.isCommand && cmd) {
    return { bucket: 'connector_gap', kibanaStepType: 'console', stability: null };
  }

  if (task.type === 'regular' && !task.script && !task.scriptName && HITL_NAME.test(task.name)) {
    return { bucket: null, kibanaStepType: 'waitForApproval', stability: 'tech_preview' };
  }

  if (task.type === 'regular' && !task.script && !task.scriptName) {
    return { bucket: null, kibanaStepType: 'console', stability: 'ga' };
  }

  return { bucket: null, kibanaStepType: 'console', stability: 'ga' };
}

export function annotatePlaybook(
  bare: {
    pack: string;
    packName: string;
    file: string;
    id: string;
    name: string;
    description: string;
    fromversion: string | null;
    system: boolean;
    deprecated: boolean;
    inboundTrigger: PlaybookIR['inboundTrigger'];
    startTaskId: string | null;
    inputs: PlaybookIR['inputs'];
    outputs: PlaybookIR['outputs'];
    tasks: PlaybookTask[];
  },
  packNames: string[]
): PlaybookIR {
  const critical = criticalTaskIds(bare.startTaskId, bare.tasks);
  const annotated: AnnotatedTask[] = bare.tasks.map((task) => {
    const hit = extractBrand({
      brandRaw: task.brandRaw,
      script: task.script,
      scriptName: task.scriptName,
      playbookName: task.playbookName,
      type: task.type,
      conditions: task.conditions,
      packNames,
    });
    const brand = hit?.brand ?? null;
    const command = hit?.command ?? splitScript(task.script).command;
    const elastic = elasticForBrand(brand);
    const classified = classifyTask(task, brand, command, elastic.match);
    const approval = approvalFor(task, Boolean(brand) && !brand?.startsWith('Unmapped'));
    const isCritical = critical.has(task.id) && !task.skipunavailable && !task.isOptional;
    return {
      ...task,
      connectorBrand: brand,
      brandRawResolved: hit?.brandRaw ?? task.brandRaw,
      command,
      isCritical,
      isBlocker: Boolean(classified.bucket) && isCritical,
      gapBucket: classified.bucket,
      approvalType: approval,
      elasticMatch: brand ? elastic.match : null,
      elasticConnectorId: brand ? elastic.connectorId : null,
      elasticStability: classified.stability,
      kibanaStepType: classified.kibanaStepType,
    };
  });

  const connectorMap = new Map<string, ConnectorUsage>();
  for (const task of annotated) {
    if (!task.connectorBrand || isCommonScript(task.scriptName)) {
      continue;
    }
    if (task.type === 'title' || task.type === 'start') {
      continue;
    }
    const existing = connectorMap.get(task.connectorBrand);
    const command = task.command;
    if (existing) {
      existing.taskCount += 1;
      existing.isOptional = existing.isOptional && (task.skipunavailable || task.isOptional);
      if (command && !existing.commands.includes(command)) {
        existing.commands.push(command);
      }
    } else {
      connectorMap.set(task.connectorBrand, {
        brand: task.connectorBrand,
        brandRaw: task.brandRawResolved ?? task.connectorBrand,
        commands: command ? [command] : [],
        taskCount: 1,
        isOptional: task.skipunavailable || task.isOptional,
        elasticMatch: task.elasticMatch ?? 'none',
        elasticConnectorId: task.elasticConnectorId,
      });
    }
  }

  const approvals: ApprovalRecord[] = annotated
    .filter((t) => t.approvalType)
    .map((t) => ({
      taskName: t.name,
      approvalType: t.approvalType as NonNullable<ApprovalType>,
      isCritical: t.isCritical,
    }));

  const stepCounts: Record<string, number> = {};
  for (const task of annotated) {
    stepCounts[task.type] = (stepCounts[task.type] ?? 0) + 1;
  }

  const nestedPlaybooks = [
    ...new Set(
      annotated.filter((t) => t.type === 'playbook' && t.playbookName).map((t) => t.playbookName as string)
    ),
  ];

  const hasParallelFanout = annotated.some((t) =>
    t.next.some((hop) => hop.label === '#none#' && hop.destIds.length > 1)
  );

  const blockerGapCount = annotated.filter((t) => t.isBlocker).length;
  const nonBlockerGapCount = annotated.filter((t) => t.gapBucket && !t.isBlocker).length;

  return {
    ...bare,
    tasks: annotated,
    connectors: [...connectorMap.values()].sort((a, b) => b.taskCount - a.taskCount),
    nestedPlaybooks,
    stepCounts,
    hasParallelFanout,
    hasHumanApproval: approvals.length > 0,
    hasMl: annotated.some(isMl),
    blockerGapCount,
    nonBlockerGapCount,
    isBlocked: blockerGapCount > 0,
    approvals,
  };
}
