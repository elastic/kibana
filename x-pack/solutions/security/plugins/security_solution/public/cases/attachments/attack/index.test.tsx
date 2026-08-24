/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { UnifiedReferenceAttachmentViewProps } from '@kbn/cases-plugin/public/client/attachment_framework/types';
import { SECURITY_ATTACK_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common';
import type { AttackAttachmentPayload } from '../../../../common/cases/attachments/attack';
import { AttackAttachmentPayloadSchema } from '../../../../common/cases/attachments/attack';
import { getAttackAttachment } from '.';
import { TestProviders } from '../../../common/mock/test_providers';

type Props = UnifiedReferenceAttachmentViewProps<AttackAttachmentPayload['metadata']>;

const baseProps = {
  caseData: { id: 'case-1', title: 'Case 1' },
  attachmentId: 'attack-id-1',
  metadata: {
    title: 'Credential harvesting on host-1',
    alertCount: 4,
    index: '.alerts-security.attack.discovery.alerts-default',
  },
} as unknown as Props;

describe('Attack attachment', () => {
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
});
