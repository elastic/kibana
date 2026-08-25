/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { run, type RunContext } from '@kbn/dev-cli-runner';
import { cyan, gray } from 'chalk';
import execa from 'execa';
import { REPO_ROOT } from '@kbn/repo-info';
import { join } from 'path';
import { ColumnLayoutFormatter } from '../common/screen/column_layout_formatter';
import { ES_LOADED_USERS, ES_RESOURCES } from '../common/roles_users/serverless';

export const cli = async () => {
  return run(
    async (cliContext: RunContext) => {
      const exeScript = join(REPO_ROOT, 'scripts', 'es');
      const callingArgs = process.argv.slice(2);

      if (!callingArgs.includes('serverless')) {
        callingArgs.unshift('serverless');
      }

      callingArgs.push(
        ...Object.values(ES_RESOURCES).reduce((acc, resourcePath) => {
          acc.push('--resources', resourcePath);
          return acc;
        }, [] as string[])
      );

      cliContext.log.info(`
Starting ES with supported Security project roles and users.
User accounts available for login:

${
  new ColumnLayoutFormatter(
    [
      ['USERNAME', '-'.repeat(20), ...ES_LOADED_USERS.map((u) => cyan(u))].join('\n'),

      [
        'PASSWORD',
        '-'.repeat(20),
        ' ',
        ' ',
        gray('Password for all'),
        gray('accounts set'),
        `${gray('to:')} ${cyan('changeme')}`,
      ].join('\n'),
    ],
    { separator: '  ', widths: [50, 40] }
  ).output
}
`);

      cliContext.log.info(gray(`node ${exeScript} ${callingArgs.join(' ')}`));

      await execa.node(exeScript, callingArgs, {
        stderr: 'inherit',
        stdout: 'inherit',
      });
    },
    {
      description: `ES serverless start script for Security project.
This is a bypass utility that calls ${cyan('yarn es serverless')} along with some default options
that will enable users and roles to be loaded into ES.
`,
      flags: {
        allowUnexpected: true,
        help: `
Any option supported by ${cyan('yarn es')} can also be used with this utility.

For more on ${cyan('yarn es')} usage, enter: ${cyan('yarn es --help')}
`,
      },
    }
  );
};
