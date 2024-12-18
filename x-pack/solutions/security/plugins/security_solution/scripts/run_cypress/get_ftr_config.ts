/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import { EsVersion, readConfigFile } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { CA_TRUSTED_FINGERPRINT } from '@kbn/dev-utils';
import { getLocalhostRealIp } from '../endpoint/common/network_services';
import type { parseTestFileConfig } from './utils';

export const getFTRConfig = ({
  log,
  esPort,
  kibanaPort,
  fleetServerPort,
  ftrConfigFilePath,
  specFilePath,
  specFileFTRConfig,
  isOpen,
}: {
  log: ToolingLog;
  esPort: number;
  kibanaPort: number;
  fleetServerPort: number;
  ftrConfigFilePath: string;
  specFilePath: string;
  specFileFTRConfig: ReturnType<typeof parseTestFileConfig>;
  isOpen: boolean;
}) =>
  readConfigFile(
    log,
    EsVersion.getDefault(),
    ftrConfigFilePath,
    {
      servers: {
        elasticsearch: {
          port: esPort,
        },
        kibana: {
          port: kibanaPort,
        },
        fleetserver: {
          port: fleetServerPort,
        },
      },
      // CAUTION: Do not override here kbnTestServer.serverArgs
      // or important configs like ssl key and certificate will be lost.
      // Please do it in the section bellow on extendedSettings
      //
      // kbnTestServer: {
      //   serverArgs: [
      //     ...
      //   ],
      // },
    },
    (vars) => {
      const hostRealIp = getLocalhostRealIp();

      const hasFleetServerArgs = _.some(
        vars.kbnTestServer.serverArgs,
        (value) =>
          value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
          value.includes('--xpack.fleet.agents.elasticsearch.host')
      );

      vars.kbnTestServer.serverArgs = _.filter(
        vars.kbnTestServer.serverArgs,
        (value) =>
          !(
            value.includes('--elasticsearch.hosts') ||
            value.includes('--xpack.fleet.agents.fleet_server.hosts') ||
            value.includes('--xpack.fleet.agents.elasticsearch.host') ||
            value.includes('--server.port')
          )
      );

      // NOTE: extending server args here as settingOverrides above is removing some important SSL configs
      // like key and certificate
      vars.kbnTestServer.serverArgs.push(
        `--server.port=${kibanaPort}`,
        `--elasticsearch.hosts=http://localhost:${esPort}`
      );

      // apply right protocol on hosts
      vars.kbnTestServer.serverArgs = _.map(vars.kbnTestServer.serverArgs, (value) => {
        if (
          vars.servers.elasticsearch.protocol === 'https' &&
          value.includes('--elasticsearch.hosts=http://')
        ) {
          return value.replace('http', 'https');
        }

        if (
          vars.servers.kibana.protocol === 'https' &&
          (value.includes('--elasticsearch.hosts=http://') ||
            value.includes('--server.publicBaseUrl=http://'))
        ) {
          return value.replace('http', 'https');
        }

        return value;
      });

      if (specFileFTRConfig?.kbnServerArgs?.length) {
        vars.kbnTestServer.serverArgs.push(...specFileFTRConfig?.kbnServerArgs);
      }

      if (specFileFTRConfig?.license) {
        if (vars.serverless) {
          log.warning(
            `'ftrConfig.license' ignored. Value does not apply to kibana when running in serverless.\nFile: ${specFilePath}`
          );
        } else {
          vars.esTestCluster.license = specFileFTRConfig.license;
        }
      }

      if (hasFleetServerArgs) {
        if (vars.serverless) {
          vars.esServerlessOptions = {
            ...(vars.esServerlessOptions || {}),
            // Bind ES docker container to the host network so that the Elastic agent running in the VM can connect to it
            host: hostRealIp,
          };

          vars.kbnTestServer.serverArgs.push(
            `--xpack.fleet.agents.fleet_server.hosts=["https://${hostRealIp}:${fleetServerPort}"]`
          );
          vars.kbnTestServer.serverArgs.push(
            `--xpack.fleet.outputs=${JSON.stringify([
              {
                id: 'fleet-default-output',
                name: 'default',
                is_default: true,
                is_default_monitoring: true,
                type: 'elasticsearch',
                ca_trusted_fingerprint: CA_TRUSTED_FINGERPRINT,
                hosts: [`https://${hostRealIp}:${esPort}`],
                config: {
                  ssl: {
                    verification_mode: 'none',
                  },
                },
              },
            ])}`
          );
        } else {
          vars.kbnTestServer.serverArgs.push(
            `--xpack.fleet.agents.fleet_server.hosts=["https://${hostRealIp}:${fleetServerPort}"]`
          );
          vars.kbnTestServer.serverArgs.push(
            `--xpack.fleet.agents.elasticsearch.host=http://${hostRealIp}:${esPort}`
          );
        }
      }

      if (specFileFTRConfig?.productTypes) {
        if (vars.serverless) {
          vars.kbnTestServer.serverArgs.push(
            `--xpack.securitySolutionServerless.productTypes=${JSON.stringify([
              ...specFileFTRConfig.productTypes,
              // Why spread it twice?
              // The `serverless.security.yml` file by default includes two product types as of this change.
              // Because it's an array, we need to ensure that existing values are "removed" and the ones
              // defined here are added. To do that, we duplicate the `productTypes` passed so that all array
              // elements in that YAML file are updated. The Security serverless plugin has code in place to
              // dedupe.
              ...specFileFTRConfig.productTypes,
            ])}`
          );
        } else {
          log.warning(
            `'ftrConfig.productTypes' ignored. Value applies only when running kibana is serverless.\nFile: ${specFilePath}`
          );
        }
      }

      return vars;
    }
  );
