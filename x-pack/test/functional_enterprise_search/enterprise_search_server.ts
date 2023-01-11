/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawn, ChildProcess } from 'child_process';

import { observeLines } from '@kbn/stdio-dev-helpers';
import { ToolingLog } from '@kbn/tooling-log';
import * as Rx from 'rxjs';
import { filter, take, map, tap } from 'rxjs/operators';
import { getLatestVersion } from './artifact_manager';

let enterpriseSearchProcess: ChildProcess | undefined;

const DOCKER_START_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const dockerImage = `docker.elastic.co/enterprise-search/enterprise-search`;

function firstWithTimeout(source$: Rx.Observable<any>, errorMsg: string, ms = 30 * 1000) {
  return Rx.race(
    source$.pipe(take(1)),
    Rx.timer(ms).pipe(
      map(() => {
        throw new Error(`[docker:${dockerImage}] ${errorMsg} within ${ms / 1000} seconds`);
      })
    )
  );
}

function childProcessToLogLine(childProcess: ChildProcess, log: ToolingLog) {
  const logLine$ = new Rx.Subject<string>();

  Rx.merge(
    observeLines(childProcess.stdout!).pipe(
      tap((line) => log.info(`[docker:${dockerImage}] ${line}`))
    ),
    observeLines(childProcess.stderr!).pipe(
      tap((line) => log.error(`[docker:${dockerImage}] ${line}`))
    )
  ).subscribe(logLine$);

  return logLine$.asObservable();
}

export async function setupEnterpriseSearch(logger: ToolingLog): Promise<void> {
  return new Promise(async (res, rej) => {
    try {
      const dockerArgs: string[] = [
        `run`,
        `--name=enterprise-search-ftr`,
        `--rm`,
        `-p`,
        `3002:3002`,
        `-e`,
        `elasticsearch.host='http://host.docker.internal:9220'`,
        `-e`,
        `elasticsearch.username=elastic`,
        `-e`,
        `elasticsearch.password=changeme`,
        `-e`,
        `allow_es_settings_modification=true`,
        `-e`,
        `secret_management.encryption_keys=[f8482eb76613714a62569a48f854d2390a957674d46db742c008d80745cd82d9]`,
        `-e`,
        `ENT_SEARCH_DEFAULT_PASSWORD=changeme`,
        `-e`,
        `ent_search.listen_port=3002`,
        `-e`,
        `ent_search.external_url='http://localhost:3002'`,
        `docker.elastic.co/enterprise-search/enterprise-search:${await getLatestVersion()}`,
      ];

      logger.info('starting enterpriseSearch');
      logger.info('docker ' + dockerArgs.join(' '));

      enterpriseSearchProcess = spawn('docker', dockerArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
      enterpriseSearchProcess.on('error', rej);

      try {
        await firstWithTimeout(
          childProcessToLogLine(enterpriseSearchProcess, logger).pipe(
            filter((line) => {
              process.stdout.write(line);
              return /Success! Elastic Enterprise Search is starting successfully./.test(line);
            })
          ),
          'no package manifests loaded',
          DOCKER_START_TIMEOUT
        ).toPromise();
      } catch (err) {
        enterpriseSearchProcess.kill();
        throw err;
      }
      setTimeout(res, 15000);
    } catch (error) {
      rej(error);
    }
  });
}

export function cleanupEnterpriseSearch(log: ToolingLog) {
  if (enterpriseSearchProcess) {
    log.info('Cleaning up Enterprise Search process');
    spawn('docker', ['stop', 'enterprise-search-ftr'], { stdio: 'inherit' });
    if (!enterpriseSearchProcess.kill(9)) {
      log.info("Couldn't clean Enterprise Search process");
    }

    enterpriseSearchProcess.on('close', () => {
      log.info('Enterprise Search closed ');
    });
  }
}
