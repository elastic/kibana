import type { ElasticJoin } from './types.ts';
import { joinElastic } from './elastic_catalog.ts';

const COMMON_SCRIPTS = new Set(
  [
    'Set',
    'SetAndHandleEmpty',
    'DeleteContext',
    'Print',
    'PrintErrorEntry',
    'Exists',
    'Sleep',
    'http',
    'IsIntegrationAvailable',
    'AssignAnalystToIncident',
    'SearchIncidentsV2',
    'GetIncidentsByQuery',
    'SetGridField',
    'GridFieldSetup',
    'AddEvidence',
    'ParseHTMLIndicators',
    'IdentifyAttachedEmail',
    'CheckEmailAuthenticity',
    'ParseEmailFiles',
    'ParseEmailFilesV2',
    'UploadFile',
    'ReadQRCode',
    'ReadFile',
    'LoadJSON',
    'MatchRegexV2',
    'GetTime',
    'UnpackFile',
    'ExtractIndicatorsFromTextFile',
    'UnzipFile',
    'WhereFieldEquals',
    'FilterByList',
    'IsIPInRange',
    'IsEmailAddressInternal',
    'RepopulateFiles',
    'FileCreateAndUpload',
    'ChangeContext',
    'ContextGet',
    'isError',
    'ExportToCSV',
    'GridFieldSetup',
  ].map((s) => s.toLowerCase())
);

const GENERIC_PACK_NAMES = new Set(
  [
    'Hunting',
    'Campaign',
    'Core',
    'Filters And Transformers',
    'Common Playbooks',
    'Common Scripts',
    'Common Types',
    'Core Alert Fields',
    'Phishing Campaigns',
    'Phishing',
    'Asset',
    'DSPM',
  ].map((s) => s.toLowerCase())
);

const BUILTIN_IGNORE = new Set(['builtin', 'shared', 'common scripts', 'common playbooks', '']);

const NOT_CONNECTOR_COMMANDS = new Set(
  [
    'setIncident',
    'closeInvestigation',
    'createNewIncident',
    'linkIncidents',
    'setIndicator',
    'extractIndicators',
    'deleteContext',
  ].map((s) => s.toLowerCase())
);

const COMMAND_PREFIX_BRANDS: Array<{ prefix: string; brand: string }> = [
  { prefix: 'splunk-', brand: 'Splunk' },
  { prefix: 'pan-os', brand: 'PAN-OS' },
  { prefix: 'panos', brand: 'PAN-OS' },
  { prefix: 'panw-', brand: 'PAN-OS' },
  { prefix: 'pan-dlp', brand: 'PAN-OS DLP' },
  { prefix: 'ews-', brand: 'EWS' },
  { prefix: 'gmail-', brand: 'Gmail' },
  { prefix: 'send-mail', brand: 'Email' },
  { prefix: 'wildfire-', brand: 'WildFire' },
  { prefix: 'xdr-', brand: 'Cortex XDR' },
  { prefix: 'azure-log-analytics', brand: 'Azure Log Analytics' },
  { prefix: 'qradar-', brand: 'QRadar' },
  { prefix: 'servicenow-', brand: 'ServiceNow' },
  { prefix: 'ad-', brand: 'Active Directory' },
  { prefix: 'o365-', brand: 'Microsoft 365' },
  { prefix: 'msgraph-', brand: 'Microsoft Graph' },
  { prefix: 'microsoft-365', brand: 'Microsoft 365' },
  { prefix: 'anyrun-', brand: 'ANY.RUN' },
  { prefix: 'expanse-', brand: 'Expanse' },
  { prefix: 'rasterize', brand: 'Rasterize' },
  { prefix: 'jira-', brand: 'Jira' },
  { prefix: 'slack-', brand: 'Slack' },
  { prefix: 'zoom-', brand: 'Zoom' },
  { prefix: 'okta-', brand: 'Okta' },
  { prefix: 'crowdstrike-', brand: 'CrowdStrike Falcon' },
  { prefix: 'cs-falcon', brand: 'CrowdStrike Falcon' },
  { prefix: 'vt-', brand: 'VirusTotal' },
  { prefix: 'virustotal', brand: 'VirusTotal' },
  { prefix: 'urlscan-', brand: 'urlscan.io' },
  { prefix: 'mimecast-', brand: 'Mimecast' },
  { prefix: 'proofpoint-', brand: 'Proofpoint' },
  { prefix: 'zscaler-', brand: 'Zscaler' },
  { prefix: 'carbonblack-', brand: 'Carbon Black' },
  { prefix: 'sentinelone-', brand: 'SentinelOne' },
  { prefix: 'defender-', brand: 'Microsoft Defender' },
  { prefix: 'prisma-cloud', brand: 'Prisma Cloud' },
  { prefix: 'core-api', brand: 'Cortex XSOAR' },
];

const PLAYBOOK_NAME_PREFIXES = [
  /^detonate (?:file|url|private file) - /i,
  /^detonate file - /i,
  /^get original email - /i,
  /^get email from email gateway - /i,
  /^file enrichment - /i,
  /^url enrichment - /i,
  /^ip enrichment(?: - external)? - /i,
  /^domain enrichment - /i,
  /^email address enrichment - /i,
  /^block (?:ip|indicators?|url|domain|file|hash|account) - /i,
  /^search and delete emails - /i,
  /^extract indicators from file - /i,
];

export interface BrandHit {
  brand: string;
  brandRaw: string;
  command: string | null;
}

export function isCommonScript(scriptName: string | null): boolean {
  if (!scriptName) {
    return false;
  }
  return COMMON_SCRIPTS.has(scriptName.toLowerCase());
}

export function normalizeBrand(raw: string): string {
  let value = raw.trim();
  value = value.replace(/\s*\(API v\d+\)/gi, '');
  value = value.replace(/\s*\((?:Beta|Deprecated)\)/gi, '');
  value = value.replace(/\s+by Palo Alto Networks$/i, '');
  value = value.replace(/_v\d+$/i, '');
  value = value.replace(/\s+v\d+(?:\.\d+)*$/i, '');
  value = value.replace(/\s+V\d+$/i, '');
  value = value.replace(/V\d+$/i, '');
  value = value.replace(/\s+-\s+(Private API|Premium|IR|Public API)$/i, '');
  value = value.replace(/-+$/g, '');
  value = value.replace(/\s+/g, ' ').trim();

  const aliases: Record<string, string> = {
    ews: 'EWS',
    'ews v2': 'EWS',
    slackv3: 'Slack',
    slack: 'Slack',
    'servicenow v2': 'ServiceNow',
    servicenow: 'ServiceNow',
    'microsoft graph mail single user': 'Microsoft Graph Mail',
    'microsoft graph listener': 'Microsoft Graph Mail',
    'virus total': 'VirusTotal',
    'virustotal private api': 'VirusTotal',
    'active directory query': 'Active Directory',
    'palo alto networks wildfire': 'WildFire',
    'microsoft 365 defender': 'Microsoft 365 Defender',
    'office 365': 'Microsoft 365',
    panorama: 'PAN-OS',
    'check point firewall': 'Check Point',
    checkpointfirewall: 'Check Point',
    prismacloud: 'Prisma Cloud',
    qradar: 'QRadar',
    splunkpy: 'Splunk',
  };
  const aliased = aliases[value.toLowerCase()];
  return aliased ?? value;
}

export function splitScript(script: string | null): { brand: string | null; command: string | null } {
  if (!script) {
    return { brand: null, command: null };
  }
  if (script.includes('|||')) {
    const [brand, command] = script.split('|||', 2);
    return {
      brand: brand.trim() ? brand.trim() : null,
      command: command?.trim() ? command.trim() : null,
    };
  }
  return { brand: null, command: script.trim() || null };
}

export function brandFromCommand(command: string | null): string | null {
  if (!command) {
    return null;
  }
  const lower = command.toLowerCase();
  for (const { prefix, brand } of COMMAND_PREFIX_BRANDS) {
    if (lower.startsWith(prefix) || lower === prefix) {
      return brand;
    }
  }
  return null;
}

export function brandFromPlaybookName(playbookName: string | null, packNames: string[]): string | null {
  if (!playbookName) {
    return null;
  }
  if (/generic/i.test(playbookName) && !/- (?!Generic).+/i.test(playbookName)) {
    return null;
  }

  const fromPack = matchLongestPackName(playbookName, packNames);
  if (fromPack) {
    return fromPack;
  }

  for (const prefix of PLAYBOOK_NAME_PREFIXES) {
    if (prefix.test(playbookName)) {
      const rest = playbookName.replace(prefix, '').trim();
      if (!rest || /^generic/i.test(rest)) {
        return null;
      }
      return normalizeBrand(rest);
    }
  }

  const dash = playbookName.split(' - ')[0]?.trim();
  if (dash && packNames.some((n) => n.toLowerCase() === dash.toLowerCase())) {
    return normalizeBrand(dash);
  }
  return null;
}

export function matchLongestPackName(text: string, packNames: string[]): string | null {
  const hay = text.toLowerCase();
  let best: string | null = null;
  for (const name of packNames) {
    if (name.length < 4) {
      continue;
    }
    if (GENERIC_PACK_NAMES.has(name.toLowerCase())) {
      continue;
    }
    if (hay.includes(name.toLowerCase()) && (!best || name.length > best.length)) {
      best = name;
    }
  }
  return best ? normalizeBrand(best) : null;
}

function walkConditionsForBrand(node: unknown): string | null {
  if (!node || typeof node !== 'object') {
    return null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = walkConditionsForBrand(item);
      if (found) {
        return found;
      }
    }
    return null;
  }
  const record = node as Record<string, unknown>;
  const left = record.left as Record<string, unknown> | undefined;
  const right = record.right as Record<string, unknown> | undefined;
  const leftSimple = stringifyPath(left);
  if (leftSimple.includes('modules.brand') || leftSimple === 'brand') {
    const brand = simpleValue(right) ?? simpleValue(left);
    if (brand && !BUILTIN_IGNORE.has(brand.toLowerCase())) {
      return brand;
    }
  }
  const nestedRight = simpleValue(right);
  const nestedLeft = simpleValue(left);
  if (typeof record.operator === 'string' && /equal/i.test(record.operator)) {
    if (leftSimple.includes('brand') && nestedRight) {
      return nestedRight;
    }
    if (nestedLeft && String(simpleValue({ value: right }) ?? '').length === 0) {
      // continue
    }
  }
  for (const value of Object.values(record)) {
    const found = walkConditionsForBrand(value);
    if (found) {
      return found;
    }
  }
  return null;
}

function stringifyPath(node: unknown): string {
  if (!node || typeof node !== 'object') {
    return '';
  }
  const record = node as Record<string, unknown>;
  const value = record.value as Record<string, unknown> | undefined;
  if (value && typeof value.simple === 'string') {
    return value.simple;
  }
  if (value && value.complex && typeof value.complex === 'object') {
    const complex = value.complex as Record<string, unknown>;
    const root = typeof complex.root === 'string' ? complex.root : '';
    const accessor = typeof complex.accessor === 'string' ? complex.accessor : '';
    return [root, accessor].filter(Boolean).join('.');
  }
  if (typeof record.simple === 'string') {
    return record.simple;
  }
  return '';
}

function simpleValue(node: unknown): string | null {
  if (!node || typeof node !== 'object') {
    return null;
  }
  const record = node as Record<string, unknown>;
  const value = record.value as Record<string, unknown> | undefined;
  if (value && typeof value.simple === 'string' && value.simple.trim()) {
    return value.simple.trim();
  }
  if (typeof record.simple === 'string' && record.simple.trim()) {
    return record.simple.trim();
  }
  return null;
}

export function extractBrand(args: {
  brandRaw: string | null;
  script: string | null;
  scriptName: string | null;
  playbookName: string | null;
  type: string;
  conditions: unknown;
  packNames: string[];
}): BrandHit | null {
  const { brand, command } = splitScript(args.script);

  if (args.brandRaw && !BUILTIN_IGNORE.has(args.brandRaw.toLowerCase())) {
    return {
      brand: normalizeBrand(args.brandRaw),
      brandRaw: args.brandRaw,
      command,
    };
  }

  if (brand && !BUILTIN_IGNORE.has(brand.toLowerCase())) {
    return { brand: normalizeBrand(brand), brandRaw: brand, command };
  }

  if (args.type === 'condition') {
    const fromCond = walkConditionsForBrand(args.conditions);
    if (fromCond && !BUILTIN_IGNORE.has(fromCond.toLowerCase())) {
      return { brand: normalizeBrand(fromCond), brandRaw: fromCond, command: null };
    }
  }

  if (args.type === 'playbook') {
    const fromPb = brandFromPlaybookName(args.playbookName, args.packNames);
    if (fromPb) {
      return { brand: fromPb, brandRaw: args.playbookName ?? fromPb, command: null };
    }
  }

  if (command) {
    if (isCommonScript(command) || NOT_CONNECTOR_COMMANDS.has(command.toLowerCase())) {
      return null;
    }
    const fromCmd = brandFromCommand(command);
    if (fromCmd) {
      return { brand: fromCmd, brandRaw: command, command };
    }
    if (!brand) {
      return {
        brand: `Unmapped command: ${command}`,
        brandRaw: command,
        command,
      };
    }
  }

  if (args.scriptName && !isCommonScript(args.scriptName) && !args.scriptName.startsWith('DBot')) {
    const fromPack = matchLongestPackName(args.scriptName, args.packNames);
    if (fromPack) {
      return { brand: fromPack, brandRaw: args.scriptName, command: args.scriptName };
    }
  }

  return null;
}

export function elasticForBrand(brand: string | null): ElasticJoin {
  if (!brand || brand.startsWith('Unmapped command:')) {
    return { match: 'none', connectorId: null };
  }
  return joinElastic(brand);
}
