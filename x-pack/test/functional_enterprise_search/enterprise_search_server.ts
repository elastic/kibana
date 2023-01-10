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
    ), // TypeScript note: As long as the proc stdio[1] is 'pipe', then stdout will not be null
    observeLines(childProcess.stderr!).pipe(
      tap((line) => log.error(`[docker:${dockerImage}] ${line}`))
    ) // TypeScript note: As long as the proc stdio[2] is 'pipe', then stderr will not be null
  ).subscribe(logLine$);

  return logLine$.asObservable();
}

export async function setupEnterpriseSearch(logger: ToolingLog): Promise<void> {
  return new Promise(async (res, rej) => {
    try {
      const dockerArgs: string[] = [
        `run`,
        `--name=enterprise-search-ftr`,
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
        `secret_management.encryption_keys=[4a2cd3f81d39bf28738c10db0ca782095ffac07279561809eecc722e0c20eb09]`,
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

      // TODO check if that makes sense ?
      // or replace with a better solution, timeout + wait for
      setTimeout(res, 15000);
    } catch (error) {
      rej(error);
    }
  });
}

export function cleanupEnterpriseSearch(log: ToolingLog) {
  if (enterpriseSearchProcess) {
    log.info('Cleaning up enterprise search process');
    spawn('docker', ['stop', 'enterprise-search-ftr'], { stdio: 'inherit' });
    if (!enterpriseSearchProcess.kill(9)) {
      log.info("Couldn't clean enterprise search process");
    }

    enterpriseSearchProcess.on('close', () => {
      log.info('Enterprise search closed ');
    });
  }
}
