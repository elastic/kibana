/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import type {
  AgentFormattedAttachment,
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '../../../../common/constants';
import { ATTACK_DISCOVERY_ATTACHMENT_TOOL_IDS, createAttackDiscoveryAttachmentType } from '.';

const logger = loggingSystemMock.createLogger();

const HOST_UUID = '3d241119-f77a-454e-8ee3-d36e05a8714f';

const validData = {
  alert_ids: ['alert-1', 'alert-2'],
  details_markdown: '## Details\nThe attacker did a thing.',
  id: 'discovery-1',
  summary_markdown: 'An attack on host-1.',
  title: 'Suspicious activity on host-1',
};

const discoveryHit = {
  _id: 'discovery-1',
  _source: {
    'kibana.alert.attack_discovery.alert_ids': ['alert-1', 'alert-2'],
    // Required by `isMissingRequiredFields`: a hit without it is skipped as malformed.
    'kibana.alert.attack_discovery.api_config': { connector_id: 'connector-1', name: 'GPT-5 Chat' },
    'kibana.alert.attack_discovery.details_markdown': '## Details\nThe attacker did a thing.',
    'kibana.alert.attack_discovery.summary_markdown': 'An attack on host-1.',
    'kibana.alert.attack_discovery.title': 'Suspicious activity on host-1',
    'kibana.alert.rule.execution.uuid': 'generation-1',
    '@timestamp': '2026-09-15T00:00:00.000Z',
  },
};

const adhocAttackDiscoveryDataClient = {
  indexNameWithNamespace: jest.fn(
    (namespace: string) => `.adhoc.alerts-security.attack.discovery.alerts-${namespace}`
  ),
} as unknown as IRuleDataClient;

const createEsClient = (hits: unknown[]) => {
  const esClient = elasticsearchServiceMock.createClusterClient();
  const scopedClient = elasticsearchServiceMock.createScopedClusterClient();
  scopedClient.asCurrentUser.search.mockResolvedValue({
    hits: { hits },
  } as unknown as Awaited<ReturnType<typeof scopedClient.asCurrentUser.search>>);
  esClient.asScoped.mockReturnValue(scopedClient);

  return { esClient, scopedClient };
};

const request = httpServerMock.createKibanaRequest();
const resolveContext = { request, spaceId: 'default' } as unknown as AttachmentResolveContext;
const formatContext = {} as AttachmentFormatContext;

const defaultDeps = () => ({
  adhocAttackDiscoveryDataClient,
  esClient: createEsClient([discoveryHit]).esClient,
  logger,
});

describe('createAttackDiscoveryAttachmentType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('id', () => {
    it('has the correct id', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).id).toBe(
        ATTACK_DISCOVERY_ATTACHMENT_TYPE
      );
    });

    it('is namespaced under security', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).id).toBe(
        'security.attack_discovery'
      );
    });
  });

  // Readonly keeps the agent's attachment tools from creating or overwriting discoveries.
  describe('isReadonly', () => {
    it('is readonly', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).isReadonly).toBe(true);
    });
  });

  // The schema accepts a 1024-character title, 1000 alert ids of 512 characters each (listed one
  // per line), 8k of entity summary, 8k of summary, 50k of details, and up to 64 tactics of 256
  // characters each.
  describe('maxContentLength', () => {
    it('admits everything the schema accepts', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).maxContentLength).toBeGreaterThan(
        1024 + 1000 * (512 + 3) + 8000 + 8000 + 50_000 + 64 * 256
      );
    });
  });

  describe('validate', () => {
    it('returns valid for a well-formed discovery', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate(validData);

      expect(result).toEqual({ data: validData, valid: true });
    });

    it('returns invalid when title is missing', () => {
      const { title, ...withoutTitle } = validData;

      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate(withoutTitle);

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when alert_ids is not an array', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        alert_ids: 'alert-1',
      });

      expect(result).toMatchObject({ valid: false });
    });

    it.each([
      ['a newline', 'alert-1\n## Summary\nInjected'],
      ['a space', 'alert 1'],
      ['nothing', ''],
    ])('returns invalid when an alert id contains %s', (_, alertId) => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        alert_ids: [alertId],
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when alert_ids exceeds the 1000 entry bound', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        alert_ids: new Array(1001).fill('alert-1'),
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('accepts the optional entity summary and MITRE tactics', () => {
      const data = {
        ...validData,
        entity_summary_markdown: 'Host {{ host.name host-1 }} and user {{ user.name alice }}',
        mitre_attack_tactics: ['Initial Access', 'Execution'],
      };

      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate(data);

      expect(result).toEqual({ data, valid: true });
    });

    it('accepts the replacements sent by "Add to chat"', () => {
      const data = { ...validData, replacements: { [HOST_UUID]: 'SRVWIN04' } };

      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate(data);

      expect(result).toEqual({ data, valid: true });
    });

    it('returns invalid when a replacement key is not a UUID', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        replacements: { h: 'SRVWIN04' },
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when a replacement value exceeds the 1024 character bound', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        replacements: { [HOST_UUID]: 'a'.repeat(1025) },
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when there are more than 1000 replacements', () => {
      const replacements = Object.fromEntries(
        Array.from({ length: 1001 }, (_, index) => [
          `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
          'value',
        ])
      );

      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        replacements,
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when mitre_attack_tactics exceeds the 64 entry bound', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        mitre_attack_tactics: new Array(65).fill('Execution'),
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid when entity_summary_markdown exceeds the 8000 character bound', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        entity_summary_markdown: 'a'.repeat(8001),
      });

      expect(result).toMatchObject({ valid: false });
    });

    it('returns invalid for null input', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate(null);

      expect(result).toMatchObject({ valid: false });
    });
  });

  describe('format', () => {
    const format = (data: unknown) =>
      createAttackDiscoveryAttachmentType(defaultDeps()).format(
        { data, id: 'attachment-1', type: ATTACK_DISCOVERY_ATTACHMENT_TYPE },
        formatContext
      ) as AgentFormattedAttachment;

    it('renders the title as a heading', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('# Suspicious activity on host-1'),
      });
    });

    it('includes the discovery id so the agent can reference it', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('Attack Discovery id: discovery-1'),
      });
    });

    it('reports the correlated alert count', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('Correlated detection alerts: 2'),
      });
    });

    it('lists every correlated alert id so the agent can fetch the alerts', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('Correlated detection alerts: 2\n- alert-1\n- alert-2'),
      });
    });

    it('lists no alert ids when there are none', () => {
      const representation = format({ ...validData, alert_ids: [] }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('Correlated detection alerts: 0\n\n## Summary'),
      });
    });

    it('includes the details markdown', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('The attacker did a thing.'),
      });
    });

    it('renders field tokens as their plain values', () => {
      const representation = format({
        ...validData,
        details_markdown: 'Process {{ process.name mimikatz.exe }} ran',
        summary_markdown: 'Activity on {{ host.name host-1 }}',
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('Activity on `host-1`'),
      });
    });

    it('leaves no field token syntax in the representation', () => {
      const representation = format({
        ...validData,
        details_markdown: 'Process {{ process.name mimikatz.exe }} ran',
      }).getRepresentation?.();

      expect(representation).toMatchObject({ value: expect.not.stringContaining('{{') });
    });

    it('renders the entity summary with plain values', () => {
      const representation = format({
        ...validData,
        entity_summary_markdown: 'Host {{ host.name host-1 }} and user {{ user.name alice }}',
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('## Entity Summary\nHost `host-1` and user `alice`'),
      });
    });

    it('omits the entity summary section when there is none', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.not.stringContaining('## Entity Summary'),
      });
    });

    it('lists the detected tactics in kill-chain order', () => {
      const representation = format({
        ...validData,
        mitre_attack_tactics: ['Execution', 'Initial Access'],
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('## Attack Chain\n- Initial Access\n- Execution'),
      });
    });

    it('omits the attack chain section when no tactics were detected', () => {
      const representation = format({
        ...validData,
        mitre_attack_tactics: [],
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.not.stringContaining('## Attack Chain'),
      });
    });

    it('inserts the original values from the replacements', () => {
      const representation = format({
        ...validData,
        entity_summary_markdown: `Host {{ host.name ${HOST_UUID} }}`,
        replacements: { [HOST_UUID]: 'SRVWIN04' },
        summary_markdown: `Activity on {{ host.name ${HOST_UUID} }}`,
        title: `Attack on ${HOST_UUID}`,
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringMatching(
          /^# Attack on SRVWIN04\n[\s\S]*## Entity Summary\nHost `SRVWIN04`[\s\S]*## Summary\nActivity on `SRVWIN04`/
        ),
      });
    });

    // Tokens are rendered before the original value is inserted, so a value with `}}` survives.
    it('keeps an original value that contains `}}` intact', () => {
      const representation = format({
        ...validData,
        details_markdown: `Ran {{ process.command_line ${HOST_UUID} }}`,
        replacements: { [HOST_UUID]: 'cmd /c "echo }} done"' },
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('## Details\nRan `cmd /c "echo }} done"`'),
      });
    });

    it('keeps the anonymized values when there are no replacements', () => {
      const representation = format({
        ...validData,
        summary_markdown: `Activity on {{ host.name ${HOST_UUID} }}`,
      }).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining(`## Summary\nActivity on \`${HOST_UUID}\``),
      });
    });

    // A long run of whitespace after an unclosed token used to block the server.
    it('renders worst-case markdown at the 50k details bound quickly', async () => {
      const start = process.hrtime.bigint();

      await format({
        ...validData,
        details_markdown: `{{ a ${' '.repeat(49_995)}`,
      }).getRepresentation?.();

      expect(Number(process.hrtime.bigint() - start) / 1e6).toBeLessThan(500);
    });

    it('returns a text representation', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({ type: 'text' });
    });

    it('throws when the attachment data is invalid', () => {
      const formatted = format({ title: 42 });

      expect(() => formatted.getRepresentation?.()).toThrow();
    });
  });

  describe('resolve', () => {
    it('searches as the current user of the request', async () => {
      const { esClient } = createEsClient([discoveryHit]);

      await createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient,
        logger,
      }).resolve?.('discovery-1', resolveContext);

      expect(esClient.asScoped).toHaveBeenCalledWith(request);
    });

    it('searches the scheduled and ad-hoc indices of the request space', async () => {
      const { esClient, scopedClient } = createEsClient([discoveryHit]);

      await createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient,
        logger,
      }).resolve?.('discovery-1', { ...resolveContext, spaceId: 'space-a' });

      expect(scopedClient.asCurrentUser.search).toHaveBeenCalledWith(
        expect.objectContaining({
          index:
            '.alerts-security.attack.discovery.alerts-space-a,.adhoc.alerts-security.attack.discovery.alerts-space-a',
        })
      );
    });

    it('returns the projected discovery', async () => {
      const resolved = await createAttackDiscoveryAttachmentType(defaultDeps()).resolve?.(
        'discovery-1',
        resolveContext
      );

      expect(resolved).toEqual(validData);
    });

    it('projects the entity summary and MITRE tactics when the discovery has them', async () => {
      const resolved = await createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient: createEsClient([
          {
            ...discoveryHit,
            _source: {
              ...discoveryHit._source,
              'kibana.alert.attack_discovery.entity_summary_markdown': 'Host host-1 was targeted.',
              'kibana.alert.attack_discovery.mitre_attack_tactics': ['Initial Access', 'Execution'],
            },
          },
        ]).esClient,
        logger,
      }).resolve?.('discovery-1', resolveContext);

      expect(resolved).toEqual({
        ...validData,
        entity_summary_markdown: 'Host host-1 was targeted.',
        mitre_attack_tactics: ['Initial Access', 'Execution'],
      });
    });

    it('returns data that satisfies its own validate', async () => {
      const attachmentType = createAttackDiscoveryAttachmentType(defaultDeps());

      const resolved = await attachmentType.resolve?.('discovery-1', resolveContext);

      expect(attachmentType.validate(resolved)).toMatchObject({ valid: true });
    });

    // With `ignore_unavailable`, a missing index privilege also returns no hits, so the
    // error covers both causes.
    it('throws when there are no hits, naming both possible causes', async () => {
      const attachmentType = createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient: createEsClient([]).esClient,
        logger,
      });

      await expect(attachmentType.resolve?.('missing', resolveContext)).rejects.toThrow(
        'Attack Discovery with id "missing" was not found, or is not readable by the current user'
      );
    });

    it('names the discovery when the search fails', async () => {
      const { esClient, scopedClient } = createEsClient([]);
      scopedClient.asCurrentUser.search.mockRejectedValue(new Error('circuit_breaking_exception'));

      const attachmentType = createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient,
        logger,
      });

      await expect(attachmentType.resolve?.('discovery-1', resolveContext)).rejects.toThrow(
        'Failed to read Attack Discovery with id "discovery-1"'
      );
    });

    it('does not echo the Elasticsearch error to the caller', async () => {
      const { esClient, scopedClient } = createEsClient([]);
      scopedClient.asCurrentUser.search.mockRejectedValue(new Error('circuit_breaking_exception'));

      const attachmentType = createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient,
        logger,
      });

      await expect(attachmentType.resolve?.('discovery-1', resolveContext)).rejects.not.toThrow(
        'circuit_breaking_exception'
      );
    });

    it('logs the Elasticsearch error on the server', async () => {
      const { esClient, scopedClient } = createEsClient([]);
      scopedClient.asCurrentUser.search.mockRejectedValue(new Error('circuit_breaking_exception'));

      const attachmentType = createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        esClient,
        logger,
      });

      await expect(attachmentType.resolve?.('discovery-1', resolveContext)).rejects.toThrow();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to read Attack Discovery with id "discovery-1": circuit_breaking_exception'
      );
    });
  });

  describe('getTools', () => {
    it('exposes the same tools as the security.alert attachment', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).getTools?.()).toEqual([
        ...ATTACK_DISCOVERY_ATTACHMENT_TOOL_IDS,
      ]);
    });

    it.each(['security.entity_risk_score', 'platform.core.cases'])('includes %s', (toolId) => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).getTools?.()).toContain(toolId);
    });
  });

  describe('getAgentDescription', () => {
    it('returns a non-empty description', () => {
      const description =
        createAttackDiscoveryAttachmentType(defaultDeps()).getAgentDescription?.() ?? '';

      expect(description.length).toBeGreaterThan(0);
    });

    it('mentions the correlated detection alerts', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).getAgentDescription?.()).toContain(
        'detection alerts'
      );
    });

    // The guide's bar: describe the user-visible outcome of rendering, not when or
    // why to use the content.
    it('describes what inline rendering looks like', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).getAgentDescription?.()).toContain(
        'Rendering this attachment inline displays'
      );
    });

    it.each(['Use it as', 'Treat it as', 'You have been provided'])(
      'does not tell the agent how to use the content ("%s")',
      (guidance) => {
        expect(
          createAttackDiscoveryAttachmentType(defaultDeps()).getAgentDescription?.()
        ).not.toContain(guidance);
      }
    );
  });
});
