import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse as parseYaml } from 'yaml';
import { gapEvents } from '../analysis.ts';
import { extractBrand, normalizeBrand, splitScript } from '../brands.ts';
import { annotatePlaybook } from '../classify.ts';
import { criticalTaskIds, parseTasks, toBareIr } from '../parse.ts';
import { irToWorkflowYaml } from '../yaml_from_ir.ts';

const dir = path.dirname(fileURLToPath(import.meta.url));

function load(name: string): Record<string, unknown> {
  return parseYaml(readFileSync(path.join(dir, 'fixtures', name), 'utf8')) as Record<string, unknown>;
}

test('normalizeBrand strips version suffixes', () => {
  assert.equal(normalizeBrand('VirusTotal (API v3)'), 'VirusTotal');
  assert.equal(normalizeBrand('EWS v2'), 'EWS');
  assert.equal(normalizeBrand('CrowdStrike Falcon Sandbox v2'), 'CrowdStrike Falcon Sandbox');
});

test('splitScript handles Brand|||command and brandless commands', () => {
  assert.deepEqual(splitScript('VirusTotal (API v3)|||file'), {
    brand: 'VirusTotal (API v3)',
    command: 'file',
  });
  assert.deepEqual(splitScript('|||send-mail'), { brand: null, command: 'send-mail' });
});

test('extractBrand prefers task.brand then script prefix then playbook name then command map', () => {
  const packs = ['VirusTotal', 'CrowdStrike Falcon', 'Microsoft Graph Mail'];
  const vt = extractBrand({
    brandRaw: 'VirusTotal (API v3)',
    script: 'VirusTotal (API v3)|||file',
    scriptName: null,
    playbookName: null,
    type: 'regular',
    conditions: null,
    packNames: packs,
  });
  assert.equal(vt?.brand, 'VirusTotal');

  const mail = extractBrand({
    brandRaw: null,
    script: '|||send-mail',
    scriptName: null,
    playbookName: null,
    type: 'regular',
    conditions: null,
    packNames: packs,
  });
  assert.equal(mail?.brand, 'Email');

  const nested = extractBrand({
    brandRaw: null,
    script: null,
    scriptName: null,
    playbookName: 'Detonate File - CrowdStrike Falcon Sandbox v2',
    type: 'playbook',
    conditions: null,
    packNames: packs,
  });
  assert.equal(nested?.brand, 'CrowdStrike Falcon');

  const builtin = extractBrand({
    brandRaw: 'Builtin',
    script: 'Builtin|||setIncident',
    scriptName: null,
    playbookName: null,
    type: 'regular',
    conditions: null,
    packNames: packs,
  });
  assert.equal(builtin, null);
});

test('fixture parent graph marks skipunavailable nested playbook as not critical', () => {
  const raw = load('parent.yml');
  const tasks = parseTasks(raw);
  const critical = criticalTaskIds('0', tasks);
  assert.equal(critical.has('1'), true);
  assert.equal(critical.has('3'), false);
  assert.equal(critical.has('5'), true);
});

test('annotatePlaybook classifies gaps, brands, HITL, and mapping debt', () => {
  const raw = load('parent.yml');
  const ir = annotatePlaybook(
    toBareIr({
      pack: { folder: 'Phishing', name: 'Phishing', dependencies: [] },
      file: 'Phishing/Playbooks/parent.yml',
      absPath: '/tmp/parent.yml',
      raw,
    }),
    ['VirusTotal', 'CrowdStrike Falcon']
  );
  assert.equal(ir.inboundTrigger, 'alert');
  assert.equal(ir.deprecated, false);
  assert.equal(ir.hasParallelFanout, true);
  assert.equal(ir.hasHumanApproval, true);

  const enrich = ir.tasks.find((t) => t.name === 'Enrich hash');
  assert.equal(enrich?.connectorBrand, 'VirusTotal');
  assert.equal(enrich?.gapBucket, 'connector_gap');
  assert.equal(enrich?.elasticMatch, 'connector_spec');
  assert.equal(enrich?.isCritical, true);
  assert.equal(enrich?.isBlocker, true);

  const mail = ir.tasks.find((t) => t.name === 'Acknowledge');
  assert.equal(mail?.connectorBrand, 'Email');
  assert.equal(mail?.gapBucket, 'mapping_debt');
  assert.equal(mail?.isBlocker, true);

  const nested = ir.tasks.find((t) => t.type === 'playbook');
  assert.equal(nested?.connectorBrand, 'CrowdStrike Falcon');
  assert.equal(nested?.skipunavailable, true);
  assert.equal(nested?.isCritical, false);
  assert.equal(nested?.isBlocker, false);

  const setIncident = ir.tasks.find((t) => t.command === 'setIncident' || t.script?.includes('setIncident'));
  assert.equal(setIncident?.gapBucket, 'mapping_debt');
  assert.equal(setIncident?.connectorBrand, null);
  assert.equal(setIncident?.isBlocker, true);

  assert.equal(ir.isBlocked, true);
  assert.ok((ir.blockerGapCount ?? 0) >= 3);

  const review = ir.tasks.find((t) => t.name.startsWith('Manually review'));
  assert.equal(review?.approvalType, 'analyst_judgment');
  assert.equal(review?.kibanaStepType, 'waitForApproval');

  const yaml = irToWorkflowYaml(ir);
  assert.match(yaml, /name: Fixture Phishing Parent/);
  assert.match(yaml, /enabled: false/);
  assert.match(yaml, /type: alert/);
  assert.match(yaml, /GAP connector_gap brand=VirusTotal/);
  assert.match(yaml, /blocker=true/);
  assert.match(yaml, /type: waitForApproval/);

  const events = gapEvents([ir]);
  const enrichEvent = events.find((e) => e.xsoar.task === 'Enrich hash');
  assert.equal(enrichEvent?.xsoar.gap.is_blocker, true);
  const setIncidentEvent = events.find((e) => e.xsoar.command === 'setIncident');
  assert.equal(setIncidentEvent?.xsoar.gap.is_blocker, true);
  assert.equal(
    events.some((e) => e.connector.brand === 'CrowdStrike Falcon'),
    false,
    'skipunavailable CrowdStrike nested playbook is not a gap (stack connector + workflow.execute)'
  );
});
