/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { tmpdir } from 'os';
import { join } from 'path';
import { writeFile, unlink } from 'fs/promises';
import type { HostVm } from '../common/types';
import { prefixedOutputLogger } from '../common/utils';
import type { ProvisionedEndpoint, Rsa2026DemoConfig } from './types';

/**
 * Upload a text file to the VM (avoids fragile shell escaping/quoting)
 */
const uploadTextFileToVm = async (
  hostVm: HostVm,
  destPath: string,
  contents: string
): Promise<void> => {
  const localPath = join(
    tmpdir(),
    `rsa-2026-${Date.now()}-${Math.random().toString(16).slice(2)}.tmp`
  );
  await writeFile(localPath, contents, 'utf-8');
  try {
    await hostVm.upload(localPath, destPath);
  } finally {
    await unlink(localPath).catch(() => undefined);
  }
};

/**
 * Resolve the VM username for browser history file paths.
 * On GCP, the SSH user matches the Google account, so we detect it via whoami.
 * Multipass and Vagrant Ubuntu VMs use 'ubuntu' as the default user.
 */
const resolveVmUsername = async (hostVm: HostVm, configUsername: string): Promise<string> => {
  const whoamiResult = await hostVm.exec('whoami', { silent: true });
  const detectedUser = whoamiResult.stdout?.trim();
  if (detectedUser && detectedUser !== 'root') {
    return detectedUser;
  }
  if (!configUsername || configUsername === 'elastic') return 'ubuntu';
  return configUsername;
};

/**
 * Installs Chrome/Chromium browser on the VM
 */
const installChromiumOrChrome = async (hostVm: HostVm, log: ToolingLog): Promise<void> => {
  const logger = prefixedOutputLogger('installChrome()', log);

  logger.info('Installing Chrome/Chromium');

  // Check VM architecture
  const archResult = await hostVm.exec('uname -m', { silent: true });
  const vmArch = archResult.stdout?.trim() || 'x86_64';
  const isArm64 = vmArch === 'aarch64' || vmArch === 'arm64';

  logger.info(`VM architecture: ${vmArch}`);

  await hostVm.exec('sudo apt-get update', { silent: true });

  if (isArm64) {
    // For ARM64, Google doesn't provide Chrome, so we'll use Chromium instead
    // Chromium uses the same history database format as Chrome
    logger.info(
      'Installing Chromium for ARM64 architecture (Chrome not available for ARM64 Linux)'
    );
    await hostVm.exec('sudo apt-get update', { silent: true });
    await hostVm.exec('sudo apt-get install -y chromium-browser', { silent: true });
    logger.info('Chromium installed successfully (compatible with Chrome history format)');
  } else {
    // For x86_64, use the repository method
    logger.info('Installing Chrome for x86_64 architecture');
    // Use modern method without deprecated apt-key
    // Download the key and add it to trusted keys directory
    await hostVm.exec(
      'wget -q -O /tmp/google-chrome-key.gpg https://dl.google.com/linux/linux_signing_key.pub',
      { silent: true }
    );
    await hostVm.exec(
      'sudo gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg /tmp/google-chrome-key.gpg',
      { silent: true }
    );
    await hostVm.exec('rm /tmp/google-chrome-key.gpg', { silent: true });

    // Add repository using the keyring
    await hostVm.exec(
      'echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] http://dl.google.com/linux/chrome/deb/ stable main" | sudo tee /etc/apt/sources.list.d/google-chrome.list',
      { silent: true }
    );
    await hostVm.exec('sudo apt-get update', { silent: true });
    await hostVm.exec('sudo apt-get install -y google-chrome-stable', { silent: true });
  }

  logger.info('Browser installed successfully');
};

/**
 * Installs Firefox browser on the VM (usually pre-installed, but ensure it's available)
 */
const ensureFirefox = async (hostVm: HostVm, log: ToolingLog): Promise<void> => {
  const logger = prefixedOutputLogger('ensureFirefox()', log);

  logger.info('Ensuring Firefox is installed');

  // `hostVm.exec()` runs via `bash -lc` inside the VM (see `vm_services.ts`) and will throw on non-zero exit codes.
  // Use `|| true` for presence checks.
  const checkResult = await hostVm.exec('which firefox || true', { silent: true });
  if (checkResult.stdout?.trim()) {
    logger.info('Firefox is already installed');
    return;
  }

  await hostVm.exec('sudo apt-get update', { silent: true });
  await hostVm.exec('sudo apt-get install -y firefox', { silent: true });

  logger.info('Firefox installed successfully');
};

/**
 * Injects Chrome browser history entry
 */
const injectChromeHistory = async (
  hostVm: HostVm,
  log: ToolingLog,
  domain: string,
  timestamp: number,
  username: string
): Promise<void> => {
  const logger = prefixedOutputLogger('injectChromeHistory()', log);

  logger.info(`Injecting Chrome browser history for domain: ${domain}`);

  // Ubuntu VMs typically use 'ubuntu' as the default user
  // Map common usernames to 'ubuntu' for VM operations
  const vmUsername = await resolveVmUsername(hostVm, username);
  // Check if Chrome or Chromium is installed.
  // Use `|| true` so we can check `stdout` without failing the whole step.
  const chromiumCheck = await hostVm.exec('which chromium-browser || true', { silent: true });
  const chromeCheck = await hostVm.exec('which google-chrome-stable || true', { silent: true });

  let isChromium = false;
  if (chromiumCheck.stdout?.trim()) {
    isChromium = true;
  } else if (chromeCheck.stdout?.trim()) {
    isChromium = false;
  } else {
    logger.warning('Neither Chrome nor Chromium found, defaulting to Chromium profile path');
    isChromium = true;
  }

  const chromeProfileDir = isChromium
    ? `/home/${vmUsername}/.config/chromium/Default`
    : `/home/${vmUsername}/.config/google-chrome/Default`;
  const historyDb = `${chromeProfileDir}/History`;

  // Create Chrome profile directory if it doesn't exist
  await hostVm.exec(`mkdir -p ${chromeProfileDir}`, { silent: true });

  // Clear immutable flags that Elastic Defend or Chrome may have set on the profile directory
  await hostVm.exec(`sudo chattr -i ${chromeProfileDir} 2>/dev/null || true`, { silent: true });

  // Create a SQL script to inject history (idempotent per-domain)
  const sqlScript = `
-- Chrome History injection script
-- Create History database if it doesn't exist
CREATE TABLE IF NOT EXISTS urls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  visit_count INTEGER DEFAULT 1,
  typed_count INTEGER DEFAULT 0,
  last_visit_time INTEGER NOT NULL,
  hidden INTEGER DEFAULT 0,
  favicon_id INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS visits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url INTEGER NOT NULL,
  visit_time INTEGER NOT NULL,
  visit_duration INTEGER DEFAULT 0,
  from_visit INTEGER DEFAULT 0,
  transition INTEGER DEFAULT 0,
  segment_id INTEGER DEFAULT 0,
  FOREIGN KEY (url) REFERENCES urls(id)
);

-- Insert URL entry
DELETE FROM visits WHERE url IN (SELECT id FROM urls WHERE url = 'https://${domain}');
DELETE FROM urls WHERE url = 'https://${domain}';
INSERT INTO urls (url, title, visit_count, typed_count, last_visit_time, hidden, favicon_id)
VALUES ('https://${domain}', '${domain}', 1, 0, ${timestamp}, 0, 0);

-- Insert visit entry
INSERT INTO visits (url, visit_time, visit_duration, from_visit, transition, segment_id)
SELECT id, ${timestamp}, 0, 0, 805306368, 0 FROM urls WHERE url = 'https://${domain}';
`;

  // Use sqlite3 to inject history (install if needed)
  await hostVm.exec('sudo apt-get install -y sqlite3', { silent: true });

  // Upload SQL script and execute it via sqlite's `.read` (no shell redirection required)
  await hostVm.exec('rm -f /tmp/chrome_history.sql', { silent: true });
  await uploadTextFileToVm(hostVm, '/tmp/chrome_history.sql', sqlScript);
  await hostVm.exec(
    `sudo chattr -i ${historyDb} 2>/dev/null; sudo rm -f ${historyDb} ${historyDb}-journal 2>/dev/null; sqlite3 ${historyDb} ".read /tmp/chrome_history.sql"`,
    { silent: true }
  );
  await hostVm.exec('rm -f /tmp/chrome_history.sql', { silent: true });

  // Set proper permissions
  await hostVm.exec(`chown -R ${vmUsername}:${vmUsername} ${chromeProfileDir}`, { silent: true });

  logger.info('Chrome browser history injected successfully');
};

/**
 * Injects Firefox browser history entry
 */
const injectFirefoxHistory = async (
  hostVm: HostVm,
  log: ToolingLog,
  domain: string,
  timestamp: number,
  username: string
): Promise<void> => {
  const logger = prefixedOutputLogger('injectFirefoxHistory()', log);

  logger.info(`Injecting Firefox browser history for domain: ${domain}`);

  // Ubuntu VMs typically use 'ubuntu' as the default user
  // Map common usernames to 'ubuntu' for VM operations
  const vmUsername = await resolveVmUsername(hostVm, username);
  // Find Firefox profile directory
  const firefoxProfilesDir = `/home/${vmUsername}/.mozilla/firefox`;
  await hostVm.exec(`mkdir -p ${firefoxProfilesDir}`, { silent: true });

  // Get or create default profile
  const profileCheck = await hostVm.exec(
    `ls -d ${firefoxProfilesDir}/*.default 2>/dev/null | head -1`,
    { silent: true }
  );

  let profileDir: string;
  if (profileCheck.exitCode === 0 && profileCheck.stdout.trim()) {
    profileDir = profileCheck.stdout.trim();
  } else {
    // Create a default profile
    const profileName = `profile.${Math.random().toString(36).substring(2, 9)}.default`;
    profileDir = `${firefoxProfilesDir}/${profileName}`;
    await hostVm.exec(`mkdir -p ${profileDir}`, { silent: true });
  }

  const placesDb = `${profileDir}/places.sqlite`;

  // Create SQL script for Firefox history injection
  // Firefox uses microseconds since epoch, but we need to convert from Chrome's format
  const firefoxTimestamp = Math.floor(timestamp / 1000); // Convert to milliseconds

  const sqlScript = `
-- Firefox History injection script
CREATE TABLE IF NOT EXISTS moz_places (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL,
  title TEXT,
  visit_count INTEGER DEFAULT 1,
  last_visit_date INTEGER NOT NULL,
  hidden INTEGER DEFAULT 0,
  typed INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS moz_historyvisits (
  id INTEGER PRIMARY KEY,
  place_id INTEGER NOT NULL,
  visit_date INTEGER NOT NULL,
  visit_type INTEGER DEFAULT 1,
  session INTEGER,
  FOREIGN KEY (place_id) REFERENCES moz_places(id)
);

-- Insert place entry
DELETE FROM moz_historyvisits WHERE place_id IN (SELECT id FROM moz_places WHERE url = 'https://${domain}');
DELETE FROM moz_places WHERE url = 'https://${domain}';
INSERT INTO moz_places (url, title, visit_count, last_visit_date, hidden, typed)
VALUES ('https://${domain}', '${domain}', 1, ${firefoxTimestamp}, 0, 0);

-- Insert visit entry
INSERT INTO moz_historyvisits (place_id, visit_date, visit_type, session)
SELECT id, ${firefoxTimestamp}, 1, NULL FROM moz_places WHERE url = 'https://${domain}';
`;

  // Use sqlite3 to inject history
  await hostVm.exec('sudo apt-get install -y sqlite3', { silent: true });

  await hostVm.exec('rm -f /tmp/firefox_history.sql', { silent: true });
  await uploadTextFileToVm(hostVm, '/tmp/firefox_history.sql', sqlScript);
  await hostVm.exec(`sqlite3 ${placesDb} ".read /tmp/firefox_history.sql"`, { silent: true });
  await hostVm.exec('rm -f /tmp/firefox_history.sql', { silent: true });

  // Set proper permissions
  await hostVm.exec(`chown -R ${vmUsername}:${vmUsername} ${firefoxProfilesDir}`, { silent: true });

  logger.info('Firefox browser history injected successfully');
};

/**
 * Sets up browser history on designated endpoints
 * - 1 Chrome entry on first Defend+Osquery endpoint
 * - 1 Firefox entry on first Osquery-only endpoint (scales with count)
 */
export const setupBrowserHistory = async (
  endpoints: ProvisionedEndpoint[],
  log: ToolingLog,
  config: Rsa2026DemoConfig
): Promise<void> => {
  const logger = prefixedOutputLogger('setupBrowserHistory()', log);

  logger.info('Setting up browser history on designated endpoints');

  return logger.indent(4, async () => {
    // Find first Defend+Osquery endpoint for Chrome history
    const defendOsqueryEndpoints = endpoints.filter((e) => e.policyType === 'defend-osquery');
    if (defendOsqueryEndpoints.length > 0) {
      const endpoint = defendOsqueryEndpoints[0];
      logger.info(`Setting up Chrome history on ${endpoint.hostname}`);

      await installChromiumOrChrome(endpoint.hostVm, logger);
      await injectChromeHistory(
        endpoint.hostVm,
        logger,
        config.maliciousDomain,
        config.browserHistoryTimestamp,
        config.username
      );

      endpoint.browserHistory = {
        browser: 'chrome',
        domain: config.maliciousDomain,
        timestamp: config.browserHistoryTimestamp,
      };
    }

    // Inject Firefox history on the first N osquery-only endpoints (N = osqueryOnlyCompromisedCount)
    const osqueryOnlyEndpoints = endpoints.filter((e) => e.policyType === 'osquery-only');
    const compromisedOsqueryEndpoints = osqueryOnlyEndpoints.slice(
      0,
      config.osqueryOnlyCompromisedCount
    );
    for (const endpoint of compromisedOsqueryEndpoints) {
      logger.info(`Setting up Firefox history on ${endpoint.hostname}`);

      await ensureFirefox(endpoint.hostVm, logger);
      await injectFirefoxHistory(
        endpoint.hostVm,
        logger,
        config.maliciousDomain,
        config.browserHistoryTimestamp,
        config.username
      );

      endpoint.browserHistory = {
        browser: 'firefox',
        domain: config.maliciousDomain,
        timestamp: config.browserHistoryTimestamp,
      };
    }

    logger.info('Browser history setup completed');
  });
};
