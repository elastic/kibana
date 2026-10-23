/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { omit } from 'lodash';
import type { FormattedValue } from './common';
import type { SavedObject } from '@kbn/core/server';
import {
  formatMonitorConfigFields,
  formatHeartbeatRequest,
  formatMonitorConfigs,
  formatSavedMonitors,
  mixParamsWithGlobalParams,
} from './format_configs';

import { loggerMock } from '@kbn/logging-mocks';
import type {
  CodeEditorMode,
  MonitorFields,
  ResponseBodyIndexPolicy,
  SyntheticsMonitor,
  SyntheticsMonitorWithSecretsAttributes,
} from '../../../../common/runtime_types';
import {
  ConfigKey,
  KerberosAuthType,
  MonitorTypeEnum,
  ScheduleUnit,
  VerificationMode,
} from '../../../../common/runtime_types';

const testHTTPConfig: Partial<MonitorFields> = {
  type: 'http' as MonitorTypeEnum,
  enabled: true,
  schedule: { number: '3', unit: 'm' as ScheduleUnit },
  'service.name': '',
  tags: [],
  timeout: '16',
  name: 'Test',
  locations: [],
  __ui: { is_tls_enabled: false },
  urls: 'https://www.google.com',
  max_redirects: '0',
  'url.port': 900,
  password: '3z9SBOQWW5F0UrdqLVFqlF6z',
  proxy_url: '${proxyUrl}',
  'check.response.body.negative': [],
  'check.response.body.positive': [],
  'check.response.json': [
    {
      description: 'test description',
      expression: 'foo.bar == "myValue"',
    },
  ],
  'response.include_body': 'on_error' as ResponseBodyIndexPolicy,
  'check.response.headers': {
    'test-header': 'test-value',
  },
  'response.include_headers': true,
  'check.response.status': [],
  'check.request.body': { type: 'text' as CodeEditorMode, value: '' },
  'check.request.headers': {},
  'check.request.method': 'GET',
  'ssl.verification_mode': VerificationMode.NONE,
  username: 'test-username',
  params: '{"proxyUrl":"https://www.google.com"}',
};

const testBrowserConfig: Partial<MonitorFields> = {
  type: MonitorTypeEnum.BROWSER,
  enabled: true,
  schedule: { number: '3', unit: ScheduleUnit.MINUTES },
  'service.name': 'APM Service',
  tags: [],
  timeout: '16',
  name: 'Test',
  locations: [],
  __ui: {
    script_source: { is_generated_script: false, file_name: '' },
    is_tls_enabled: false,
  },
  'source.inline.script':
    "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
  params: '{"a":"param"}',
  playwright_options: '{"playwright":"option"}',
  screenshots: 'on',
  synthetics_args: ['--hasTouch true'],
  'filter_journeys.match': '',
  'filter_journeys.tags': ['dev'],
  ignore_https_errors: false,
  throttling: {
    value: {
      download: '5',
      latency: '20',
      upload: '3',
    },
    id: 'default',
    label: 'default',
  },
  project_id: 'test-project',
};

describe('formatMonitorConfig', () => {
  const logger = loggerMock.create();

  describe('http fields', () => {
    it('sets https keys properly', () => {
      const yamlConfig = formatMonitorConfigFields(
        Object.keys(testHTTPConfig) as ConfigKey[],
        testHTTPConfig,
        logger,
        { proxyUrl: 'https://www.google.com' },
        []
      );

      expect(yamlConfig).toEqual({
        // check.request.method (GET), max_redirects (0), response.include_body
        // (on_error) and timeout (16s) equal the Heartbeat defaults and are omitted.
        'check.response.headers': {
          'test-header': 'test-value',
        },
        'check.response.json': [
          {
            description: 'test description',
            expression: 'foo.bar == "myValue"',
          },
        ],
        enabled: true,
        locations: [],
        name: 'Test',
        password: '3z9SBOQWW5F0UrdqLVFqlF6z',
        'response.include_headers': true,
        schedule: '@every 3m',
        type: 'http',
        urls: 'https://www.google.com',
        proxy_url: 'https://www.google.com',
        username: 'test-username',
        'url.port': 900,
      });
    });

    it.each([true, false])(
      'omits ssl fields when tls is disabled and includes ssl fields when enabled',
      (isTLSEnabled) => {
        const yamlConfig = formatMonitorConfigFields(
          Object.keys(testHTTPConfig) as ConfigKey[],
          {
            ...testHTTPConfig,
            [ConfigKey.METADATA]: { is_tls_enabled: isTLSEnabled },
          },
          logger,
          { proxyUrl: 'https://www.google.com' },
          []
        );

        expect(yamlConfig).toEqual({
          // check.request.method, max_redirects, response.include_body and timeout
          // equal the Heartbeat defaults and are omitted.
          'check.response.headers': {
            'test-header': 'test-value',
          },
          'check.response.json': [
            {
              description: 'test description',
              expression: 'foo.bar == "myValue"',
            },
          ],
          enabled: true,
          locations: [],
          name: 'Test',
          username: 'test-username',
          password: '3z9SBOQWW5F0UrdqLVFqlF6z',
          proxy_url: 'https://www.google.com',
          'response.include_headers': true,
          schedule: '@every 3m',
          type: 'http',
          'url.port': 900,
          urls: 'https://www.google.com',
          ...(isTLSEnabled ? { 'ssl.verification_mode': 'none' } : {}),
        });
      }
    );

    it('emits the Kerberos block only when Kerberos is enabled and omits NTLM', () => {
      const kerberosConfig: Partial<MonitorFields> = {
        ...testHTTPConfig,
        [ConfigKey.USERNAME]: '',
        [ConfigKey.PASSWORD]: '',
        [ConfigKey.KERBEROS]: {
          enabled: true,
          auth_type: KerberosAuthType.PASSWORD,
          realm: 'CORP.LOCAL',
          username: 'svc-heartbeat',
          password: 'secret',
          keytab: '',
          config_path: '/etc/krb5.conf',
          krb5_conf: '',
          service_name: '',
          enable_krb5_fast: false,
        },
        [ConfigKey.NTLM]: {
          enabled: false,
          username: '',
          password: '',
          domain: 'CORP',
          workstation: '',
        },
      };
      const yamlConfig = formatMonitorConfigFields(
        Object.keys(kerberosConfig) as ConfigKey[],
        kerberosConfig,
        logger,
        { proxyUrl: 'https://www.google.com' },
        []
      );

      expect(yamlConfig[ConfigKey.KERBEROS]).toEqual({
        enabled: true,
        auth_type: KerberosAuthType.PASSWORD,
        realm: 'CORP.LOCAL',
        username: 'svc-heartbeat',
        password: 'secret',
        keytab: '',
        config_path: '/etc/krb5.conf',
        krb5_conf: '',
        service_name: '',
        enable_krb5_fast: false,
      });
      // NTLM is dropped because it is disabled.
      expect(yamlConfig[ConfigKey.NTLM]).toBeUndefined();
      // Basic auth fields are empty and therefore omitted.
      expect(yamlConfig[ConfigKey.USERNAME]).toBeUndefined();
    });

    it('resolves nested NTLM params for public Heartbeat configs', () => {
      const ntlmConfig: Partial<MonitorFields> = {
        ...testHTTPConfig,
        [ConfigKey.USERNAME]: '',
        [ConfigKey.PASSWORD]: '',
        [ConfigKey.NTLM]: {
          enabled: true,
          username: 'ntlm-user',
          password: '${ntlmPassword}',
          domain: 'EXAMPLE',
          workstation: '',
        },
      };
      const yamlConfig = formatMonitorConfigFields(
        Object.keys(ntlmConfig) as ConfigKey[],
        ntlmConfig,
        logger,
        { ntlmPassword: 's3c"ret\nline' },
        []
      );

      expect(yamlConfig[ConfigKey.NTLM]).toEqual({
        enabled: true,
        username: 'ntlm-user',
        password: 's3c"ret\nline',
        domain: 'EXAMPLE',
        workstation: '',
      });
    });

    it('omits both Kerberos and NTLM blocks when neither is enabled', () => {
      const noAuthConfig: Partial<MonitorFields> = {
        ...testHTTPConfig,
        [ConfigKey.KERBEROS]: {
          enabled: false,
          auth_type: KerberosAuthType.PASSWORD,
          realm: 'CORP.LOCAL',
          username: '',
          password: '',
          keytab: '',
          config_path: '',
          krb5_conf: '',
          service_name: '',
          enable_krb5_fast: false,
        },
        [ConfigKey.NTLM]: {
          enabled: false,
          username: '',
          password: '',
          domain: 'CORP',
          workstation: '',
        },
      };
      const yamlConfig = formatMonitorConfigFields(
        Object.keys(noAuthConfig) as ConfigKey[],
        noAuthConfig,
        logger,
        { proxyUrl: 'https://www.google.com' },
        []
      );

      expect(yamlConfig[ConfigKey.KERBEROS]).toBeUndefined();
      expect(yamlConfig[ConfigKey.NTLM]).toBeUndefined();
    });
  });
});

describe('browser fields', () => {
  let formattedBrowserConfig: Record<string, FormattedValue>;
  const logger = loggerMock.create();

  beforeEach(() => {
    formattedBrowserConfig = {
      enabled: true,
      'filter_journeys.tags': ['dev'],
      ignore_https_errors: false,
      name: 'Test',
      locations: [],
      schedule: '@every 3m',
      'service.name': 'APM Service',
      'source.inline.script':
        "step('Go to https://www.google.com/', async () => {\n  await page.goto('https://www.google.com/');\n});",
      throttling: {
        download: 5,
        latency: 20,
        upload: 3,
      },
      type: 'browser',
      synthetics_args: ['--hasTouch true'],
      params: {
        a: 'param',
      },
      playwright_options: {
        playwright: 'option',
      },
    };
  });

  it('sets browser keys properly', () => {
    const yamlConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    expect(yamlConfig).toEqual(formattedBrowserConfig);
  });

  it('omits timeout for browser monitors in public config', () => {
    const yamlConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    expect(yamlConfig.timeout).toBeUndefined();
  });

  it('does not set empty strings or empty objects for params and playwright options', () => {
    const yamlConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      {
        ...testBrowserConfig,
        playwright_options: '{}',
        params: '',
      },
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    expect(yamlConfig).toEqual(omit(formattedBrowserConfig, ['params', 'playwright_options']));
  });

  it('excludes UI fields', () => {
    const formattedConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      {
        ...testBrowserConfig,
        throttling: {
          value: null,
          label: 'no-throttling',
          id: 'no-throttling',
        },
      },
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    const expected = {
      ...formattedConfig,
      throttling: false,
    };

    expect(formattedConfig).toEqual(expected);
  });

  it('excludes empty array values', () => {
    testBrowserConfig['filter_journeys.tags'] = [];

    const formattedConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    const expected = {
      ...formattedConfig,
      'filter_journeys.tags': undefined,
    };

    expect(formattedConfig).toEqual(expected);
  });

  it('does not exclude "false" fields', () => {
    testBrowserConfig.enabled = false;

    const formattedConfig = formatMonitorConfigFields(
      Object.keys(testBrowserConfig) as ConfigKey[],
      testBrowserConfig,
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    const expected = { ...formattedConfig, enabled: false };

    expect(formattedConfig).toEqual(expected);
  });

  it('includes certificate_error_spki_allowlist when non-empty', () => {
    const pem = '-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----';
    const formattedConfig = formatMonitorConfigFields(
      [
        ...(Object.keys(testBrowserConfig) as ConfigKey[]),
        ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST,
      ],
      {
        ...testBrowserConfig,
        [ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST]: [pem],
      },
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    expect(formattedConfig.certificate_error_spki_allowlist).toEqual([pem]);
  });

  it('omits certificate_error_spki_allowlist when empty', () => {
    const formattedConfig = formatMonitorConfigFields(
      [
        ...(Object.keys(testBrowserConfig) as ConfigKey[]),
        ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST,
      ],
      {
        ...testBrowserConfig,
        [ConfigKey.CERTIFICATE_ERROR_SPKI_ALLOWLIST]: [],
      },
      logger,
      { proxyUrl: 'https://www.google.com' },
      []
    );

    expect(formattedConfig.certificate_error_spki_allowlist).toBeUndefined();
  });
});

describe('formatHeartbeatRequest', () => {
  it('uses heartbeat id', () => {
    const monitorId = 'test-monitor-id';
    const heartbeatId = 'test-custom-heartbeat-id';
    const actual = formatHeartbeatRequest(
      {
        monitor: testBrowserConfig as SyntheticsMonitor,
        configId: monitorId,
        heartbeatId,
        spaceId: 'test-space-id',
      },
      '{"a":"param"}'
    );
    expect(actual).toEqual({
      ...testBrowserConfig,
      id: heartbeatId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: undefined,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('uses monitor id when custom heartbeat id is not defined', () => {
    const monitorId = 'test-monitor-id';
    const actual = formatHeartbeatRequest(
      {
        monitor: testBrowserConfig as SyntheticsMonitor,
        configId: monitorId,
        heartbeatId: monitorId,
        spaceId: 'test-space-id',
      },
      JSON.stringify({ key: 'value' })
    );
    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: undefined,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
      params: '{"key":"value"}',
    });
  });

  it('sets project fields as null when project id is not defined', () => {
    const monitorId = 'test-monitor-id';
    const monitor = { ...testBrowserConfig, project_id: undefined } as SyntheticsMonitor;
    const actual = formatHeartbeatRequest({
      monitor,
      configId: monitorId,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
    });

    expect(actual).toEqual({
      ...monitor,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': undefined,
        'monitor.project.id': undefined,
        run_once: undefined,
        test_run_id: undefined,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('sets project fields as null when project id is empty', () => {
    const monitorId = 'test-monitor-id';
    const monitor = { ...testBrowserConfig, project_id: '' } as SyntheticsMonitor;
    const actual = formatHeartbeatRequest({
      monitor,
      configId: monitorId,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
    });

    expect(actual).toEqual({
      ...monitor,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': undefined,
        'monitor.project.id': undefined,
        run_once: undefined,
        test_run_id: undefined,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('supports run once', () => {
    const monitorId = 'test-monitor-id';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      configId: monitorId,
      runOnce: true,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
    });

    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: true,
        test_run_id: undefined,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('supports test_run_id', () => {
    const monitorId = 'test-monitor-id';
    const testRunId = 'beep';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      configId: monitorId,
      testRunId,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
    });

    expect(actual).toEqual({
      ...testBrowserConfig,
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: testRunId,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('supports empty params', () => {
    const monitorId = 'test-monitor-id';
    const testRunId = 'beep';
    const actual = formatHeartbeatRequest({
      monitor: { ...testBrowserConfig, params: '' } as SyntheticsMonitor,
      configId: monitorId,
      testRunId,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
    });

    expect(actual).toEqual({
      ...testBrowserConfig,
      params: '',
      id: monitorId,
      fields: {
        config_id: monitorId,
        'monitor.project.name': testBrowserConfig.project_id,
        'monitor.project.id': testBrowserConfig.project_id,
        run_once: undefined,
        test_run_id: testRunId,
        'monitor.interval': 180,
        meta: {
          space_id: 'test-space-id',
        },
      },
      fields_under_root: true,
    });
  });

  it('includes kibanaUrl in fields when provided', () => {
    const monitorId = 'test-monitor-id';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      configId: monitorId,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
      kibanaUrl: 'https://my-kibana.example.com',
    });

    expect(actual.fields?.kibanaUrl).toBe('https://my-kibana.example.com');
  });

  it('omits kibanaUrl from fields when not provided', () => {
    const monitorId = 'test-monitor-id';
    const actual = formatHeartbeatRequest({
      monitor: testBrowserConfig as SyntheticsMonitor,
      configId: monitorId,
      heartbeatId: monitorId,
      spaceId: 'test-space-id',
    });

    expect(actual.fields?.kibanaUrl).toBeUndefined();
  });
});

describe('mixParamsWithGlobalParams', () => {
  it('mixes global params with local', () => {
    const actual = mixParamsWithGlobalParams(
      {
        username: 'test-user',
        password: 'test-password',
        url: 'test-url',
      },
      { params: '{"a":"param"}' } as any
    );
    expect(actual).toEqual({
      params: {
        a: 'param',
        password: 'test-password',
        url: 'test-url',
        username: 'test-user',
      },
      str: '{"username":"test-user","password":"test-password","url":"test-url","a":"param"}',
    });
  });

  it('local params gets preference', () => {
    const actual = mixParamsWithGlobalParams(
      {
        username: 'test-user',
        password: 'test-password',
        url: 'test-url',
      },
      { params: '{"username":"superpower-user"}' } as any
    );
    expect(actual).toEqual({
      params: {
        password: 'test-password',
        url: 'test-url',
        username: 'superpower-user',
      },
      str: '{"username":"superpower-user","password":"test-password","url":"test-url"}',
    });
  });
});

describe('formatMonitorConfigs', () => {
  const logger = loggerMock.create();
  const config = {
    monitor: testHTTPConfig as SyntheticsMonitor,
    configId: 'config-id',
    heartbeatId: 'heartbeat-id',
    params: {},
    spaceId: 'default',
  };

  it('formats a list of configs, one result for each', () => {
    const formatted = formatMonitorConfigs({
      configs: [config, { ...config, heartbeatId: 'another-id' }],
      maintenanceWindows: [],
      logger,
    });

    expect(formatted.map(({ id }) => id)).toEqual(['heartbeat-id', 'another-id']);
  });

  it('formats a single config like a list of one', () => {
    expect(formatMonitorConfigs({ configs: config, maintenanceWindows: [], logger })).toEqual(
      formatMonitorConfigs({ configs: [config], maintenanceWindows: [], logger })
    );
  });
});

describe('formatSavedMonitors', () => {
  const logger = loggerMock.create();
  const urlWithParams = String.raw`https://${'$'}{host}:${'$'}{port}`;

  const savedMonitor = (
    overrides: { namespaces?: string[]; attributes?: Record<string, unknown> } = {}
  ) =>
    ({
      id: 'config-id',
      type: 'synthetics-monitor-multi-space',
      references: [],
      namespaces: ['default'],
      ...overrides,
      attributes: {
        ...testHTTPConfig,
        id: 'heartbeat-id',
        urls: urlWithParams,
        secrets: '{}',
        ...overrides.attributes,
      },
    } as unknown as SavedObject<SyntheticsMonitorWithSecretsAttributes>);

  // `fields` is added when the config is formatted but is not part of the monitor fields type
  const fieldsOf = (formatted: Partial<MonitorFields>) =>
    (formatted as Partial<MonitorFields> & { fields?: { config_id?: string; kibanaUrl?: string } })
      .fields;

  const format = (
    monitors: Array<SavedObject<SyntheticsMonitorWithSecretsAttributes>>,
    paramsBySpace: Record<string, Record<string, string>> = {},
    kibanaUrl?: string
  ) => formatSavedMonitors({ monitors, paramsBySpace, maintenanceWindows: [], kibanaUrl, logger });

  it('identifies each monitor by its heartbeat id and keeps its config id in the fields', () => {
    const [formatted] = format([savedMonitor()]);

    expect(formatted.id).toBe('heartbeat-id');
    expect(fieldsOf(formatted)?.config_id).toBe('config-id');
  });

  it('resolves the params of the space the monitor is in', () => {
    const [formatted] = format([savedMonitor()], {
      default: { host: 'default.example.com', port: '8080' },
      other: { host: 'other.example.com', port: '9090' },
    });

    expect(formatted.urls).toBe('https://default.example.com:8080');
  });

  it('lets params shared across all spaces win over the monitors own space', () => {
    const [formatted] = format([savedMonitor()], {
      default: { host: 'default.example.com', port: '8080' },
      '*': { port: '7070' },
    });

    expect(formatted.urls).toBe('https://default.example.com:7070');
  });

  it('applies params shared across all spaces to a space that has no params of its own', () => {
    const [formatted] = format([savedMonitor({ namespaces: ['no-params-space'] })], {
      '*': { host: 'shared.example.com', port: '7070' },
    });

    expect(formatted.urls).toBe('https://shared.example.com:7070');
  });

  it('treats a monitor without a space as being in the default space', () => {
    const [formatted] = format([savedMonitor({ namespaces: undefined })], {
      default: { host: 'default.example.com', port: '8080' },
    });

    expect(formatted.urls).toBe('https://default.example.com:8080');
  });

  it('puts the kibana url in the fields only when it is known', () => {
    expect(fieldsOf(format([savedMonitor()], {}, 'https://kibana.example.com')[0])?.kibanaUrl).toBe(
      'https://kibana.example.com'
    );
    expect(fieldsOf(format([savedMonitor()])[0])?.kibanaUrl).toBeUndefined();
  });

  it('formats nothing when there are no monitors', () => {
    expect(format([])).toEqual([]);
  });
});
