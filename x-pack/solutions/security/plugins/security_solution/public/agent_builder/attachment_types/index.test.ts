/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AttachmentServiceStartContract } from '@kbn/agent-builder-browser';
import { SecurityAgentBuilderAttachments } from '../../../common/constants';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import { registerAttachmentUiDefinitions, registerEntityAttachment } from '.';

jest.mock('./entity_attachment', () => ({
  createEntityAttachmentDefinition: jest.fn(),
}));

describe('registerAttachmentUiDefinitions', () => {
  const mockAddAttachmentType = jest.fn();
  const mockAttachments: AttachmentServiceStartContract = {
    addAttachmentType: mockAddAttachmentType,
  } as unknown as AttachmentServiceStartContract;

  const register = () => registerAttachmentUiDefinitions({ attachments: mockAttachments });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns attachmentLabel when provided in alert attachment data', () => {
    register();

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = ruleCall![1];

    const attachment = {
      id: 'test',
      type: SecurityAgentBuilderAttachments.alert,
      data: { text: '{}', attachmentLabel: 'My Test Security Rule Alert' },
    };
    expect(config.getLabel(attachment)).toBe('My Test Security Rule Alert');
  });

  it('returns default label when attachmentLabel is not provided', () => {
    register();

    const ruleCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alert
    );
    const config = ruleCall![1];

    const attachment = {
      id: 'test',
      type: SecurityAgentBuilderAttachments.alert,
      data: { text: '{}' },
    };
    expect(config.getLabel(attachment)).toBe('Security Alert');
  });

  it('does not register the security.entity attachment type (owned by registerEntityAttachment)', () => {
    register();

    const entityCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.entity
    );
    expect(entityCall).toBeUndefined();
  });

  it('registers security.alerts with a label and icon only', () => {
    register();

    const alertsCall = mockAddAttachmentType.mock.calls.find(
      (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alerts
    );
    expect(alertsCall).toBeDefined();
    expect(alertsCall![1].renderConversationDetailsContent).toBeUndefined();
  });

  describe('security.alerts label', () => {
    const getAlertsLabel = (data: Record<string, unknown>) => {
      register();
      const alertsCall = mockAddAttachmentType.mock.calls.find(
        (call: unknown[]) => call[0] === SecurityAgentBuilderAttachments.alerts
      );
      return alertsCall![1].getLabel({
        id: 'test',
        type: SecurityAgentBuilderAttachments.alerts,
        data,
      });
    };

    it('counts the alerts of a batch that lists them by id', () => {
      expect(getAlertsLabel({ alertIds: ['a', 'b'] })).toBe('2 alerts');
    });

    it('uses the attachmentLabel of a batch that references alerts by tag', () => {
      expect(
        getAlertsLabel({ tags: ['az:proposal:p1'], attachmentLabel: 'Alerts in this proposal' })
      ).toBe('Alerts in this proposal');
    });

    it('falls back to the default label for a batch referenced by tag without a label', () => {
      expect(getAlertsLabel({ tags: ['az:proposal:p1'] })).toBe('Security alerts');
    });
  });
});

describe('registerEntityAttachment impact entity opener', () => {
  const setup = (spaces?: SpacesPluginStart) => {
    const registerImpactEntityOpener = jest.fn();
    registerEntityAttachment({
      attachments: { addAttachmentType: jest.fn() } as unknown as AttachmentServiceStartContract,
      application: {} as unknown as Parameters<typeof registerEntityAttachment>[0]['application'],
      experimentalFeatures: {} as unknown as Parameters<
        typeof registerEntityAttachment
      >[0]['experimentalFeatures'],
      resolveSecurityCanvasContext: jest.fn(),
      uiSettings: {} as unknown as Parameters<typeof registerEntityAttachment>[0]['uiSettings'],
      rendering: {} as unknown as Parameters<typeof registerEntityAttachment>[0]['rendering'],
      spaces,
      registerImpactEntityOpener,
    });
    return registerImpactEntityOpener;
  };

  const spacesWithSolution = (solution?: string) =>
    ({
      getActiveSpace: jest.fn().mockResolvedValue({ id: 'default', name: 'Default', solution }),
    } as unknown as SpacesPluginStart);

  it('registers the opener in a security space', async () => {
    const registerImpactEntityOpener = setup(spacesWithSolution('security'));
    await new Promise(process.nextTick);
    expect(registerImpactEntityOpener).toHaveBeenCalledTimes(1);
  });

  it.each([undefined, 'classic', 'oblt', 'es', 'workplaceai'])(
    'does not register the opener in a %s space',
    async (solution) => {
      const registerImpactEntityOpener = setup(spacesWithSolution(solution));
      await new Promise(process.nextTick);
      expect(registerImpactEntityOpener).not.toHaveBeenCalled();
    }
  );
});
