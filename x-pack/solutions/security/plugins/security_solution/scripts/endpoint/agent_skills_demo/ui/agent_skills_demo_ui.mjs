/**
 * Agent Skills demo UI flow powered by Playwright.
 *
 * This is meant for demos (user-like behavior). It:
 * - logs into Kibana
 * - opens Fleet agent details for the enrolled demo VM (if provided)
 * - runs an Osquery live query (All agents) and waits for results
 * - opens Agent Builder and sends a prompt (best-effort; requires a configured connector)
 *
 * Required env:
 * - KIBANA_PASSWORD
 *
 * Optional env:
 * - KIBANA_URL: default http://localhost:5601
 * - KIBANA_USERNAME: default elastic
 * - KIBANA_SPACE_ID: optional (if using spaces; default space if unset)
 * - DEMO_AGENT_ID: optional; if set, goes directly to agent details
 * - DEMO_VM_NAME: optional; used only for display/logging
 * - SHOW: set to "1" to run headful
 */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

async function loadDotEnvFileIfPresent() {
  const dotenvPath = path.resolve(process.cwd(), '.env.local');
  if (!fs.existsSync(dotenvPath)) return;
  // eslint-disable-next-line import/no-extraneous-dependencies
  const dotenv = await import('dotenv');
  dotenv.config({ path: dotenvPath });
}

await loadDotEnvFileIfPresent();

const KIBANA_URL = process.env.KIBANA_URL ?? 'http://localhost:5601';
const KIBANA_USERNAME = process.env.KIBANA_USERNAME ?? 'elastic';
const KIBANA_PASSWORD = process.env.KIBANA_PASSWORD;
const KIBANA_SPACE_ID = process.env.KIBANA_SPACE_ID ?? '';
const DEMO_AGENT_ID = process.env.DEMO_AGENT_ID ?? '';
const DEMO_VM_NAME = process.env.DEMO_VM_NAME ?? '';

if (!KIBANA_PASSWORD) {
  throw new Error(
    [
      'Missing required env var: KIBANA_PASSWORD',
      '',
      'Set it securely, e.g.:',
      '  export KIBANA_USERNAME=elastic',
      '  read -s KIBANA_PASSWORD && export KIBANA_PASSWORD',
      `  node ${path.relative(process.cwd(), new URL(import.meta.url).pathname)}`,
      '  unset KIBANA_PASSWORD',
    ].join('\n')
  );
}

const headless = process.env.SHOW ? false : true;
const browser = await chromium.launch({ headless });
const context = await browser.newContext();
const page = await context.newPage();

const basePath = KIBANA_SPACE_ID ? `/s/${KIBANA_SPACE_ID}` : '';

async function closeToastsIfVisible() {
  const toastList = page.locator('[data-test-subj="globalToastList"]');
  if (await toastList.count()) {
    const closeButtons = toastList.locator('[data-test-subj="toastCloseButton"]');
    const count = await closeButtons.count();
    for (let i = 0; i < count; i++) {
      // eslint-disable-next-line no-await-in-loop
      await closeButtons.nth(i).click().catch(() => {});
    }
  }
}

async function waitForKibanaToSettle() {
  // Kibana often shows this loading screen on app navigation.
  const loading = page.getByText('Loading Elastic');
  if (await loading.count()) {
    await loading.first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  }
  await closeToastsIfVisible();
}

// Login
await page.goto(`${KIBANA_URL}/login?next=${encodeURIComponent(`${basePath}/app/fleet`)}`, {
  waitUntil: 'domcontentloaded',
});
await page.getByRole('textbox', { name: 'Username' }).fill(KIBANA_USERNAME);
await page.getByRole('textbox', { name: 'Password' }).fill(KIBANA_PASSWORD);
await page.getByRole('button', { name: 'Log in' }).click();

await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), null, { timeout: 60_000 });

// If Kibana shows the space selector, pick Default so we can enter the app.
const currentPathname = new URL(page.url()).pathname;
if (currentPathname === '/spaces/space_selector') {
  await page.getByRole('link', { name: 'Default' }).click();
  await page.waitForFunction(() => window.location.pathname !== '/spaces/space_selector', null, {
    timeout: 60_000,
  });
}

// Navigate to Fleet Agent details if available, otherwise to Fleet app.
if (DEMO_AGENT_ID) {
  const agentDetailsUrl = `${KIBANA_URL}${basePath}/app/fleet/agents/${encodeURIComponent(DEMO_AGENT_ID)}`;
  await page.goto(agentDetailsUrl, { waitUntil: 'domcontentloaded' });
} else {
  await page.goto(`${KIBANA_URL}${basePath}/app/fleet/agents`, { waitUntil: 'domcontentloaded' });
}

await waitForKibanaToSettle();

// Fleet verification (best-effort)
if (DEMO_AGENT_ID) {
  // Wait for at least one known element on agent details page.
  await page
    .locator('[data-test-subj="fleetAgentDetailsPage"]')
    .waitFor({ timeout: 60_000 })
    .catch(() => {});
}

// Osquery: run a live query (All agents)
{
  const osqueryHome = `${KIBANA_URL}${basePath}/app/osquery`;
  await page.goto(osqueryHome, { waitUntil: 'domcontentloaded' });
  await waitForKibanaToSettle();

  // Start a new live query
  await page.getByText('New live query').click({ timeout: 60_000 });
  await waitForKibanaToSettle();

  // Select "All agents" (simplest for demo reliability)
  await page
    .locator('[data-test-subj="agentSelection"] [data-test-subj="comboBoxInput"]')
    .click({ timeout: 60_000 });
  await page.locator('[title="All agents"]').click({ timeout: 60_000 });
  await page.keyboard.press('Escape').catch(() => {});

  // Type query into the code editor
  await page.locator('[data-test-subj="kibanaCodeEditor"]').click({ timeout: 60_000 });
  await page.keyboard.type('select * from uptime;');

  // Submit
  await page.locator('#submit-button').click({ timeout: 60_000 });

  // Wait for results
  await page.locator('[data-test-subj="osqueryResultsTable"]').waitFor({ timeout: 240_000 });
  await page.locator('[data-test-subj="dataGridRowCell"]').first().waitFor({ timeout: 240_000 });
}

// Agent Builder: send a prompt (best-effort)
{
  const agentBuilderUrl = `${KIBANA_URL}${basePath}/app/agent_builder`;
  await page.goto(agentBuilderUrl, { waitUntil: 'domcontentloaded' });
  await waitForKibanaToSettle();

  const input = page.locator('[data-test-subj="agentBuilderConversationInputEditor"]');
  await input.waitFor({ timeout: 60_000 });

  const isDisabled = (await input.getAttribute('aria-disabled')) === 'true';
  if (isDisabled) {
    // eslint-disable-next-line no-console
    console.log(
      'Agent Builder input is disabled (likely no connector configured / feature unavailable). Skipping prompt send.'
    );
  } else {
    const prompt = [
      `This is a demo environment.`,
      DEMO_VM_NAME ? `We enrolled a Fleet agent on VM "${DEMO_VM_NAME}".` : undefined,
      `1) Confirm the agent is online in Fleet.`,
      `2) Run an osquery live query to retrieve uptime (use: select * from uptime;).`,
      `3) Summarize the results for a user.`,
    ]
      .filter(Boolean)
      .join('\n');

    await input.click();
    await page.keyboard.type(prompt);

    await page.locator('[data-test-subj="agentBuilderConversationInputSubmitButton"]').click();

    // Wait for a response round to appear (doesn't assert content to avoid flakiness).
    await page.locator('[data-test-subj="agentBuilderRoundResponse"]').first().waitFor({ timeout: 180_000 });
  }
}

// Non-sensitive output
// eslint-disable-next-line no-console
console.log(
  [
    'Agent Skills demo UI is ready.',
    DEMO_VM_NAME ? `VM: ${DEMO_VM_NAME}` : undefined,
    DEMO_AGENT_ID ? `Fleet agent id: ${DEMO_AGENT_ID}` : undefined,
    `URL: ${page.url()}`,
  ]
    .filter(Boolean)
    .join('\n')
);

if (process.env.SHOW) {
  // eslint-disable-next-line no-console
  console.log('SHOW=1 is set; keeping the browser open. Press Ctrl+C to exit.');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, 1000));
  }
}

await browser.close();


