/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { scanLibrary } from '@kbn/security-rule-libraries';
import { SCAN_RULE_LIBRARY_URL } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import { requestContextMock, requestMock, serverMock } from '../../../routes/__mocks__';
import { scanRuleLibraryRoute } from './scan_rule_library_route';

jest.mock('@kbn/security-rule-libraries', () => ({
  ...jest.requireActual('@kbn/security-rule-libraries'),
  scanLibrary: jest.fn(),
}));

const scanRequest = (body: Record<string, unknown>) =>
  requestMock.create({ method: 'post', path: SCAN_RULE_LIBRARY_URL, body });

const gitHttps = {
  provider: { type: 'git', url: 'https://github.com/org/library', branch: 'main' },
};

describe('scanRuleLibraryRoute', () => {
  let server: ReturnType<typeof serverMock.create>;
  let { clients, context } = requestContextMock.createTools();

  beforeEach(() => {
    jest.clearAllMocks();
    server = serverMock.create();
    ({ clients, context } = requestContextMock.createTools());
    scanRuleLibraryRoute(server.router, clients.logger);
  });

  const inject = (body: Record<string, unknown>) =>
    server.inject(scanRequest(body), requestContextMock.convertContext(context));

  it('reports the release, the rule count and the manifest', async () => {
    jest.mocked(scanLibrary).mockResolvedValue({
      version: '0.0.1',
      ruleCount: 10,
      manifest: { title: 'Elastic Community Rules', license: 'Elastic-2.0' },
    });

    const response = await inject(gitHttps);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({
      success: true,
      version: '0.0.1',
      rule_count: 10,
      manifest: { title: 'Elastic Community Rules', license: 'Elastic-2.0' },
    });
  });

  it('passes the settings to the scan without saving anything', async () => {
    jest.mocked(scanLibrary).mockResolvedValue({ version: '1.0.0', ruleCount: 1 });

    await inject({
      provider: { type: 'git', url: 'https://github.com/org/library', auth_type: 'token' },
      secret: 'ghp_token',
      pinned_version: '1.0.0',
    });

    const [params] = jest.mocked(scanLibrary).mock.calls[0];
    expect(params.pinnedVersion).toBe('1.0.0');
    expect(params.library.secret).toBe('ghp_token');
    expect(params.library.provider).toEqual({
      type: 'git',
      url: 'https://github.com/org/library',
      authType: 'token',
    });
    expect(clients.core.savedObjects.client.create).not.toHaveBeenCalled();
  });

  it('reports a manifest that cannot be used next to the count', async () => {
    jest
      .mocked(scanLibrary)
      .mockResolvedValue({ version: '1.0.0', ruleCount: 4, manifestError: 'not valid YAML' });

    const response = await inject(gitHttps);

    expect(response.body).toEqual({
      success: true,
      version: '1.0.0',
      rule_count: 4,
      manifest_error: 'not valid YAML',
    });
  });

  it('answers a library that cannot be reached with a failed scan, not an error status', async () => {
    jest.mocked(scanLibrary).mockRejectedValue(new Error('HTTP 401 Unauthorized'));

    const response = await inject(gitHttps);

    expect(response.status).toEqual(200);
    expect(response.body).toEqual({ success: false, error: 'HTTP 401 Unauthorized' });
  });

  it('cuts a long error message', async () => {
    jest.mocked(scanLibrary).mockRejectedValue(new Error('x'.repeat(1000)));

    const response = await inject(gitHttps);

    expect(response.body.error).toHaveLength(300);
  });

  describe('validation', () => {
    const rejects = (body: Record<string, unknown>) => {
      const result = server.validate(scanRequest(body));
      expect(result.badRequest).toHaveBeenCalled();
    };

    it('accepts https and ssh git urls and http or https bucket urls', () => {
      const accepted = [
        { provider: { type: 'git', url: 'https://github.com/org/library' } },
        {
          provider: {
            type: 'git',
            url: 'git@github.com:org/library.git',
            auth_type: 'ssh_key',
            username: 'git',
            known_hosts: 'github.com ssh-ed25519 AAAA',
          },
          secret: 'key',
        },
        { provider: { type: 's3', url: 'http://localhost:9000/bucket' } },
      ];
      accepted.forEach((body) =>
        expect(server.validate(scanRequest(body)).badRequest).not.toHaveBeenCalled()
      );
    });

    it('rejects plain http and other schemes for git', () => {
      rejects({ provider: { type: 'git', url: 'http://github.com/org/library' } });
      rejects({ provider: { type: 'git', url: 'file:///etc/passwd' } });
      rejects({ provider: { type: 'git', url: 'ftp://example.com/x' } });
    });

    it('rejects a bucket url that is not http or https', () => {
      rejects({ provider: { type: 's3', url: 's3://bucket' } });
    });

    it('rejects authentication that is missing what it needs', () => {
      rejects({ provider: { type: 'git', url: 'https://github.com/o/l', auth_type: 'token' } });
      rejects({
        provider: {
          type: 's3',
          url: 'https://s3.example.com/bucket',
          auth_type: 's3_access_key',
        },
        secret: 'secret',
      });
      rejects({
        provider: {
          type: 'git',
          url: 'git@github.com:o/l.git',
          auth_type: 'ssh_key',
          username: 'git',
        },
        secret: 'key',
      });
    });

    it('rejects values above their limits and unknown fields', () => {
      rejects({ provider: { type: 'git', url: `https://example.com/${'a'.repeat(2100)}` } });
      rejects({ ...gitHttps, secret: 'a'.repeat(4097) });
      rejects({ ...gitHttps, extra: true });
      rejects({ provider: { ...gitHttps.provider, extra: true } });
    });
  });
});
