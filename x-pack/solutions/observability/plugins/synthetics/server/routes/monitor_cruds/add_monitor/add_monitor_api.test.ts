/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AddEditMonitorAPI } from './add_monitor_api';
import { SyntheticsMonitorClient } from '../../../synthetics_service/synthetics_monitor/synthetics_monitor_client';
import { SyntheticsService } from '../../../synthetics_service/synthetics_service';

describe('AddNewMonitorsPublicAPI', () => {
  it('should normalize schedule', async function () {
    const syntheticsService = new SyntheticsService({
      config: {
        enabled: true,
      },
    } as any);
    const api = new AddEditMonitorAPI({
      syntheticsMonitorClient: new SyntheticsMonitorClient(syntheticsService, {} as any),
      request: {
        body: {},
      },
    } as any);
    let result = await api.normalizeMonitor({ schedule: '3' } as any, {} as any);
    expect(result.schedule).toEqual({ number: '3', unit: 'm' });

    result = await api.normalizeMonitor({ schedule: 3 } as any, {} as any);
    expect(result.schedule).toEqual({ number: '3', unit: 'm' });

    result = await api.normalizeMonitor(
      {
        schedule: {
          number: '3',
          unit: 'm',
        },
      } as any,
      {} as any
    );
    expect(result.schedule).toEqual({ number: '3', unit: 'm' });

    result = await api.normalizeMonitor(
      {
        schedule: {
          number: 3,
          unit: 'm',
        },
      } as any,
      {} as any
    );
    expect(result.schedule).toEqual({ number: 3, unit: 'm' });
  });

  describe('normalizeMonitor defaults', () => {
    const syntheticsService = new SyntheticsService({
      config: {},
    } as any);
    const api = new AddEditMonitorAPI({
      syntheticsMonitorClient: new SyntheticsMonitorClient(syntheticsService, {} as any),
      request: {
        body: {},
      },
    } as any);
    it('should normalize tcp', async () => {
      expect(
        await api.normalizeMonitor(
          {
            type: 'tcp',
          } as any,
          {} as any,
          []
        )
      ).toEqual({
        __ui: { is_tls_enabled: false },
        alert: { status: { enabled: true }, tls: { enabled: true } },
        'check.receive': '',
        'check.send': '',
        config_id: '',
        enabled: true,
        form_monitor_type: 'tcp',
        hash: '',
        hosts: '',
        id: '',
        ipv4: true,
        ipv6: true,
        journey_id: '',
        locations: [],
        max_attempts: 2,
        mode: 'any',
        name: '',
        namespace: 'default',
        origin: 'ui',
        params: '',
        proxy_url: '',
        proxy_use_local_resolver: false,
        revision: 1,
        schedule: { number: '3', unit: 'm' },
        'service.name': '',
        'ssl.certificate': '',
        'ssl.certificate_authorities': '',
        'ssl.key': '',
        'ssl.key_passphrase': '',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        'ssl.verification_mode': 'full',
        tags: [],
        timeout: '16',
        type: 'tcp',
        'url.port': null,
        urls: '',
        labels: {},
      });
    });
    it('should normalize icmp', async () => {
      expect(
        await api.normalizeMonitor(
          {
            type: 'icmp',
          } as any,
          {} as any,
          []
        )
      ).toEqual({
        alert: { status: { enabled: true }, tls: { enabled: true } },
        config_id: '',
        enabled: true,
        form_monitor_type: 'icmp',
        hash: '',
        hosts: '',
        id: '',
        ipv4: true,
        ipv6: true,
        journey_id: '',
        locations: [],
        max_attempts: 2,
        mode: 'any',
        name: '',
        namespace: 'default',
        origin: 'ui',
        params: '',
        revision: 1,
        schedule: { number: '3', unit: 'm' },
        'service.name': '',
        tags: [],
        timeout: '16',
        type: 'icmp',
        wait: '1',
        labels: {},
      });
    });
    it('should normalize http', async () => {
      expect(
        await api.normalizeMonitor(
          {
            type: 'http',
          } as any,
          {} as any
        )
      ).toEqual({
        __ui: { is_tls_enabled: false },
        alert: { status: { enabled: true }, tls: { enabled: true } },
        'check.request.body': { type: 'text', value: '' },
        'check.request.headers': {},
        'check.request.method': 'GET',
        'check.response.body.negative': [],
        'check.response.body.positive': [],
        'check.response.headers': {},
        'check.response.json': [],
        'check.response.status': [],
        config_id: '',
        enabled: true,
        form_monitor_type: 'http',
        hash: '',
        id: '',
        ipv4: true,
        ipv6: true,
        journey_id: '',
        locations: [],
        max_attempts: 2,
        max_redirects: '0',
        mode: 'any',
        name: undefined,
        namespace: 'default',
        origin: 'ui',
        params: '',
        password: '',
        proxy_headers: {},
        proxy_url: '',
        'response.include_body': 'on_error',
        'response.include_body_max_bytes': '1024',
        'response.include_headers': true,
        revision: 1,
        schedule: { number: '3', unit: 'm' },
        'service.name': '',
        'ssl.certificate': '',
        'ssl.certificate_authorities': '',
        'ssl.key': '',
        'ssl.key_passphrase': '',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        'ssl.verification_mode': 'full',
        tags: [],
        timeout: '16',
        type: 'http',
        'url.port': null,
        urls: '',
        username: '',
        labels: {},
      });
    });
    it('should normalize browser', async () => {
      expect(
        await api.normalizeMonitor(
          {
            type: 'browser',
          } as any,
          {} as any
        )
      ).toEqual({
        __ui: { script_source: { file_name: '', is_generated_script: false } },
        alert: { status: { enabled: true }, tls: { enabled: true } },
        config_id: '',
        enabled: true,
        'filter_journeys.match': '',
        'filter_journeys.tags': [],
        form_monitor_type: 'multistep',
        hash: '',
        id: '',
        ignore_https_errors: false,
        journey_id: '',
        locations: [],
        max_attempts: 2,
        name: '',
        namespace: 'default',
        origin: 'ui',
        params: '',
        playwright_options: '',
        playwright_text_assertion: '',
        project_id: '',
        revision: 1,
        schedule: { number: '10', unit: 'm' },
        screenshots: 'on',
        'service.name': '',
        'source.inline.script': '',
        'source.project.content': '',
        'ssl.certificate': '',
        'ssl.certificate_authorities': '',
        'ssl.key': '',
        'ssl.key_passphrase': '',
        'ssl.supported_protocols': ['TLSv1.1', 'TLSv1.2', 'TLSv1.3'],
        'ssl.verification_mode': 'full',
        synthetics_args: [],
        tags: [],
        throttling: {
          id: 'default',
          label: 'Default',
          value: { download: '5', latency: '20', upload: '3' },
        },
        timeout: null,
        type: 'browser',
        'url.port': null,
        urls: '',
        labels: {},
      });
    });
  });
});
