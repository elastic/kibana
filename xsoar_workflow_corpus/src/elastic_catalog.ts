import type { ElasticJoin, ElasticMatch } from './types.ts';

interface CatalogEntry {
  id: string;
  names: string[];
  match: Exclude<ElasticMatch, 'none'>;
}

const STACK: CatalogEntry[] = [
  { id: '.crowdstrike', names: ['CrowdStrike', 'CrowdStrike Falcon'], match: 'stack_connector' },
  { id: '.sentinelone', names: ['SentinelOne', 'Sentinel One'], match: 'stack_connector' },
  {
    id: '.microsoft_defender_endpoint',
    names: ['Microsoft Defender for Endpoint', 'Microsoft Defender Endpoint'],
    match: 'stack_connector',
  },
  { id: '.jira', names: ['Jira'], match: 'stack_connector' },
  {
    id: '.jira-service-management',
    names: ['Jira Service Management'],
    match: 'stack_connector',
  },
  { id: '.email', names: ['Email'], match: 'stack_connector' },
  { id: '.slack', names: ['Slack'], match: 'stack_connector' },
  { id: '.slack_api', names: ['Slack API'], match: 'stack_connector' },
  { id: '.teams', names: ['Microsoft Teams', 'Teams'], match: 'stack_connector' },
  { id: '.servicenow', names: ['ServiceNow'], match: 'stack_connector' },
  { id: '.pagerduty', names: ['PagerDuty'], match: 'stack_connector' },
  { id: '.opsgenie', names: ['Opsgenie'], match: 'stack_connector' },
  { id: '.thehive', names: ['TheHive'], match: 'stack_connector' },
  { id: '.tines', names: ['Tines'], match: 'stack_connector' },
  { id: '.xsoar', names: ['XSOAR', 'Cortex XSOAR', 'Demisto'], match: 'stack_connector' },
  { id: '.resilient', names: ['IBM Resilient', 'Resilient'], match: 'stack_connector' },
  { id: '.swimlane', names: ['Swimlane'], match: 'stack_connector' },
  { id: '.webhook', names: ['Webhook'], match: 'stack_connector' },
  { id: '.torq', names: ['Torq'], match: 'stack_connector' },
  { id: '.d3security', names: ['D3 Security'], match: 'stack_connector' },
  { id: '.xmatters', names: ['xMatters'], match: 'stack_connector' },
  { id: '.bedrock', names: ['Bedrock', 'Amazon Bedrock'], match: 'stack_connector' },
  { id: '.gemini', names: ['Gemini', 'Google Gemini'], match: 'stack_connector' },
  { id: '.gen-ai', names: ['OpenAI'], match: 'stack_connector' },
  { id: '.inference', names: ['Inference', 'Elastic Inference'], match: 'stack_connector' },
];

const SPECS: CatalogEntry[] = [
  { id: '.virustotal', names: ['VirusTotal'], match: 'connector_spec' },
  { id: '.gmail', names: ['Gmail'], match: 'connector_spec' },
  { id: '.abuseipdb', names: ['AbuseIPDB'], match: 'connector_spec' },
  { id: '.alienvault_otx', names: ['AlienVault OTX'], match: 'connector_spec' },
  { id: '.jira', names: ['Jira Cloud'], match: 'connector_spec' },
  { id: '.confluence_cloud', names: ['Confluence Cloud', 'Confluence'], match: 'connector_spec' },
  { id: '.aws_lambda', names: ['AWS Lambda'], match: 'connector_spec' },
  { id: '.github', names: ['GitHub'], match: 'connector_spec' },
  { id: '.shodan', names: ['Shodan'], match: 'connector_spec' },
  { id: '.urlvoid', names: ['URLVoid'], match: 'connector_spec' },
  { id: '.urlscan_io', names: ['URLScan.io', 'urlscan'], match: 'connector_spec' },
  { id: '.greynoise', names: ['GreyNoise'], match: 'connector_spec' },
  { id: '.outlook', names: ['Outlook', 'Microsoft Outlook'], match: 'connector_spec' },
  { id: '.salesforce', names: ['Salesforce'], match: 'connector_spec' },
  { id: '.zendesk', names: ['Zendesk'], match: 'connector_spec' },
  { id: '.okta', names: ['Okta'], match: 'connector_spec' },
  { id: '.servicenow_search', names: ['ServiceNow'], match: 'connector_spec' },
  { id: '.microsoft_teams', names: ['Microsoft Teams'], match: 'connector_spec' },
  { id: '.slack', names: ['Slack'], match: 'connector_spec' },
  { id: '.sharepoint_online', names: ['SharePoint Online'], match: 'connector_spec' },
  { id: '.one_drive', names: ['OneDrive'], match: 'connector_spec' },
  { id: '.sublime_security', names: ['Sublime Security'], match: 'connector_spec' },
  { id: '.censys', names: ['Censys'], match: 'connector_spec' },
];

const ALL = [...STACK, ...SPECS];

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export function joinElastic(brand: string | null): ElasticJoin {
  if (!brand) {
    return { match: 'none', connectorId: null };
  }
  const needle = norm(brand);
  let best: { entry: CatalogEntry; score: number } | null = null;

  for (const entry of ALL) {
    for (const name of entry.names) {
      const hay = norm(name);
      let score = 0;
      if (needle === hay) {
        score = 100 + hay.length;
      } else if (hay.length >= 4 && (needle.startsWith(`${hay} `) || needle.startsWith(`${hay}-`))) {
        score = 50 + hay.length;
      } else if (needle.length >= 4 && (hay.startsWith(`${needle} `) || hay.startsWith(`${needle}-`))) {
        score = 40 + needle.length;
      }
      if (score > 0 && (!best || score > best.score)) {
        best = { entry, score };
      }
    }
  }

  if (!best) {
    return { match: 'none', connectorId: null };
  }
  return { match: best.entry.match, connectorId: best.entry.id };
}
