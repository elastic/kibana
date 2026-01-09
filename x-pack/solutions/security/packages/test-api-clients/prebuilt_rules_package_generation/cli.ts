/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalize } from 'path';
import { homedir } from 'os';
import yargs from 'yargs/yargs';
import { ToolingLog } from '@kbn/tooling-log';
import chalk from 'chalk';
import { statSync } from 'fs';
import { generatePrebuiltRuleAssets } from './generate_prebuilt_rule_assets';
import { generatePrebuiltRulesPackageZipFile } from './generate_prebuilt_rules_package_zip_file';

const DEFAULT_PREBUILT_RULES_PACKAGE_NAME = 'security_detection_engine';

export function runCli() {
  yargs(process.argv.slice(2))
    .command(
      '*',
      'Generate Prebuilt Rules mock Fleet package',
      (y) =>
        y
          .option('packageName', {
            describe: `Package name (default: ${DEFAULT_PREBUILT_RULES_PACKAGE_NAME})`,
            default: DEFAULT_PREBUILT_RULES_PACKAGE_NAME,
            string: true,
          })
          .option('packageSemver', {
            describe: 'Package version in semver format (e.g. 9.2.0)',
            demandOption: true,
            string: true,
          })
          .option('numOfRules', {
            describe: 'A number of mock prebuilt rule assets to generate',
            demandOption: true,
            number: true,
          })
          .option('numOfHistoricalVersions', {
            describe:
              'A number of historical mock prebuilt rule assets per each rule to generate. TotalNumOfRules = numOfRules * (1 + numOfHistoricalVersions)',
            default: 0,
            number: true,
          })
          .option('output', {
            describe: 'Output directory path',
            default: homedir(),
            string: true,
            alias: 'o',
          })
          .showHelpOnFail(true),
      async ({ packageName, packageSemver, numOfRules, numOfHistoricalVersions, output }) => {
        const logger = new ToolingLog({
          level: 'debug',
          writeTo: process.stdout,
        });
        const outputFilePath = normalize(`${output}/${packageName}-${packageSemver}.zip`);
        const totalNumOfPrebuiltRulesAssets = numOfRules * (1 + numOfHistoricalVersions);

        logger.info('🪄 Generating prebuilt rules package...');

        logger.debug(
          `Total ${chalk.blue(
            totalNumOfPrebuiltRulesAssets
          )} prebuilt rules assets will be generated (${chalk.bold(
            numOfRules
          )} latest version prebuilt rules assets + ${chalk.bold(
            numOfRules * numOfHistoricalVersions
          )} historical prebuilt rules assets)`
        );

        const prebuiltRuleAssets = generatePrebuiltRuleAssets({
          numOfRules,
          numOfHistoricalVersions,
          packageVersion: packageSemver,
        });

        await generatePrebuiltRulesPackageZipFile({
          packageName,
          packageSemver,
          prebuiltRuleAssets,
          filePath: outputFilePath,
        });

        const packageStats = statSync(outputFilePath);
        const packageSizeInMB = Math.ceil((packageStats.size / (1024 * 1024)) * 100) / 100;

        logger.success(
          `📦 Generated package has been written to ${chalk.bold(outputFilePath)} (${chalk.magenta(
            packageSizeInMB
          )} ${chalk.magenta('MB')})`
        );
      }
    )
    .parse();
}
