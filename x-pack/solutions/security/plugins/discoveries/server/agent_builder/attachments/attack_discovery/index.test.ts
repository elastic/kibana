/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  AgentFormattedAttachment,
  AttachmentFormatContext,
  AttachmentResolveContext,
} from '@kbn/agent-builder-server/attachments';
import type { IRuleDataClient } from '@kbn/rule-registry-plugin/server';

import { ATTACK_DISCOVERY_ATTACHMENT_TYPE } from '../../../../common/constants';
import { createAttackDiscoveryAttachmentType } from '.';

const logger = loggingSystemMock.createLogger();

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

const createDataClient = (hits: unknown[]): IRuleDataClient => {
  const search = jest.fn().mockResolvedValue({ hits: { hits } });
  return { getReader: jest.fn().mockReturnValue({ search }) } as unknown as IRuleDataClient;
};

const resolveContext = { spaceId: 'default' } as AttachmentResolveContext;
const formatContext = {} as AttachmentFormatContext;

const defaultDeps = () => ({
  adhocAttackDiscoveryDataClient: createDataClient([discoveryHit]),
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

  // The schema accepts a 1024-character title plus 8k of summary and 50k of details,
  // which the 10k framework default would silently truncate.
  describe('maxContentLength', () => {
    it('admits everything the schema accepts', () => {
      expect(createAttackDiscoveryAttachmentType(defaultDeps()).maxContentLength).toBeGreaterThan(
        59_024
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

    it('returns invalid when alert_ids exceeds the 1000 entry bound', () => {
      const result = createAttackDiscoveryAttachmentType(defaultDeps()).validate({
        ...validData,
        alert_ids: new Array(1001).fill('alert-1'),
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

    it('includes the details markdown', () => {
      const representation = format(validData).getRepresentation?.();

      expect(representation).toMatchObject({
        value: expect.stringContaining('The attacker did a thing.'),
      });
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
    it('reads the index scoped to the request space', async () => {
      const adhocAttackDiscoveryDataClient = createDataClient([discoveryHit]);

      await createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        logger,
      }).resolve?.('discovery-1', { ...resolveContext, spaceId: 'space-a' });

      expect(adhocAttackDiscoveryDataClient.getReader).toHaveBeenCalledWith({
        namespace: 'space-a',
      });
    });

    it('queries by document id', async () => {
      const adhocAttackDiscoveryDataClient = createDataClient([discoveryHit]);

      await createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient,
        logger,
      }).resolve?.('discovery-1', resolveContext);

      expect(adhocAttackDiscoveryDataClient.getReader({}).search).toHaveBeenCalledWith({
        query: { ids: { values: ['discovery-1'] } },
        size: 1,
      });
    });

    it('returns the projected discovery', async () => {
      const resolved = await createAttackDiscoveryAttachmentType(defaultDeps()).resolve?.(
        'discovery-1',
        resolveContext
      );

      expect(resolved).toEqual(validData);
    });

    it('returns data that satisfies its own validate', async () => {
      const attachmentType = createAttackDiscoveryAttachmentType(defaultDeps());

      const resolved = await attachmentType.resolve?.('discovery-1', resolveContext);

      expect(attachmentType.validate(resolved)).toMatchObject({ valid: true });
    });

    it('throws when the discovery is not found', async () => {
      const attachmentType = createAttackDiscoveryAttachmentType({
        adhocAttackDiscoveryDataClient: createDataClient([]),
        logger,
      });

      await expect(attachmentType.resolve?.('missing', resolveContext)).rejects.toThrow(
        'Attack Discovery with id "missing" was not found'
      );
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
