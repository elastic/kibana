/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  COMMENT_ATTACHMENT_TYPE,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import { MAX_ALERTS_PER_CASE } from '@kbn/cases-plugin/common/constants';
import type { CaseUI } from '@kbn/cases-plugin/common';
import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { useBulkAttackCaseItems } from './use_bulk_attack_case_items';
import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT,
} from '../constants';
import { AttacksEventTypes } from '../../../../../common/lib/telemetry';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';

jest.mock('../../../../../common/lib/kibana', () => ({
  useKibana: jest.fn(),
}));
jest.mock('../../../../../attack_discovery/pages/results/take_action/use_add_to_case', () => ({
  useAddToCase: jest.fn(),
}));
jest.mock('@kbn/elastic-assistant', () => ({
  useAssistantContext: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_app_toasts', () => ({
  useAppToasts: jest.fn(),
}));
jest.mock('../../../../../common/hooks/use_experimental_features', () => ({
  useIsExperimentalFeatureEnabled: jest.fn(),
}));

const { useKibana } = jest.requireMock('../../../../../common/lib/kibana') as {
  useKibana: jest.Mock;
};
const { useAddToCase } = jest.requireMock(
  '../../../../../attack_discovery/pages/results/take_action/use_add_to_case'
) as { useAddToCase: jest.Mock };
const { useAssistantContext } = jest.requireMock('@kbn/elastic-assistant') as {
  useAssistantContext: jest.Mock;
};
const { useAppToasts } = jest.requireMock('../../../../../common/hooks/use_app_toasts') as {
  useAppToasts: jest.Mock;
};
const { useIsExperimentalFeatureEnabled } = jest.requireMock(
  '../../../../../common/hooks/use_experimental_features'
) as { useIsExperimentalFeatureEnabled: jest.Mock };

const ALERTS_INDEX = '.alerts-security.alerts-default';
const ATTACK_INDEX = '.alerts-security.attack.discovery.alerts-default';

const attack = {
  id: 'attack-1',
  index: ATTACK_INDEX,
  title: 'A multi-stage attack',
  summaryMarkdown: 'A summary of the attack',
  riskScore: 73,
  alertIds: ['alert-1', 'alert-2'],
};

const attacksToAttach = [attack];

const alertItems: TimelineItem[] = [
  {
    _id: 'attack-1',
    data: [
      { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-1', 'alert-2'] },
      { field: ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT, value: ['markdown 1'] },
    ],
    ecs: { _id: 'attack-1' },
  },
  {
    _id: 'attack-2',
    data: [
      { field: ALERT_ATTACK_DISCOVERY_ALERT_IDS, value: ['alert-2', 'alert-3'] },
      { field: ALERT_ATTACK_DISCOVERY_MARKDOWN_COMMENT, value: ['markdown 2'] },
    ],
    ecs: { _id: 'attack-2' },
  },
];

describe('useBulkAttackCaseItems', () => {
  const onAddToCase = jest.fn();
  const reportEvent = jest.fn();
  const title = 'Attack title';
  let appToastsMock: ReturnType<typeof useAppToastsMock.create>;

  const mockKibana = ({ attachmentsEnabled = true, canCreateComment = true } = {}) => {
    useKibana.mockReturnValue({
      services: {
        telemetry: { reportEvent },
        cases: {
          config: { attachmentsEnabled },
          helpers: {
            canUseCases: jest.fn().mockReturnValue({
              createComment: canCreateComment,
              read: true,
            }),
          },
        },
      },
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appToastsMock = useAppToastsMock.create();
    mockKibana();
    useAssistantContext.mockReturnValue({ alertsIndexPattern: ALERTS_INDEX });
    useAppToasts.mockReturnValue(appToastsMock);
    useIsExperimentalFeatureEnabled.mockReturnValue(false);
    useAddToCase.mockReturnValue({
      disabled: false,
      onAddToCase,
    });
  });

  it('returns one modal-backed case action and no panels', () => {
    const { result } = renderHook(() => useBulkAttackCaseItems({ title }));

    expect(result.current.items).toEqual([
      expect.objectContaining({
        key: 'attack-add-to-case',
        label: 'Add to case',
        'data-test-subj': 'attack-add-to-case',
        icon: 'briefcase',
        onClick: expect.any(Function),
      }),
    ]);
    expect(result.current.panels).toEqual([]);
    expect(useAddToCase).toHaveBeenCalledWith(
      expect.objectContaining({
        title,
      })
    );
  });

  it('returns no case action without permissions', () => {
    mockKibana({ canCreateComment: false });

    const { result } = renderHook(() => useBulkAttackCaseItems({ title }));

    expect(result.current.items).toEqual([]);
  });

  it('opens the selector with unique alert ids and markdown comments', async () => {
    const closePopover = jest.fn();
    const { result } = renderHook(() => useBulkAttackCaseItems({ closePopover, title }));

    await act(async () => {
      await result.current.items[0].onClick?.(alertItems, false, jest.fn(), jest.fn(), jest.fn());
    });

    expect(onAddToCase).toHaveBeenCalledWith({
      alertIds: ['alert-1', 'alert-2', 'alert-3'],
      markdownComments: ['markdown 1', 'markdown 2'],
    });
    expect(closePopover).toHaveBeenCalled();
  });

  it.each([
    { isNewCase: true, action: 'add_to_new_case' },
    { isNewCase: false, action: 'add_to_existing_case' },
  ] as const)(
    'reports $action telemetry after the case is added',
    async ({ isNewCase, action }) => {
      const { result } = renderHook(() =>
        useBulkAttackCaseItems({
          telemetrySource: 'attacks_page_group_take_action',
          title,
        })
      );

      await act(async () => {
        await result.current.items[0].onClick?.(alertItems, false, jest.fn(), jest.fn(), jest.fn());
      });
      expect(reportEvent).not.toHaveBeenCalled();

      const { onSuccess } = useAddToCase.mock.calls[0][0];
      onSuccess({ id: 'case-1' } as CaseUI, isNewCase);

      expect(reportEvent).toHaveBeenCalledWith(AttacksEventTypes.ActionAddedToCase, {
        source: 'attacks_page_group_take_action',
        action,
      });
    }
  );

  describe('when an attack is supplied', () => {
    const attackAlertItems: TimelineItem[] = [alertItems[0]];

    const clickAddToCase = async (props = {}) => {
      const { result } = renderHook(() =>
        useBulkAttackCaseItems({ title, attacksToAttach, ...props })
      );

      await act(async () => {
        await result.current.items[0].onClick?.(
          attackAlertItems,
          false,
          jest.fn(),
          jest.fn(),
          jest.fn()
        );
      });
    };

    const expectedAttachments = [
      {
        type: SECURITY_ATTACK_ATTACHMENT_TYPE,
        attachmentId: 'attack-1',
        metadata: {
          title: 'A multi-stage attack',
          alertCount: 2,
          index: ATTACK_INDEX,
          summaryMarkdown: 'A summary of the attack',
          riskScore: 73,
        },
      },
      {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: ['alert-1', 'alert-2'],
        // The attack that brought these alerts, so removing it later can take them back out.
        metadata: { index: ALERTS_INDEX, sourceAttachmentIds: ['attack-1'] },
      },
    ];

    /**
     * Resolves the attachments the hook builds for a case, the way the case selector does once
     * the user has picked one. `theCase` is undefined on the create-a-new-case path.
     */
    const resolveAttachments = (theCase?: Partial<CaseUI>) => {
      const { getAttachments } = onAddToCase.mock.calls[0][0];
      return getAttachments(theCase as CaseUI);
    };

    /**
     * Plays out an attach to `theCase` the way the case selector does: it builds the payload for
     * the case, posts it, then reports success with the same case.
     */
    const attachTo = (theCase: Partial<CaseUI>, isNewCase = false) => {
      const attachments = resolveAttachments(theCase);
      const { onSuccess } = useAddToCase.mock.lastCall[0];
      onSuccess(theCase as CaseUI, isNewCase);
      return attachments;
    };

    it('posts the attack attachment payload when the flag is on', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      await clickAddToCase();

      expect(onAddToCase).toHaveBeenCalledWith({ getAttachments: expect.any(Function) });
      expect(resolveAttachments({ totalAlerts: 0 })).toEqual(expectedAttachments);
    });

    it('builds the payload for a case created from the flyout, which holds no alerts yet', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      await clickAddToCase();

      expect(resolveAttachments()).toEqual(expectedAttachments);
    });

    it('does not create a markdown user comment when the flag is on', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      await clickAddToCase();

      expect(resolveAttachments({ totalAlerts: 0 })).not.toEqual(
        expect.arrayContaining([expect.objectContaining({ type: COMMENT_ATTACHMENT_TYPE })])
      );
    });

    it('keeps the markdown comment payload when the flag is off', async () => {
      await clickAddToCase();

      expect(onAddToCase).toHaveBeenCalledWith({
        alertIds: ['alert-1', 'alert-2'],
        markdownComments: ['markdown 1'],
      });
    });

    it('keeps the markdown comment payload when the cases attachments framework is off', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);
      mockKibana({ attachmentsEnabled: false });

      await clickAddToCase();

      expect(onAddToCase).toHaveBeenCalledWith({
        alertIds: ['alert-1', 'alert-2'],
        markdownComments: ['markdown 1'],
      });
    });

    it('warns when the attack carries more alerts than a case holds', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);
      const tooManyAlertIds = Array.from(
        { length: MAX_ALERTS_PER_CASE + 5 },
        (_, i) => `alert-${i}`
      );

      await clickAddToCase({ attacksToAttach: [{ ...attack, alertIds: tooManyAlertIds }] });

      const attachments = attachTo({ totalAlerts: 0 });
      expect(attachments).toHaveLength(2);
      expect(attachments[1].attachmentId).toHaveLength(MAX_ALERTS_PER_CASE);
      expect(appToastsMock.addWarning).toHaveBeenCalledTimes(1);
    });

    it('leaves room for the alerts the chosen case already holds', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);
      const tooManyAlertIds = Array.from(
        { length: MAX_ALERTS_PER_CASE + 5 },
        (_, i) => `alert-${i}`
      );

      await clickAddToCase({ attacksToAttach: [{ ...attack, alertIds: tooManyAlertIds }] });

      const attachments = attachTo({ totalAlerts: 10 });
      // Otherwise the case would end up over the limit and the server would reject the attach.
      expect(attachments[1].attachmentId).toHaveLength(MAX_ALERTS_PER_CASE - 10);
      expect(appToastsMock.addWarning).toHaveBeenCalledTimes(1);
    });

    it('drops the alert attachment entirely when the chosen case is already full', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      await clickAddToCase();

      const attachments = attachTo({ totalAlerts: MAX_ALERTS_PER_CASE });
      expect(attachments).toEqual([expectedAttachments[0]]);
      expect(appToastsMock.addWarning).toHaveBeenCalledTimes(1);
    });

    it('truncates against the chosen case, so a case with room takes every alert', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      await clickAddToCase();

      expect(attachTo({ totalAlerts: MAX_ALERTS_PER_CASE - 2 })).toEqual(expectedAttachments);
      expect(appToastsMock.addWarning).not.toHaveBeenCalled();
    });

    it('does not warn before the user has picked a case', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);
      const tooManyAlertIds = Array.from(
        { length: MAX_ALERTS_PER_CASE + 5 },
        (_, i) => `alert-${i}`
      );

      await clickAddToCase({ attacksToAttach: [{ ...attack, alertIds: tooManyAlertIds }] });

      // The selector is only open at this point; nothing is attached and the user can still cancel.
      expect(appToastsMock.addWarning).not.toHaveBeenCalled();
    });

    it('does not warn while the case selector builds the payload to check for duplicates', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);
      const tooManyAlertIds = Array.from(
        { length: MAX_ALERTS_PER_CASE + 5 },
        (_, i) => `alert-${i}`
      );

      await clickAddToCase({ attacksToAttach: [{ ...attack, alertIds: tooManyAlertIds }] });

      // What `useCheckDocumentAttachments` does on every render of the case list: a placeholder
      // case built from the owner alone, with nothing attached.
      resolveAttachments({ owner: 'securitySolution' });
      resolveAttachments({ owner: 'securitySolution' });

      expect(appToastsMock.addWarning).not.toHaveBeenCalled();
    });

    it('warns exactly once when a truncated selection is attached to a new case', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);
      const tooManyAlertIds = Array.from(
        { length: MAX_ALERTS_PER_CASE + 5 },
        (_, i) => `alert-${i}`
      );

      await clickAddToCase({ attacksToAttach: [{ ...attack, alertIds: tooManyAlertIds }] });

      // The selector resolves the payload more than once on the way: for the duplicate check, for
      // the post, and again for its own success toast.
      resolveAttachments({ owner: 'securitySolution' });
      attachTo({ id: 'new-case', owner: 'securitySolution', totalAlerts: 0 }, true);
      resolveAttachments({ owner: 'securitySolution' });

      expect(appToastsMock.addWarning).toHaveBeenCalledTimes(1);
      expect(appToastsMock.addWarning).toHaveBeenCalledWith({
        title: expect.stringContaining(
          `Only ${MAX_ALERTS_PER_CASE} of the ${
            MAX_ALERTS_PER_CASE + 5
          } alerts in this attack were added`
        ),
      });
    });

    it('does not warn when every constituent alert fits', async () => {
      useIsExperimentalFeatureEnabled.mockReturnValue(true);

      await clickAddToCase();
      attachTo({ totalAlerts: 0 });

      expect(appToastsMock.addWarning).not.toHaveBeenCalled();
    });
  });
});
