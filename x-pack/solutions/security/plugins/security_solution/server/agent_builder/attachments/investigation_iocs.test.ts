/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Attachment } from '@kbn/agent-builder-common/attachments';
import { platformCoreTools } from '@kbn/agent-builder-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import { SECURITY_ALERTS_TOOL_ID } from '../tools';
import { createInvestigationIocsAttachmentType, MAX_IOCS_PER_CATEGORY } from './investigation_iocs';

describe('createInvestigationIocsAttachmentType', () => {
  const attachmentType = createInvestigationIocsAttachmentType();
  const formatContext = agentBuilderMocks.attachments.createFormatContextMock();

  const validData = {
    shas: [
      {
        value: 'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10',
        comment: 'seen as dropped update.dll on WKSTN-RECV01, as svc.exe on SRV-DC01',
      },
    ],
    ips: [{ value: '185.220.101.42:443', comment: 'TLS, contacted from WKSTN-RECV01' }],
    file_paths: [{ value: 'C:\\Users\\Public\\update.dll' }],
    ransom_note: [{ value: 'C:\\Users\\Public\\Desktop\\README_RESTORE.txt' }],
    encryption_marker: [{ value: '.locked', comment: 'e.g. ntds.dit.locked' }],
    malicious_commands: [{ value: 'vssadmin delete shadows /all /quiet' }],
    compromised_identities: [
      { value: 'CORP\\Administrator', comment: 'stolen, used for lateral movement' },
    ],
    affected_hosts: [{ value: 'WKSTN-RECV01', comment: 'patient zero' }],
  };

  const makeAttachment = (data: unknown) =>
    ({
      id: 'att-1',
      type: SecurityAgentBuilderAttachments.investigationIocs,
      data,
    } as Attachment<string, unknown>);

  it('has the investigation IoCs type id', () => {
    expect(attachmentType.id).toBe(SecurityAgentBuilderAttachments.investigationIocs);
  });

  describe('validate', () => {
    it('accepts a payload carrying every category', async () => {
      const result = await attachmentType.validate({ ...validData, attachmentLabel: 'IoCs' });
      expect(result.valid).toBe(true);
    });

    it('accepts a payload with only the categories the reconstruction found', async () => {
      const result = await attachmentType.validate({ shas: [{ value: 'abc123' }] });
      expect(result.valid).toBe(true);
    });

    it('accepts an empty payload so a run with no indicators still attaches', async () => {
      const result = await attachmentType.validate({});
      expect(result.valid).toBe(true);
    });

    it('rejects an indicator with an empty value', async () => {
      const result = await attachmentType.validate({ ips: [{ value: '' }] });
      expect(result.valid).toBe(false);
    });

    it('rejects a category holding bare strings instead of { value, comment }', async () => {
      const result = await attachmentType.validate({ ips: ['185.220.101.42'] });
      expect(result.valid).toBe(false);
    });

    it(`rejects more than ${MAX_IOCS_PER_CATEGORY} indicators in one category`, async () => {
      const result = await attachmentType.validate({
        ips: Array.from({ length: MAX_IOCS_PER_CATEGORY + 1 }, (_, index) => ({
          value: `203.0.113.${index}`,
        })),
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('format', () => {
    it('renders every category under its own label', async () => {
      const formatted = await attachmentType.format(makeAttachment(validData), formatContext);
      const representation = await formatted.getRepresentation?.();

      expect(representation?.type).toBe('text');
      if (representation?.type === 'text') {
        expect(representation.value).toContain('SHA256:');
        expect(representation.value).toContain('IP addresses:');
        expect(representation.value).toContain('File paths:');
        expect(representation.value).toContain('Malicious command lines:');
        expect(representation.value).toContain('Ransom notes:');
        expect(representation.value).toContain('Encryption markers:');
        expect(representation.value).toContain('Compromised identities:');
        expect(representation.value).toContain('Affected hosts:');
      }
    });

    it('renders the comment that makes each indicator actionable', async () => {
      const formatted = await attachmentType.format(makeAttachment(validData), formatContext);
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain(
          'a3f5c9d1e8b74620fa1c0d5e2b9847361c0ded4488ab2f0e9a7c6b5d4e3f2a10 — seen as dropped update.dll on WKSTN-RECV01, as svc.exe on SRV-DC01'
        );
        expect(representation.value).toContain('WKSTN-RECV01 — patient zero');
      }
    });

    it('omits a category the reconstruction did not fill', async () => {
      const formatted = await attachmentType.format(
        makeAttachment({ shas: [{ value: 'abc123' }] }),
        formatContext
      );
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('SHA256:');
        expect(representation.value).not.toContain('Ransom notes:');
      }
    });

    it('states that nothing was extracted when no category has indicators', async () => {
      const formatted = await attachmentType.format(makeAttachment({}), formatContext);
      const representation = await formatted.getRepresentation?.();

      if (representation?.type === 'text') {
        expect(representation.value).toContain('No indicators were extracted');
      }
    });

    it('throws when the persisted data no longer matches the schema', () => {
      expect(() => attachmentType.format(makeAttachment({ ips: 'nope' }), formatContext)).toThrow(
        'Invalid investigation IoC attachment data'
      );
    });
  });

  describe('getTools', () => {
    it('offers the alerts and ES|QL tools so the indicators can be hunted', () => {
      expect(attachmentType.getTools?.()).toEqual([
        SECURITY_ALERTS_TOOL_ID,
        platformCoreTools.generateEsql,
        platformCoreTools.executeEsql,
      ]);
    });
  });

  describe('getAgentDescription', () => {
    it('documents every category and forbids normalizing the values', () => {
      const description = attachmentType.getAgentDescription?.();
      expect(description).toContain('compromised_identities');
      expect(description).toContain('encryption_marker');
      expect(description).toContain('never widen, defang, or normalize');
    });
  });
});
