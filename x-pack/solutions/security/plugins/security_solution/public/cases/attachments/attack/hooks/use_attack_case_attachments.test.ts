/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import { MAX_ALERTS_PER_CASE } from '@kbn/cases-plugin/common/constants';
import type { CaseUI } from '@kbn/cases-plugin/common';

import type { AttackToAttach } from '..';
import { MAX_ATTACKS_PER_ATTACH } from '..';
import { useAttackCaseAttachments } from './use_attack_case_attachments';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';

jest.mock('../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));
jest.mock('../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn(),
}));
jest.mock('../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const { useKibana } = jest.requireMock('../../../../common/lib/kibana') as {
  useKibana: jest.Mock;
};
const { useAssistantContext } = jest.requireMock('@kbn/elastic-assistant') as {
  useAssistantContext: jest.Mock;
};
const { useAppToasts } = jest.requireMock('../../../../common/hooks/use_app_toasts') as {
  useAppToasts: jest.Mock;
};
const { useIsExperimentalFeatureEnabled } = jest.requireMock(
  '../../../../common/hooks/use_experimental_features'
) as { useIsExperimentalFeatureEnabled: jest.Mock };

const ALERTS_INDEX = '.alerts-security.alerts-default';
const ATTACK_INDEX = '.alerts-security.attack.discovery.alerts-default';

const attack = (
  overrides: Partial<Omit<AttackToAttach, 'alertsIndex'>> = {}
): Omit<AttackToAttach, 'alertsIndex'> => ({
  id: 'attack-1',
  index: ATTACK_INDEX,
  title: 'A multi-stage attack',
  summaryMarkdown: 'A summary of the attack',
  riskScore: 73,
  alertIds: ['alert-1', 'alert-2'],
  ...overrides,
});

const attacksToAttach = [attack()];

describe('useAttackCaseAttachments', () => {
  let appToasts: ReturnType<typeof useAppToastsMock.create>;

  beforeEach(() => {
    jest.clearAllMocks();

    appToasts = useAppToastsMock.create();
    useAppToasts.mockReturnValue(appToasts);
    useAssistantContext.mockReturnValue({ alertsIndexPattern: ALERTS_INDEX });
    useIsExperimentalFeatureEnabled.mockReturnValue(true);
    useKibana.mockReturnValue({
      services: { cases: { config: { attachmentsEnabled: true } } },
    });
  });

  it('returns undefined when there is no attack to attach', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(undefined));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the attacks to attach are empty', () => {
    const { result } = renderHook(() => useAttackCaseAttachments([]));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the attack attachments feature flag is disabled', () => {
    useIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the cases attachment framework is disabled', () => {
    useKibana.mockReturnValue({
      services: { cases: { config: { attachmentsEnabled: false } } },
    });

    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    expect(result.current).toBeUndefined();
  });

  it('builds an attack attachment followed by its alerts', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    expect(result.current?.getAttachments()).toEqual([
      expect.objectContaining({ type: SECURITY_ATTACK_ATTACHMENT_TYPE }),
      expect.objectContaining({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1', 'alert-2'],
        metadata: { index: ALERTS_INDEX, sourceAttachmentIds: ['attack-1'] },
      }),
    ]);
  });

  it('does not warn when every alert fits in the case', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    result.current?.onAttached({ totalAlerts: 0 } as CaseUI);

    expect(appToasts.addWarning).not.toHaveBeenCalled();
  });

  it('warns once the attack is attached to a case without room for every alert', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    result.current?.onAttached({ totalAlerts: MAX_ALERTS_PER_CASE - 1 } as CaseUI);

    expect(appToasts.addWarning).toHaveBeenCalledTimes(1);
    expect(appToasts.addWarning).toHaveBeenCalledWith({
      title: expect.stringContaining('Only 1 of the 2 alerts in this attack were added'),
    });
  });

  it('does not warn while building the attachments, even when they are truncated', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    // The case selector calls this on every render, with a placeholder case, just to find the
    // cases that already hold these attachments.
    result.current?.getAttachments({ totalAlerts: MAX_ALERTS_PER_CASE - 1 } as CaseUI);
    result.current?.getAttachments({ totalAlerts: MAX_ALERTS_PER_CASE } as CaseUI);

    expect(appToasts.addWarning).not.toHaveBeenCalled();
  });

  it('attaches only the alerts that fit in the case', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    expect(
      result.current?.getAttachments({ totalAlerts: MAX_ALERTS_PER_CASE - 1 } as CaseUI)
    ).toEqual([
      expect.objectContaining({ type: SECURITY_ATTACK_ATTACHMENT_TYPE }),
      expect.objectContaining({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1'],
      }),
    ]);
  });

  it('attaches the attack alone when the case is already full', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attacksToAttach));

    expect(result.current?.getAttachments({ totalAlerts: MAX_ALERTS_PER_CASE } as CaseUI)).toEqual([
      expect.objectContaining({ type: SECURITY_ATTACK_ATTACHMENT_TYPE }),
    ]);
  });

  describe('multiple attacks', () => {
    const twoAttacks = [
      attack({ id: 'attack-1', alertIds: ['alert-1', 'alert-2'] }),
      attack({ id: 'attack-2', alertIds: ['alert-3'] }),
    ];

    it('pairs each attack with its own alert attachment', () => {
      const { result } = renderHook(() => useAttackCaseAttachments(twoAttacks));

      expect(result.current?.getAttachments()).toEqual([
        expect.objectContaining({
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          attachmentId: 'attack-1',
        }),
        expect.objectContaining({
          type: SECURITY_ALERT_ATTACHMENT_TYPE,
          attachmentId: ['alert-1', 'alert-2'],
          metadata: { index: ALERTS_INDEX, sourceAttachmentIds: ['attack-1'] },
        }),
        expect.objectContaining({
          type: SECURITY_ATTACK_ATTACHMENT_TYPE,
          attachmentId: 'attack-2',
        }),
        expect.objectContaining({
          type: SECURITY_ALERT_ATTACHMENT_TYPE,
          attachmentId: ['alert-3'],
          metadata: { index: ALERTS_INDEX, sourceAttachmentIds: ['attack-2'] },
        }),
      ]);
    });

    it('gives each attack its own copy of an alert they share', () => {
      const sharingAttacks = [
        attack({ id: 'attack-1', alertIds: ['alert-1', 'alert-2'] }),
        attack({ id: 'attack-2', alertIds: ['alert-2', 'alert-3'] }),
      ];

      const { result } = renderHook(() => useAttackCaseAttachments(sharingAttacks));

      expect(result.current?.getAttachments()).toEqual([
        expect.objectContaining({ attachmentId: 'attack-1' }),
        expect.objectContaining({ attachmentId: ['alert-1', 'alert-2'] }),
        expect.objectContaining({ attachmentId: 'attack-2' }),
        expect.objectContaining({ attachmentId: ['alert-2', 'alert-3'] }),
      ]);
    });

    it('keeps the earlier attacks whole when the alerts do not all fit', () => {
      const { result } = renderHook(() => useAttackCaseAttachments(twoAttacks));

      expect(
        result.current?.getAttachments({ totalAlerts: MAX_ALERTS_PER_CASE - 2 } as CaseUI)
      ).toEqual([
        expect.objectContaining({ attachmentId: 'attack-1' }),
        expect.objectContaining({ attachmentId: ['alert-1', 'alert-2'] }),
        expect.objectContaining({ attachmentId: 'attack-2' }),
      ]);
    });

    it('warns about the alerts left off across the whole selection', () => {
      const { result } = renderHook(() => useAttackCaseAttachments(twoAttacks));

      result.current?.onAttached({ totalAlerts: MAX_ALERTS_PER_CASE - 2 } as CaseUI);

      expect(appToasts.addWarning).toHaveBeenCalledTimes(1);
      expect(appToasts.addWarning).toHaveBeenCalledWith({
        title: expect.stringContaining('Only 2 of the 3 alerts in these 2 attacks were added'),
      });
    });

    it('attaches at most MAX_ATTACKS_PER_ATTACH attacks', () => {
      const tooManyAttacks = Array.from({ length: MAX_ATTACKS_PER_ATTACH + 1 }, (_, index) =>
        attack({ id: `attack-${index}`, alertIds: [`alert-${index}`] })
      );

      const { result } = renderHook(() => useAttackCaseAttachments(tooManyAttacks));
      const attachments = result.current?.getAttachments() ?? [];

      expect(
        attachments.filter(({ type }) => type === SECURITY_ATTACK_ATTACHMENT_TYPE)
      ).toHaveLength(MAX_ATTACKS_PER_ATTACH);
      expect(
        attachments.filter(({ type }) => type === SECURITY_ALERT_ATTACHMENT_TYPE)
      ).toHaveLength(MAX_ATTACKS_PER_ATTACH);
    });

    it('warns about the attacks left off when there are too many of them', () => {
      const tooManyAttacks = Array.from({ length: MAX_ATTACKS_PER_ATTACH + 1 }, (_, index) =>
        attack({ id: `attack-${index}`, alertIds: [`alert-${index}`] })
      );

      const { result } = renderHook(() => useAttackCaseAttachments(tooManyAttacks));
      result.current?.onAttached({ totalAlerts: 0 } as CaseUI);

      expect(appToasts.addWarning).toHaveBeenCalledTimes(1);
      expect(appToasts.addWarning).toHaveBeenCalledWith({
        title: expect.stringContaining(
          `Only ${MAX_ATTACKS_PER_ATTACH} of the ${
            MAX_ATTACKS_PER_ATTACH + 1
          } selected attacks were added`
        ),
      });
    });

    it('raises both warnings when too many attacks and too many alerts are attached', () => {
      const tooManyAttacks = Array.from({ length: MAX_ATTACKS_PER_ATTACH + 1 }, (_, index) =>
        attack({ id: `attack-${index}`, alertIds: [`alert-${index}`] })
      );

      const { result } = renderHook(() => useAttackCaseAttachments(tooManyAttacks));
      result.current?.onAttached({ totalAlerts: MAX_ALERTS_PER_CASE - 1 } as CaseUI);

      expect(appToasts.addWarning).toHaveBeenCalledTimes(2);
    });

    it('does not warn while building attachments for too many attacks', () => {
      const tooManyAttacks = Array.from({ length: MAX_ATTACKS_PER_ATTACH + 1 }, (_, index) =>
        attack({ id: `attack-${index}`, alertIds: [`alert-${index}`] })
      );

      const { result } = renderHook(() => useAttackCaseAttachments(tooManyAttacks));
      result.current?.getAttachments();

      expect(appToasts.addWarning).not.toHaveBeenCalled();
    });
  });
});
