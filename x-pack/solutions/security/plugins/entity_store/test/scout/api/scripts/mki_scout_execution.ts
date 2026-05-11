/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { exec } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { SCOUT_SERVERS_ROOT } from '@kbn/scout-info';
import type { ProjectHandler } from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/project_handler';
import { CloudHandler } from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/cloud_project_handler';
import { ProxyHandler } from '@kbn/security-solution-plugin/scripts/run_cypress/project_handler/proxy_project_handler';
import {
  proxyHealthcheck,
  waitForEsStatusGreen,
  waitForKibanaAvailable,
  waitForEsAccess,
} from '@kbn/security-solution-plugin/scripts/run_cypress/parallel_serverless';

const PROJECT_NAME_PREFIX = 'kibana-scout-entity-store';
const PW_CONFIG_PATH = path.relative(
  REPO_ROOT,
  path.resolve(__dirname, '../playwright.config.ts')
);

function executeCommand(command: string, envVars: NodeJS.ProcessEnv, log: ToolingLog): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { env: envVars, cwd: REPO_ROOT }, (error) => {
      if (error) {
        log.error(`exec error: ${error}`);
        process.exitCode = error.code;
      }
    });

    child.stdout?.on('data', (data) => log.info(data));
    child.stderr?.on('data', (data) => log.info(data));

    child.on('exit', (code) => {
      log.info(`playwright process exited with code: ${code}`);
      if (code !== 0) {
        reject(code);
        return;
      }
      resolve(code);
    });
  });
}

export const cli = () => {
  run(
    async () => {
      const log = new ToolingLog({ level: 'info', writeTo: process.stdout });

      const PROXY_URL = process.env.PROXY_URL || undefined;
      const PROXY_SECRET = process.env.PROXY_SECRET || undefined;
      const PROXY_CLIENT_ID = process.env.PROXY_CLIENT_ID || undefined;
      const API_KEY = process.env.CLOUD_QA_API_KEY || undefined;
      const QA_CONSOLE_URL = process.env.QA_CONSOLE_URL || '';

      log.info(`PROXY_URL is defined: ${PROXY_URL !== undefined}`);
      log.info(`PROXY_CLIENT_ID is defined: ${PROXY_CLIENT_ID !== undefined}`);
      log.info(`PROXY_SECRET is defined: ${PROXY_SECRET !== undefined}`);
      log.info(`API_KEY is defined: ${API_KEY !== undefined}`);

      let cloudHandler: ProjectHandler;
      if (PROXY_URL && PROXY_CLIENT_ID && PROXY_SECRET && (await proxyHealthcheck(PROXY_URL))) {
        log.info('Using ProxyHandler for project creation.');
        cloudHandler = new ProxyHandler(PROXY_URL, PROXY_CLIENT_ID, PROXY_SECRET);
      } else if (API_KEY) {
        log.info('Using CloudHandler for project creation.');
        cloudHandler = new CloudHandler(API_KEY, QA_CONSOLE_URL);
      } else {
        log.error('Neither proxy credentials nor CLOUD_QA_API_KEY are available.');
        return process.exit(1);
      }

      const id = crypto.randomBytes(8).toString('hex');
      const PROJECT_NAME = `${PROJECT_NAME_PREFIX}-${id}`;

      log.info(`Creating project ${PROJECT_NAME}...`);
      const project = await cloudHandler.createSecurityProject(PROJECT_NAME, [
        { product_line: 'security', product_tier: 'complete' },
      ]);

      if (!project) {
        log.error('Failed to create project.');
        return process.exit(1);
      }

      log.info(`Project created: ${project.id} | ${project.kb_url}`);

      let statusCode = 0;
      try {
        const credentials = await cloudHandler.resetCredentials(project.id);
        if (!credentials) {
          log.error('Credentials could not be reset.');
          return process.exit(1);
        }

        await cloudHandler.waitForProjectInitialized(project.id);

        const auth = btoa(`${credentials.username}:${credentials.password}`);
        await waitForEsStatusGreen(project.es_url, auth, project.id);
        await waitForKibanaAvailable(project.kb_url, auth, project.id);
        await waitForEsAccess(project.es_url, auth, project.id);

        const cloudMkiConfig = {
          serverless: true,
          isCloud: true,
          cloudHostName: new URL(QA_CONSOLE_URL).hostname,
          cloudUsersFilePath: path.resolve(REPO_ROOT, '.ftr', 'role_users.json'),
          projectType: 'security',
          productTier: 'complete',
          hosts: {
            kibana: project.kb_url,
            elasticsearch: project.es_url,
          },
          auth: {
            username: credentials.username,
            password: credentials.password,
          },
        };

        await fs.promises.mkdir(SCOUT_SERVERS_ROOT, { recursive: true });
        await fs.promises.writeFile(
          path.join(SCOUT_SERVERS_ROOT, 'cloud_mki.json'),
          JSON.stringify(cloudMkiConfig, null, 2)
        );
        log.info(`Wrote cloud_mki.json to ${SCOUT_SERVERS_ROOT}`);

        const pwBin = path.resolve(REPO_ROOT, 'node_modules', '.bin', 'playwright');
        const command = `${pwBin} test --config=${PW_CONFIG_PATH} --grep="@quality_gate" --project=mki`;

        const envVars: NodeJS.ProcessEnv = {
          ...process.env,
          SCOUT_TARGET_LOCATION: 'cloud',
          SCOUT_TARGET_ARCH: 'serverless',
          SCOUT_TARGET_DOMAIN: 'security_complete',
          SCOUT_LOG_LEVEL: 'info',
        };

        statusCode = await executeCommand(command, envVars, log);
      } catch (err) {
        log.error('An error occurred when running the Scout tests.');
        log.error(err instanceof Error ? err.message : String(err));
        statusCode = 1;
      } finally {
        log.info(`Deleting project ${PROJECT_NAME} (${project.id})...`);
        await cloudHandler.deleteSecurityProject(project.id, PROJECT_NAME);
      }

      process.exit(statusCode);
    },
    { flags: { allowUnexpected: true } }
  );
};
