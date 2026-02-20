#!/usr/bin/env node
/*
 * One-time script to replace spaceTest.skip placeholders with minimal
 * "page loads" tests. Run from repo root.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../ui/parallel_tests');

/** Map path segments / filename hints to { route, testSubj }. */
function getRouteAndSubj(relativePath) {
  const p = relativePath.replace(/\.spec\.ts$/, '');
  if (p.includes('endpoint_list') || p.includes('endpoint_details') || p.includes('endpoint_alerts')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.endpoints', testSubj: 'endpointPage' };
  }
  if (p.includes('policy') && !p.includes('experimental')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.policies', testSubj: 'policyListPage' };
  }
  if (p.includes('trusted_apps') || p.includes('trusted_devices')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.trustedApps', testSubj: 'trustedAppsListPage' };
  }
  if (p.includes('event_filters')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.eventFilters', testSubj: 'EventFiltersListPage' };
  }
  if (p.includes('blocklist')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.blocklist', testSubj: 'blocklistPage' };
  }
  if (p.includes('host_isolation') || p.includes('host_isolation_exceptions')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.hostIsolationExceptions', testSubj: 'hostIsolationExceptionsListPage' };
  }
  if (p.includes('response_actions') || p.includes('responder') || p.includes('isolate') || p.includes('automated_response')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.responseActionsHistory', testSubj: 'responseActionsPage' };
  }
  if (p.includes('artifact') || p.includes('endpoint_exceptions')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.trustedApps', testSubj: 'trustedAppsListPage' };
  }
  if (p.includes('rbac') || p.includes('serverless') || p.includes('tamper_protection') || p.includes('sentinelone')) {
    return { route: 'DEFEND_WORKFLOWS_ROUTES.policies', testSubj: 'policyListPage' };
  }
  return { route: 'DEFEND_WORKFLOWS_ROUTES.policies', testSubj: 'policyListPage' };
}

function getFixturesRel(relativePath) {
  const dir = path.dirname(relativePath);
  const depth = dir === '.' ? 0 : dir.split(path.sep).length;
  return '../'.repeat(depth + 1) + 'fixtures';
}

function unskipFile(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('spaceTest.skip')) return false;

  const { route, testSubj } = getRouteAndSubj(relativePath);
  const fixturesRel = getFixturesRel(relativePath);

  const newTest = `spaceTest('loads page', async ({ page }) => {
      await page.goto(${route});
      await page.locator(testSubjSelector('globalLoadingIndicator-hidden')).waitFor({ state: 'visible' });
      await expect(page.locator(testSubjSelector('${testSubj}'))).toBeVisible();
    });`;

  content = content.replace(
    /spaceTest\.skip\('[^']*', async \(\) => \{\s*\/\/[^}]*\}\);/s,
    newTest
  );

  if (!content.includes("from '@kbn/test-subj-selector'") && !content.includes('from "../../fixtures"')) {
    content = content.replace(
      "import { spaceTest, tags } from '@kbn/scout-security';",
      "import { subj as testSubjSelector } from '@kbn/test-subj-selector';\nimport { spaceTest, tags } from '@kbn/scout-security';\nimport { expect } from '@kbn/scout-security/ui';\nimport { DEFEND_WORKFLOWS_ROUTES } from '" + fixturesRel + "';"
    );
  }

  fs.writeFileSync(filePath, content);
  return true;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (e.name.endsWith('.spec.ts') && !e.name.includes('example') && e.name !== 'policy_list.spec.ts') {
      if (unskipFile(full)) console.log('Unskipped:', path.relative(ROOT, full));
    }
  }
}

walk(ROOT);
console.log('Done.');
