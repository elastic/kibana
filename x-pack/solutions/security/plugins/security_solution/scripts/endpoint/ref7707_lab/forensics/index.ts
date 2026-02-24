/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0.
 */

import type { RunFn } from '@kbn/dev-cli-runner';
import { run } from '@kbn/dev-cli-runner';
import { createToolingLogger } from '../../../../common/endpoint/data_loaders/utils';
import { createRuntimeServices } from '../../common/stack_services';
import { REF7707_DOMAINS } from '../constants';
import { findDnsInitiators } from './attribution';
import { REF7707_LAB_OSQUERY_PACK } from './osquery_pack';

const runForensics: RunFn = async ({ log, flags }) => {
  createToolingLogger.setDefaultLogLevelFromCliFlags(flags);

  const services = await createRuntimeServices({
    kibanaUrl: flags.kibanaUrl as string,
    elasticsearchUrl: flags.elasticUrl as string,
    fleetServerUrl: flags.fleetServerUrl as string,
    username: flags.username as string,
    password: flags.password as string,
    apiKey: flags.apiKey as string,
    spaceId: flags.spaceId as string,
    log,
  });

  const domain = (flags.domain as string) || REF7707_DOMAINS[0];
  const from = (flags.from as string) || 'now-30m';
  const to = (flags.to as string) || 'now';

  const initiators = await findDnsInitiators({
    esClient: services.esClient,
    domain,
    from,
    to,
  });

  log.info(`DNS initiators for domain [${domain}] (${from} -> ${to}):`);
  for (const hit of initiators) {
    log.info(`- ${hit.hostName}: first=${hit.firstSeen} last=${hit.lastSeen} count=${hit.count}`);
  }

  log.info(`\nSuggested osquery pack (run on top candidates first):`);
  for (const q of REF7707_LAB_OSQUERY_PACK) {
    log.info(`\n[${q.id}] ${q.title}\n${q.description}\n${q.query}`);
  }
};

export const cli = () => {
  run(runForensics, {
    description: `
  REF7707 lab forensics helper:
  - finds the earliest host(s) that queried a given domain via dns.question.name
  - prints an osquery query pack you can run via Osquery Manager
`,
    flags: {
      string: [
        'kibanaUrl',
        'elasticUrl',
        'fleetServerUrl',
        'username',
        'password',
        'apiKey',
        'spaceId',
        'domain',
        'from',
        'to',
      ],
      default: {
        kibanaUrl: 'http://127.0.0.1:5601',
        elasticUrl: 'http://127.0.0.1:9200',
        username: 'elastic',
        password: 'changeme',
        apiKey: '',
        spaceId: '',
        domain: '',
        from: 'now-30m',
        to: 'now',
      },
      help: `
        --domain   Domain to attribute (default: first REF7707 domain from the report)
        --from     Time range start (Elasticsearch date math, default: now-30m)
        --to       Time range end (default: now)
      `,
    },
  });
};
