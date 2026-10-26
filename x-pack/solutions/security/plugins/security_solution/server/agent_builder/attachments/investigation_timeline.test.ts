/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import {
  createInvestigationTimelineAttachmentType,
  MAX_TIMELINE_EVENTS,
} from './investigation_timeline';

describe('createInvestigationTimelineAttachmentType', () => {
  const attachmentType = createInvestigationTimelineAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  const validEvents = [
    {
      timestamp: '2026-09-10T12:00:00.000Z',
      host: 'WKSTN-RECV01',
      description:
        'OUTLOOK.EXE (PID 3120, user r.martinez) spawned powershell.exe (PID 4821) with `-nop -w hidden -enc ...` (T1566/T1059.001)',
    },
    {
      timestamp: '2026-09-10T12:01:00.000Z',
      host: 'SRV-DC01',
      description: 'svc.exe spawned vssadmin.exe delete shadows /all /quiet, removing recovery',
    },
  ];

  const validData = { events: validEvents };

  const makeAttachment = (data: unknown) =>
    ({
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.investigationTimeline,
      data,
    } as Attachment<string, unknown>);

  it('has the investigation timeline type id', () => {
    expect(attachmentType.id).toBe(SecurityAgentBuilderAttachments.investigationTimeline);
  });

  describe('validate', () => {
    it('accepts an object whose events array is the reconstruction', async () => {
      const result = await attachmentType.validate(validData);
      expect(result.valid).toBe(true);
    });

    it('accepts an empty events list so a run with no reconstruction still attaches', async () => {
      const result = await attachmentType.validate({ events: [] });
      expect(result.valid).toBe(true);
    });

    it('accepts an optional attachmentLabel alongside events', async () => {
      const result = await attachmentType.validate({
        ...validData,
        attachmentLabel: 'Attack timeline',
      });
      expect(result.valid).toBe(true);
    });

    it('accepts the searched window alongside events, and rejects a half-open one', async () => {
      const window = { start: '2026-09-10T10:00:00.000Z', end: '2026-09-10T14:00:00.000Z' };
      expect((await attachmentType.validate({ ...validData, window })).valid).toBe(true);
      expect((await attachmentType.validate({ events: [], window })).valid).toBe(true);
      expect(
        (await attachmentType.validate({ ...validData, window: { start: window.start } })).valid
      ).toBe(false);
      expect(
        (await attachmentType.validate({ ...validData, window: { start: '', end: window.end } }))
          .valid
      ).toBe(false);
    });

    it('rejects a bare event array; the payload must be { events }', async () => {
      const result = await attachmentType.validate(validEvents);
      expect(result.valid).toBe(false);
    });

    it('rejects an event missing a description', async () => {
      const result = await attachmentType.validate({
        events: [{ timestamp: '2026-09-10T12:00:00.000Z', host: 'WKSTN-RECV01' }],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects an event missing a host, so a multi-host chain cannot be ambiguous', async () => {
      const result = await attachmentType.validate({
        events: [{ timestamp: '2026-09-10T12:00:00.000Z', description: 'something happened' }],
      });
      expect(result.valid).toBe(false);
    });

    it(`rejects more than ${MAX_TIMELINE_EVENTS} events`, async () => {
      const result = await attachmentType.validate({
        events: Array.from({ length: MAX_TIMELINE_EVENTS + 1 }, (_, index) => ({
          timestamp: `2026-09-10T12:00:${String(index).padStart(2, '0')}.000Z`,
          host: 'WKSTN-RECV01',
          description: 'event',
        })),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('renders each event with its timestamp, host, and full description, in order', async () => {
      const formatted = await attachmentType.format(makeAttachment(validData), formatContext);
      const representation = await formatted.getRepresentation?.();

      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('2026-09-10T12:00:00.000Z WKSTN-RECV01');
        expect(representation.value).toContain('PID 3120, user r.martinez');
        expect(representation.value.indexOf('OUTLOOK.EXE')).toBeLessThan(
          representation.value.indexOf('vssadmin.exe')
        );
      }
    });

    it('names the host on every event so a cross-host chain reads unambiguously', async () => {
      const formatted = await attachmentType.format(makeAttachment(validData), formatContext);
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('WKSTN-RECV01');
        expect(representation.value).toContain('SRV-DC01');
      }
    });

    it('states that nothing was reconstructed for an empty timeline', async () => {
      const formatted = await attachmentType.format(makeAttachment({ events: [] }), formatContext);
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('No events were reconstructed');
      }
    });

    // "Nothing in the window" and "nothing at all" are different findings; the header
    // says which range the answer covers.
    it('names the searched window in the header, including on an empty timeline', async () => {
      const window = { start: '2026-09-10T10:00:00.000Z', end: '2026-09-10T14:00:00.000Z' };
      const render = async (events: typeof validEvents) => {
        const formatted = await attachmentType.format(
          makeAttachment({ events, window }),
          formatContext
        );
        const representation = await formatted.getRepresentation?.();
        return representation?.type === 'text' ? representation.value : '';
      };

      expect(await render(validEvents)).toContain(
        'searched 2026-09-10T10:00:00.000Z to 2026-09-10T14:00:00.000Z'
      );
      expect(await render([])).toContain(
        'searched 2026-09-10T10:00:00.000Z to 2026-09-10T14:00:00.000Z'
      );
    });
  });

  describe('getAgentDescription', () => {
    it('documents the { events, window } payload and that the events are already ordered', () => {
      const description = attachmentType.getAgentDescription?.();
      expect(description).toContain('{ events, window? }');
      expect(description).toContain('{ timestamp, host, description }');
      expect(description).toContain('{ start, end }');
      expect(description).toContain('do not reorder');
    });
  });
});
