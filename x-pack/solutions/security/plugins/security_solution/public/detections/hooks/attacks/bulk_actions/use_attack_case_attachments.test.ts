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

const attackToAttach = {
  id: 'attack-1',
  index: ATTACK_INDEX,
  title: 'A multi-stage attack',
  summaryMarkdown: 'A summary of the attack',
  riskScore: 73,
  alertIds: ['alert-1', 'alert-2'],
};

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

  it('returns undefined when the attack attachments feature flag is disabled', () => {
    useIsExperimentalFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the cases attachment framework is disabled', () => {
    useKibana.mockReturnValue({
      services: { cases: { config: { attachmentsEnabled: false } } },
    });

    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    expect(result.current).toBeUndefined();
  });

  it('builds an attack attachment followed by its alerts', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    expect(result.current?.()).toEqual([
      expect.objectContaining({ type: SECURITY_ATTACK_ATTACHMENT_TYPE }),
      expect.objectContaining({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1', 'alert-2'],
        metadata: { index: ALERTS_INDEX },
      }),
    ]);
  });

  it('does not warn when every alert fits in the case', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    result.current?.({ totalAlerts: 0 } as CaseUI);

    expect(appToasts.addWarning).not.toHaveBeenCalled();
  });

  it('warns when the case does not have room for every alert', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    result.current?.({ totalAlerts: MAX_ALERTS_PER_CASE - 1 } as CaseUI);

    expect(appToasts.addWarning).toHaveBeenCalledWith({
      title: expect.stringContaining('Only 1 of the 2 alerts in this attack will be added'),
    });
  });

  it('attaches only the alerts that fit in the case', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    expect(result.current?.({ totalAlerts: MAX_ALERTS_PER_CASE - 1 } as CaseUI)).toEqual([
      expect.objectContaining({ type: SECURITY_ATTACK_ATTACHMENT_TYPE }),
      expect.objectContaining({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1'],
      }),
    ]);
  });

  it('attaches the attack alone when the case is already full', () => {
    const { result } = renderHook(() => useAttackCaseAttachments(attackToAttach));

    expect(result.current?.({ totalAlerts: MAX_ALERTS_PER_CASE } as CaseUI)).toEqual([
      expect.objectContaining({ type: SECURITY_ATTACK_ATTACHMENT_TYPE }),
    ]);
  });
});
