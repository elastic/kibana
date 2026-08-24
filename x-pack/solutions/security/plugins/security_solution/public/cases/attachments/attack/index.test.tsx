/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import {
  AttachmentActionType,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import { MAX_ALERTS_PER_CASE } from '@kbn/cases-plugin/common/constants';
import type { AttackAttachmentPayload } from '../../../../common/cases/attachments/attack';
import { AttackAttachmentPayloadSchema } from '../../../../common/cases/attachments/attack';
import {
  buildAttackAttachments,
  generateAttackAttachmentsWithoutOwner,
  getAttackAttachment,
  type AttackToAttach,
} from '.';
import { TestProviders } from '../../../common/mock/test_providers';
import { useFlyoutApi } from '../../../flyout_v2/use_flyout_api';
import { createFlyoutApiMock } from '../../../flyout_v2/use_flyout_api.mock';
import { useIsNewFlyoutEnabled } from '../../../common/hooks/use_is_new_flyout_enabled';
import { FLYOUT_ORIGIN } from '../../../common/lib/telemetry';

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: () => ({ openFlyout: jest.fn() }),
}));
jest.mock('../../../flyout_v2/use_flyout_api');
jest.mock('../../../common/hooks/use_is_new_flyout_enabled');

type Props = UnifiedReferenceAttachmentViewProps<AttackAttachmentPayload['metadata']>;

const baseProps = {
  caseData: { id: 'case-1', title: 'Case 1' },
  savedObjectId: 'so-1',
  attachmentId: 'attack-id-1',
  metadata: {
    title: 'Credential harvesting on host-1',
    alertCount: 4,
    index: '.alerts-security.attack.discovery.alerts-default',
  },
} as unknown as Props;

describe('Attack attachment', () => {
  let flyoutApi: ReturnType<typeof createFlyoutApiMock>;

  beforeEach(() => {
    jest.clearAllMocks();
    flyoutApi = createFlyoutApiMock();
    jest.mocked(useFlyoutApi).mockReturnValue(flyoutApi);
    jest.mocked(useIsNewFlyoutEnabled).mockReturnValue(true);
  });

  it('creates the attachment type correctly', () => {
    const attackType = getAttackAttachment();

    expect(attackType.getIcon({} as Props)).toBe('securitySignalDetected');
    expect(attackType.getLabel()).toBe('Attacks');
    expect(attackType).toStrictEqual({
      id: SECURITY_ATTACK_ATTACHMENT_TYPE,
      getIcon: expect.any(Function),
      getLabel: expect.any(Function),
      schema: AttackAttachmentPayloadSchema,
      getCreationActivity: expect.any(Function),
      getAttachmentList: expect.any(Function),
    });
  });

  it('exposes an attachments list view so attacks get their own section in the Attachments tab', () => {
    const attackType = getAttackAttachment();

    expect(attackType.getAttachmentList?.()?.children).toBeDefined();
  });

  it('renders the activity event text correctly', () => {
    const attackType = getAttackAttachment();
    const { event } = attackType.getCreationActivity(baseProps);

    render(<TestProviders>{event}</TestProviders>);

    expect(screen.getByText('added an attack')).toBeInTheDocument();
  });

  it('renders the preview card lazily from metadata only', async () => {
    const attackType = getAttackAttachment();
    const { children: Children } = attackType.getCreationActivity(baseProps);

    expect(Children).toBeDefined();

    render(
      <TestProviders>
        <React.Suspense fallback={null}>
          {Children ? <Children {...baseProps} /> : null}
        </React.Suspense>
      </TestProviders>
    );

    expect(await screen.findByText('Credential harvesting on host-1')).toBeInTheDocument();
  });

  it('exposes the show attack button as a primary custom action', () => {
    const attackType = getAttackAttachment();
    const actions = attackType.getCreationActivity(baseProps).getActions?.(baseProps) ?? [];

    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual(
      expect.objectContaining({ type: AttachmentActionType.CUSTOM, isPrimary: true })
    );
  });

  it('returns no actions when the metadata is missing', () => {
    const attackType = getAttackAttachment();
    const propsWithoutMetadata = { ...baseProps, metadata: undefined };

    expect(
      attackType.getCreationActivity(propsWithoutMetadata).getActions?.(propsWithoutMetadata)
    ).toEqual([]);
  });

  it('opens the attack flyout with the attachment id when the action is clicked', async () => {
    const attackType = getAttackAttachment();
    const actions = attackType.getCreationActivity(baseProps).getActions?.(baseProps) ?? [];
    const action = actions[0];

    render(
      <TestProviders>
        {action.type === AttachmentActionType.CUSTOM && action.render()}
      </TestProviders>
    );

    fireEvent.click(await screen.findByTestId('comment-action-show-attack-so-1'));

    await waitFor(() =>
      expect(flyoutApi.openAttackFlyout).toHaveBeenCalledWith({
        attackId: 'attack-id-1',
        // The snapshotted index is normalised to a pattern the user can read.
        indexName: '.alerts-security.attack.discovery.alerts-*',
        attackTitle: 'Credential harvesting on host-1',
        origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      })
    );
  });
});

const ATTACK_INDEX = '.alerts-security.attack.discovery.alerts-default';
const ADHOC_ATTACK_INDEX = '.adhoc.alerts-security.attack.discovery.alerts-default';
const ALERTS_INDEX = '.alerts-security.alerts-default';

const attackToAttach = (overrides: Partial<AttackToAttach> = {}): AttackToAttach => ({
  id: 'attack-id-1',
  index: ATTACK_INDEX,
  title: 'Credential harvesting on host-1',
  summaryMarkdown: 'An adversary harvested credentials from `host-1`.',
  riskScore: 73,
  alertsIndex: ALERTS_INDEX,
  ...overrides,
});

describe('buildAttackAttachments', () => {
  it('returns the attack attachment first, then one alert attachment per alert', () => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({ alertIds: ['alert-1', 'alert-2'] })
    );

    expect(attachments).toHaveLength(3);
    expect(attachments[0]).toEqual({
      type: SECURITY_ATTACK_ATTACHMENT_TYPE,
      attachmentId: 'attack-id-1',
      metadata: {
        title: 'Credential harvesting on host-1',
        summaryMarkdown: 'An adversary harvested credentials from `host-1`.',
        riskScore: 73,
        alertCount: 2,
        index: ATTACK_INDEX,
      },
    });
    expect(attachments.slice(1)).toEqual([
      {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: { index: ALERTS_INDEX },
      },
      {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-2',
        metadata: { index: ALERTS_INDEX },
      },
    ]);
  });

  it('builds a payload that satisfies the registered attack attachment schema', () => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({ alertIds: ['alert-1'], entityCount: 3 })
    );

    expect(
      AttackAttachmentPayloadSchema.safeParse({ ...attachments[0], owner: 'securitySolution' })
        .success
    ).toBe(true);
  });

  it('de-anonymises the alert ids via the attack replacements', () => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({
        alertIds: ['anonymised-1', 'anonymised-2'],
        replacements: { 'anonymised-1': 'original-1', 'anonymised-2': 'original-2' },
      })
    );

    expect(attachments.slice(1).map((attachment) => attachment.attachmentId)).toEqual([
      'original-1',
      'original-2',
    ]);
  });

  it('leaves ids with no replacement untouched', () => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({
        alertIds: ['anonymised-1', 'not-anonymised'],
        replacements: { 'anonymised-1': 'original-1' },
      })
    );

    expect(attachments.slice(1).map((attachment) => attachment.attachmentId)).toEqual([
      'original-1',
      'not-anonymised',
    ]);
  });

  it('dedupes after de-anonymising, so two anonymised ids for one alert collapse', () => {
    const { attachments, alertCount } = buildAttackAttachments(
      attackToAttach({
        alertIds: ['anonymised-1', 'anonymised-2', 'anonymised-1'],
        replacements: { 'anonymised-1': 'original-1', 'anonymised-2': 'original-1' },
      })
    );

    expect(attachments.slice(1).map((attachment) => attachment.attachmentId)).toEqual([
      'original-1',
    ]);
    expect(alertCount).toBe(1);
  });

  it('sets metadata.alertCount to the deduplicated de-anonymised alert count', () => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({ alertIds: ['alert-1', 'alert-2', 'alert-1'] })
    );

    expect(attachments[0].metadata).toEqual(
      expect.objectContaining({ alertCount: 2, index: ATTACK_INDEX })
    );
  });

  it.each([
    ['scheduled', ATTACK_INDEX],
    ['adhoc', ADHOC_ATTACK_INDEX],
  ])('records the %s attack index in the metadata', (_label, index) => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({ index, alertIds: ['alert-1'] })
    );

    expect(attachments[0].metadata).toEqual(expect.objectContaining({ index }));
  });

  it('returns only the attack attachment when the attack has no alert ids', () => {
    const { attachments, alertCount, truncated } = buildAttackAttachments(attackToAttach());

    expect(attachments).toHaveLength(1);
    expect(attachments[0].type).toBe(SECURITY_ATTACK_ATTACHMENT_TYPE);
    expect(attachments[0].metadata).toEqual(expect.objectContaining({ alertCount: 0 }));
    expect(alertCount).toBe(0);
    expect(truncated).toBe(false);
  });

  it('returns only the attack attachment when the alert ids are an empty array', () => {
    const { attachments } = buildAttackAttachments(attackToAttach({ alertIds: [] }));

    expect(attachments).toHaveLength(1);
  });

  it('caps the alert attachments at MAX_ALERTS_PER_CASE and reports the truncation', () => {
    const alertIds = Array.from({ length: MAX_ALERTS_PER_CASE + 5 }, (_, i) => `alert-${i}`);

    const { attachments, alertCount, attachedAlertCount, truncated } = buildAttackAttachments(
      attackToAttach({ alertIds })
    );

    expect(attachments).toHaveLength(MAX_ALERTS_PER_CASE + 1);
    expect(attachedAlertCount).toBe(MAX_ALERTS_PER_CASE);
    expect(truncated).toBe(true);
    // The metadata keeps the attack's real alert count even though fewer alerts were attached.
    expect(alertCount).toBe(MAX_ALERTS_PER_CASE + 5);
    expect(attachments[0].metadata).toEqual(
      expect.objectContaining({ alertCount: MAX_ALERTS_PER_CASE + 5 })
    );
  });

  it('does not report truncation when the alert count is exactly at the cap', () => {
    const alertIds = Array.from({ length: MAX_ALERTS_PER_CASE }, (_, i) => `alert-${i}`);

    const { attachedAlertCount, truncated } = buildAttackAttachments(attackToAttach({ alertIds }));

    expect(attachedAlertCount).toBe(MAX_ALERTS_PER_CASE);
    expect(truncated).toBe(false);
  });

  it('omits the optional metadata fields the caller did not supply', () => {
    const { attachments } = buildAttackAttachments({
      id: 'attack-id-1',
      index: ATTACK_INDEX,
      title: 'Credential harvesting on host-1',
      alertsIndex: ALERTS_INDEX,
    });

    expect(attachments[0].metadata).toEqual({
      title: 'Credential harvesting on host-1',
      alertCount: 0,
      index: ATTACK_INDEX,
    });
  });

  it('includes the entity count when the caller already resolved it', () => {
    const { attachments } = buildAttackAttachments(attackToAttach({ entityCount: 0 }));

    expect(attachments[0].metadata).toEqual(expect.objectContaining({ entityCount: 0 }));
  });

  it('truncates the title and summary to the schema bounds', () => {
    const { attachments } = buildAttackAttachments(
      attackToAttach({ title: 'a'.repeat(1200), summaryMarkdown: 'b'.repeat(3000) })
    );

    const metadata = attachments[0].metadata as { title: string; summaryMarkdown: string };
    expect(metadata.title).toHaveLength(1000);
    expect(metadata.summaryMarkdown).toHaveLength(2048);
    expect(
      AttackAttachmentPayloadSchema.safeParse({ ...attachments[0], owner: 'securitySolution' })
        .success
    ).toBe(true);
  });

  it('returns nothing when the attack has no id', () => {
    const { attachments, alertCount, truncated } = buildAttackAttachments(
      attackToAttach({ id: '', alertIds: ['alert-1'] })
    );

    expect(attachments).toEqual([]);
    expect(alertCount).toBe(0);
    expect(truncated).toBe(false);
  });
});

describe('generateAttackAttachmentsWithoutOwner', () => {
  it('returns just the attachments array', () => {
    const attack = attackToAttach({ alertIds: ['alert-1'] });

    expect(generateAttackAttachmentsWithoutOwner(attack)).toEqual(
      buildAttackAttachments(attack).attachments
    );
  });

  it('returns an empty array when the attack has no id', () => {
    expect(generateAttackAttachmentsWithoutOwner(attackToAttach({ id: '' }))).toEqual([]);
  });
});
