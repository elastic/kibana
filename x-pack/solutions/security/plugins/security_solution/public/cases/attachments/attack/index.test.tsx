/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { AttachmentActionType, SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { AttackAttachmentPayload } from '../../../../common/cases/attachments/attack';
import { AttackAttachmentPayloadSchema } from '../../../../common/cases/attachments/attack';
import { getAttackAttachment } from '.';
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
    });
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
        indexName: '.alerts-security.attack.discovery.alerts-default',
        attackTitle: 'Credential harvesting on host-1',
        origin: FLYOUT_ORIGIN.CASE_ATTACHMENT,
      })
    );
  });
});
