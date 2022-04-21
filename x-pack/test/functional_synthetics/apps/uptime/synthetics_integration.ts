/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import { FullAgentPolicy } from '../../../../plugins/fleet/common';
import { skipIfNoDockerRegistry } from '../../helpers';

export default function (providerContext: FtrProviderContext) {
  const { getPageObjects, getService } = providerContext;
  const monitorName = 'Sample Synthetics integration';

  const uptimePage = getPageObjects(['syntheticsIntegration']);
  const testSubjects = getService('testSubjects');
  const uptimeService = getService('uptime');

  const getSyntheticsPolicy = (agentFullPolicy: FullAgentPolicy) =>
    agentFullPolicy.inputs.find((input) => input.meta?.package?.name === 'synthetics');

  const generatePolicy = ({
    agentFullPolicy,
    version,
    monitorType,
    name,
    config,
  }: {
    agentFullPolicy: FullAgentPolicy;
    version: string;
    monitorType: string;
    name: string;
    config: Record<string, any>;
  }) => ({
    data_stream: {
      namespace: 'default',
    },
    id: getSyntheticsPolicy(agentFullPolicy)?.id,
    meta: {
      package: {
        name: 'synthetics',
        version,
      },
    },
    name,
    revision: 1,
    streams: [
      {
        data_stream: {
          dataset: monitorType,
          type: 'synthetics',
        },
        id: `${getSyntheticsPolicy(agentFullPolicy)?.streams?.[0]?.id}`,
        name,
        type: monitorType,
        enabled: true,
        processors: [
          {
            add_observer_metadata: {
              geo: {
                name: 'Fleet managed',
              },
            },
          },
          {
            add_fields: {
              fields: {
                'monitor.fleet_managed': true,
              },
              target: '',
            },
          },
        ],
        ...config,
      },
      ...(monitorType === 'browser'
        ? [
            {
              data_stream: {
                dataset: 'browser.network',
                type: 'synthetics',
              },
              id: `${getSyntheticsPolicy(agentFullPolicy)?.streams?.[1]?.id}`,
              processors: [
                {
                  add_observer_metadata: {
                    geo: {
                      name: 'Fleet managed',
                    },
                  },
                },
                {
                  add_fields: {
                    fields: {
                      'monitor.fleet_managed': true,
                    },
                    target: '',
                  },
                },
              ],
            },
            {
              data_stream: {
                dataset: 'browser.screenshot',
                type: 'synthetics',
              },
              id: `${getSyntheticsPolicy(agentFullPolicy)?.streams?.[2]?.id}`,
              processors: [
                {
                  add_observer_metadata: {
                    geo: {
                      name: 'Fleet managed',
                    },
                  },
                },
                {
                  add_fields: {
                    fields: {
                      'monitor.fleet_managed': true,
                    },
                    target: '',
                  },
                },
              ],
            },
          ]
        : []),
    ],
    type: `synthetics/${monitorType}`,
    use_output: 'default',
  });

  describe('When on the Synthetics Integration Policy Create Page', function () {
    skipIfNoDockerRegistry(providerContext);
    const basicConfig = {
      name: monitorName,
      apmServiceName: 'Sample APM Service',
      tags: 'sample tag',
    };

    const generateHTTPConfig = (url: string) => ({
      ...basicConfig,
      url,
    });

    const generateTCPorICMPConfig = (host: string) => ({
      ...basicConfig,
      host,
    });

    const generateBrowserConfig = (config: Record<string, string>): Record<string, string> => ({
      ...basicConfig,
      ...config,
    });

    describe('displays custom UI', () => {
      before(async () => {
        const version = await uptimeService.syntheticsPackage.getSyntheticsPackageVersion();
        await uptimePage.syntheticsIntegration.navigateToPackagePage(version!);
      });

      it('should display policy view', async () => {
        await uptimePage.syntheticsIntegration.ensureIsOnPackagePage();
      });

      it('prevent saving when integration name, url/host, or schedule is missing', async () => {
        const saveButton = await uptimePage.syntheticsIntegration.findSaveButton();
        await saveButton.click();

        await testSubjects.missingOrFail('postInstallAddAgentModal');
      });
    });

    describe('create new policy', () => {
      let version: string;

      beforeEach(async () => {
        version = (await uptimeService.syntheticsPackage.getSyntheticsPackageVersion())!;
        await uptimePage.syntheticsIntegration.navigateToPackagePage(version!);
        await uptimeService.syntheticsPackage.deletePolicyByName(monitorName);
      });

      afterEach(async () => {
        await uptimeService.syntheticsPackage.deletePolicyByName(monitorName);
      });

      it('allows saving when user enters a valid integration name and url/host', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateHTTPConfig('http://elastic.co');
        await uptimePage.syntheticsIntegration.createBasicHTTPMonitorDetails(config);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'http',
            config: {
              max_redirects: 0,
              'response.include_body': 'on_error',
              'response.include_headers': true,
              schedule: '@every 3m',
              timeout: '16s',
              urls: config.url,
              'service.name': config.apmServiceName,
              tags: [config.tags],
              'check.request.method': 'GET',
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
              },
            },
          })
        );
      });

      it('allows enabling tls with defaults', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateHTTPConfig('http://elastic.co');

        await uptimePage.syntheticsIntegration.createBasicHTTPMonitorDetails(config);
        await uptimePage.syntheticsIntegration.enableTLS();
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(
          agentFullPolicy.inputs.find((input) => input.meta?.package?.name === 'synthetics')
        ).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'http',
            config: {
              max_redirects: 0,
              'check.request.method': 'GET',
              'response.include_body': 'on_error',
              'response.include_headers': true,
              schedule: '@every 3m',
              'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
              'ssl.verification_mode': 'full',
              timeout: '16s',
              urls: config.url,
              'service.name': config.apmServiceName,
              tags: [config.tags],
              __ui: {
                is_tls_enabled: true,
                is_zip_url_tls_enabled: false,
              },
            },
          })
        );
      });

      it('allows configuring tls', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateHTTPConfig('http://elastic.co');

        const tlsConfig = {
          verificationMode: 'strict',
          ca: 'ca',
          cert: 'cert',
          certKey: 'certKey',
          certKeyPassphrase: 'certKeyPassphrase',
        };
        await uptimePage.syntheticsIntegration.createBasicHTTPMonitorDetails(config);
        await uptimePage.syntheticsIntegration.configureTLSOptions(tlsConfig);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'http',
            config: {
              max_redirects: 0,
              'check.request.method': 'GET',
              'response.include_body': 'on_error',
              'response.include_headers': true,
              schedule: '@every 3m',
              'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
              'ssl.verification_mode': tlsConfig.verificationMode,
              'ssl.certificate': tlsConfig.cert,
              'ssl.certificate_authorities': tlsConfig.ca,
              'ssl.key': tlsConfig.certKey,
              'ssl.key_passphrase': tlsConfig.certKeyPassphrase,
              timeout: '16s',
              urls: config.url,
              'service.name': config.apmServiceName,
              tags: [config.tags],
              __ui: {
                is_tls_enabled: true,
                is_zip_url_tls_enabled: false,
              },
            },
          })
        );
      });

      it('allows configuring http advanced options', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateHTTPConfig('http://elastic.co');

        await uptimePage.syntheticsIntegration.createBasicHTTPMonitorDetails(config);
        const advancedConfig = {
          username: 'username',
          password: 'password',
          proxyUrl: 'proxyUrl',
          requestMethod: 'POST',
          responseStatusCheck: '204',
          responseBodyCheckPositive: 'success',
          responseBodyCheckNegative: 'failure',
          requestHeaders: {
            sampleRequestHeader1: 'sampleRequestKey1',
            sampleRequestHeader2: 'sampleRequestKey2',
          },
          responseHeaders: {
            sampleResponseHeader1: 'sampleResponseKey1',
            sampleResponseHeader2: 'sampleResponseKey2',
          },
          requestBody: {
            type: 'xml',
            value: '<samplexml>samplexml<samplexml>',
          },
          indexResponseBody: false,
          indexResponseHeaders: false,
        };
        await uptimePage.syntheticsIntegration.configureHTTPAdvancedOptions(advancedConfig);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'http',
            config: {
              max_redirects: 0,
              'check.request.method': advancedConfig.requestMethod,
              'check.request.headers': {
                'Content-Type': 'application/xml',
                ...advancedConfig.requestHeaders,
              },
              'check.response.headers': advancedConfig.responseHeaders,
              'check.response.status': [advancedConfig.responseStatusCheck],
              'check.request.body': advancedConfig.requestBody.value,
              'check.response.body.positive': [advancedConfig.responseBodyCheckPositive],
              'check.response.body.negative': [advancedConfig.responseBodyCheckNegative],
              'response.include_body': advancedConfig.indexResponseBody ? 'on_error' : 'never',
              'response.include_headers': advancedConfig.indexResponseHeaders,
              schedule: '@every 3m',
              timeout: '16s',
              urls: config.url,
              proxy_url: advancedConfig.proxyUrl,
              username: advancedConfig.username,
              password: advancedConfig.password,
              'service.name': config.apmServiceName,
              tags: [config.tags],
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
              },
            },
          })
        );
      });

      it('allows saving tcp monitor when user enters a valid integration name and host+port', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateTCPorICMPConfig('smtp.gmail.com:587');

        await uptimePage.syntheticsIntegration.createBasicTCPMonitorDetails(config);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'tcp',
            config: {
              proxy_use_local_resolver: false,
              schedule: '@every 3m',
              timeout: '16s',
              hosts: config.host,
              tags: [config.tags],
              'service.name': config.apmServiceName,
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
              },
            },
          })
        );
      });

      it('allows configuring tcp advanced options', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateTCPorICMPConfig('smtp.gmail.com:587');

        await uptimePage.syntheticsIntegration.createBasicTCPMonitorDetails(config);
        const advancedConfig = {
          proxyUrl: 'proxyUrl',
          requestSendCheck: 'body',
          responseReceiveCheck: 'success',
          proxyUseLocalResolver: true,
        };
        await uptimePage.syntheticsIntegration.configureTCPAdvancedOptions(advancedConfig);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'tcp',
            config: {
              schedule: '@every 3m',
              timeout: '16s',
              hosts: config.host,
              proxy_url: advancedConfig.proxyUrl,
              proxy_use_local_resolver: advancedConfig.proxyUseLocalResolver,
              'check.receive': advancedConfig.responseReceiveCheck,
              'check.send': advancedConfig.requestSendCheck,
              'service.name': config.apmServiceName,
              tags: [config.tags],
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
              },
            },
          })
        );
      });

      it('allows saving icmp monitor when user enters a valid integration name and host', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateTCPorICMPConfig('1.1.1.1');

        await uptimePage.syntheticsIntegration.createBasicICMPMonitorDetails(config);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'icmp',
            config: {
              schedule: '@every 3m',
              timeout: '16s',
              wait: '1s',
              hosts: config.host,
              'service.name': config.apmServiceName,
              tags: [config.tags],
              __ui: null,
            },
          })
        );
      });

      it('allows saving browser monitor', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateBrowserConfig({
          zipUrl: 'http://test.zip',
          params: JSON.stringify({ url: 'http://localhost:8080' }),
          folder: 'folder',
          username: 'username',
          password: 'password',
        });

        await uptimePage.syntheticsIntegration.createBasicBrowserMonitorDetails(config);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'browser',
            config: {
              screenshots: 'on',
              schedule: '@every 10m',
              timeout: null,
              tags: [config.tags],
              throttling: '5d/3u/20l',
              'service.name': config.apmServiceName,
              'source.zip_url.url': config.zipUrl,
              'source.zip_url.folder': config.folder,
              'source.zip_url.username': config.username,
              'source.zip_url.password': config.password,
              params: JSON.parse(config.params),
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
                script_source: {
                  file_name: '',
                  is_generated_script: false,
                },
              },
            },
          })
        );
      });

      it('allows saving browser monitor with inline script', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateBrowserConfig({
          inlineScript:
            'step("load homepage", async () => { await page.goto(\'https://www.elastic.co\'); });',
        });

        await uptimePage.syntheticsIntegration.createBasicBrowserMonitorDetails(config, true);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'browser',
            config: {
              screenshots: 'on',
              schedule: '@every 10m',
              timeout: null,
              tags: [config.tags],
              throttling: '5d/3u/20l',
              'service.name': config.apmServiceName,
              'source.inline.script': config.inlineScript,
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
                script_source: {
                  file_name: '',
                  is_generated_script: false,
                },
              },
            },
          })
        );
      });

      it('allows saving browser monitor advanced options', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateBrowserConfig({
          zipUrl: 'http://test.zip',
          params: JSON.stringify({ url: 'http://localhost:8080' }),
          folder: 'folder',
          username: 'username',
          password: 'password',
        });

        const advancedConfig = {
          screenshots: 'off',
          syntheticsArgs: '-ssBlocks',
          isThrottlingEnabled: true,
          downloadSpeed: '1337',
          uploadSpeed: '1338',
          latency: '1339',
        };

        await uptimePage.syntheticsIntegration.createBasicBrowserMonitorDetails(config);
        await uptimePage.syntheticsIntegration.configureBrowserAdvancedOptions(advancedConfig);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'browser',
            config: {
              screenshots: advancedConfig.screenshots,
              schedule: '@every 10m',
              timeout: null,
              tags: [config.tags],
              throttling: '1337d/1338u/1339l',
              'service.name': config.apmServiceName,
              'source.zip_url.url': config.zipUrl,
              'source.zip_url.folder': config.folder,
              'source.zip_url.username': config.username,
              'source.zip_url.password': config.password,
              params: JSON.parse(config.params),
              synthetics_args: [advancedConfig.syntheticsArgs],
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
                script_source: {
                  file_name: '',
                  is_generated_script: false,
                },
              },
            },
          })
        );
      });

      it('allows saving disabling throttling', async () => {
        // This test ensures that updates made to the Synthetics Policy are carried all the way through
        // to the generated Agent Policy that is dispatch down to the Elastic Agent.
        const config = generateBrowserConfig({
          zipUrl: 'http://test.zip',
          params: JSON.stringify({ url: 'http://localhost:8080' }),
          folder: 'folder',
          username: 'username',
          password: 'password',
        });

        const advancedConfig = {
          screenshots: 'off',
          syntheticsArgs: '-ssBlocks',
          isThrottlingEnabled: false,
          downloadSpeed: '1337',
          uploadSpeed: '1338',
          latency: '1339',
        };

        await uptimePage.syntheticsIntegration.createBasicBrowserMonitorDetails(config);
        await uptimePage.syntheticsIntegration.configureBrowserAdvancedOptions(advancedConfig);
        await uptimePage.syntheticsIntegration.confirmAndSave();

        await uptimePage.syntheticsIntegration.isPolicyCreatedSuccessfully();

        const [agentPolicy] = await uptimeService.syntheticsPackage.getAgentPolicyList();
        const agentPolicyId = agentPolicy.id;
        const agentFullPolicy = await uptimeService.syntheticsPackage.getFullAgentPolicy(
          agentPolicyId
        );

        expect(getSyntheticsPolicy(agentFullPolicy)).to.eql(
          generatePolicy({
            agentFullPolicy,
            version,
            name: monitorName,
            monitorType: 'browser',
            config: {
              screenshots: advancedConfig.screenshots,
              schedule: '@every 10m',
              timeout: null,
              tags: [config.tags],
              'service.name': config.apmServiceName,
              'source.zip_url.url': config.zipUrl,
              'source.zip_url.folder': config.folder,
              'source.zip_url.username': config.username,
              'source.zip_url.password': config.password,
              params: JSON.parse(config.params),
              synthetics_args: [advancedConfig.syntheticsArgs],
              throttling: false,
              __ui: {
                is_tls_enabled: false,
                is_zip_url_tls_enabled: false,
                script_source: {
                  file_name: '',
                  is_generated_script: false,
                },
              },
            },
          })
        );
      });
    });
  });
}
