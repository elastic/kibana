/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, type ComponentProps } from 'react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiHorizontalRule,
  EuiIllustration,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { peopleChannels } from '@elastic/eui-illustrations';
import {
  AssigneeAvatarStack,
  EscalationCard,
  type EscalationQueueItem,
} from '@kbn/agentic-investigations-common';
import { css } from '@emotion/react';
import { useAlertZeroDocumentationLink } from '../../hooks/use_alertzero_documentation_link';
import { PREVIEW_SLIDES } from '../onboarding/translations';
import { ESCALATIONS_EMPTY_BANNER } from './translations';

// The onboarding "Respond" slide is the queue of items that need a human decision, i.e. escalations;
// its first row supplies the example title.
const [
  {
    items: [EXAMPLE_ITEM],
  },
] = PREVIEW_SLIDES;

const EXAMPLE_AGE_MS = 10 * 60 * 1000;
const EXAMPLE_LINKED_INVESTIGATIONS = 2;

// Demo analysts shown as the assignees of the example card.
const EXAMPLE_ASSIGNEES: ComponentProps<typeof AssigneeAvatarStack>['profiles'] = [
  {
    uid: 'example-jrivera',
    enabled: true,
    user: { username: 'jrivera', full_name: 'Jordan Rivera' },
    data: { avatar: { initials: 'JR', color: '#6DCCB1' } },
  },
  {
    uid: 'example-mokafor',
    enabled: true,
    user: { username: 'mokafor', full_name: 'Maya Okafor' },
    data: { avatar: { initials: 'MO', color: '#F1D86F' } },
  },
];

const renderExampleAssignees = (): React.ReactNode => (
  <AssigneeAvatarStack profiles={EXAMPLE_ASSIGNEES} />
);

/**
 * Shown when there are no open and no closed escalations. A standard EUI empty prompt explaining
 * where escalations come from, followed by a decorative example escalation card.
 */
export const EscalationsEmptyBanner: React.FC = () => {
  const { euiTheme } = useEuiTheme();
  const documentationLink = useAlertZeroDocumentationLink();
  const exampleEscalation = useMemo<EscalationQueueItem>(() => {
    const createdAt = new Date(Date.now() - EXAMPLE_AGE_MS).toISOString();
    return {
      id: 'example',
      agentId: 'example',
      title: EXAMPLE_ITEM.title,
      status: 'open',
      createdAt,
      updatedAt: createdAt,
      linkedInvestigationCount: EXAMPLE_LINKED_INVESTIGATIONS,
      assigneeUids: [],
    };
  }, []);

  return (
    <div
      css={css`
        inline-size: 100%;
      `}
      data-test-subj="alertZeroEscalationsEmptyBanner"
    >
      <EuiEmptyPrompt
        paddingSize="none"
        icon={
          <EuiIllustration
            type={peopleChannels}
            alt=""
            css={css`
              inline-size: 168px;
            `}
            data-test-subj="alertZeroEscalationsEmptyIllustration"
          />
        }
        title={<h2>{ESCALATIONS_EMPTY_BANNER.title}</h2>}
        titleSize="xs"
        body={<p>{ESCALATIONS_EMPTY_BANNER.body}</p>}
        actions={
          documentationLink ? (
            <EuiButtonEmpty
              size="s"
              href={documentationLink}
              target="_blank"
              iconType="external"
              iconSide="right"
              data-test-subj="alertZeroEscalationsEmptyBannerDocsLink"
            >
              {ESCALATIONS_EMPTY_BANNER.docsLink}
            </EuiButtonEmpty>
          ) : undefined
        }
      />
      <EuiSpacer size="xl" />
      {/* Decorative preview of a real escalation card. */}
      <EuiPanel
        hasBorder
        hasShadow={false}
        paddingSize="none"
        aria-hidden="true"
        css={css`
          max-inline-size: 720px;
          margin-inline: auto;
        `}
        data-test-subj="alertZeroEscalationsEmptyBannerExample"
      >
        <div
          css={css`
            padding: ${euiTheme.size.base};
          `}
        >
          <EuiBadge color="hollow">{ESCALATIONS_EMPTY_BANNER.exampleBadge}</EuiBadge>
        </div>
        <EuiHorizontalRule margin="none" />
        <EscalationCard escalation={exampleEscalation} renderAssignees={renderExampleAssignees} />
      </EuiPanel>
    </div>
  );
};
