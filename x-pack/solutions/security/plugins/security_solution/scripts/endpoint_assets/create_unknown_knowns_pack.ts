/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Script to create the Unknown Knowns (Dormant Risk Detection) osquery pack
 *
 * Usage:
 *   npx ts-node x-pack/solutions/security/plugins/security_solution/scripts/endpoint_assets/create_unknown_knowns_pack.ts
 *
 * Options:
 *   --kibana-url=<url>    Kibana URL (default: http://localhost:5601)
 *   --username=<user>     Username (default: elastic)
 *   --password=<pass>     Password (default: changeme)
 *   --policy-id=<id>      Policy ID to assign (can be repeated)
 *   --dry-run             Print the pack payload without creating
 *
 * Example:
 *   npx ts-node create_unknown_knowns_pack.ts --policy-id=fleet-server-policy --dry-run
 */

import { generateUnknownKnownsPack, generateCurlCommand } from '../../common/endpoint_assets/pack_generator';

interface ScriptOptions {
  kibanaUrl: string;
  username: string;
  password: string;
  policyIds: string[];
  dryRun: boolean;
}

const parseArgs = (): ScriptOptions => {
  const args = process.argv.slice(2);
  const options: ScriptOptions = {
    kibanaUrl: 'http://localhost:5601',
    username: 'elastic',
    password: 'changeme',
    policyIds: [],
    dryRun: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--kibana-url=')) {
      options.kibanaUrl = arg.split('=')[1];
    } else if (arg.startsWith('--username=')) {
      options.username = arg.split('=')[1];
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1];
    } else if (arg.startsWith('--policy-id=')) {
      options.policyIds.push(arg.split('=')[1]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    }
  }

  return options;
};

const createPack = async (options: ScriptOptions): Promise<void> => {
  const pack = generateUnknownKnownsPack({
    policyIds: options.policyIds,
    enabled: true,
  });

  if (options.dryRun) {
    console.log('\n=== DRY RUN - Pack Payload ===\n');
    console.log(JSON.stringify(pack, null, 2));
    console.log('\n=== Curl Command ===\n');
    console.log(generateCurlCommand(options.kibanaUrl, { policyIds: options.policyIds }));
    return;
  }

  console.log(`Creating Unknown Knowns pack on ${options.kibanaUrl}...`);

  try {
    const response = await fetch(`${options.kibanaUrl}/api/osquery/packs`, {
      method: 'POST',
      headers: {
        'kbn-xsrf': 'true',
        'Content-Type': 'application/json',
        'elastic-api-version': '2023-10-31',
        Authorization: `Basic ${Buffer.from(`${options.username}:${options.password}`).toString('base64')}`,
      },
      body: JSON.stringify(pack),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    console.log('\n=== Pack Created Successfully ===\n');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('\n=== Error Creating Pack ===\n');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

// Main execution
const options = parseArgs();
createPack(options).catch(console.error);
