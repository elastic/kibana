/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, type ComponentType } from 'react';
import type {
  CommonAttachmentListViewProps,
  RelatedRemovalChoice,
  UnifiedReferenceAttachmentViewProps,
} from '@kbn/cases-plugin/public';
import { defineAttachment } from '@kbn/cases-plugin/public';
import {
  AttachmentActionType,
  getNonEmptyField,
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common';
import {
  MAX_ALERTS_PER_CASE,
  MAX_BULK_CREATE_ATTACHMENTS,
} from '@kbn/cases-plugin/common/constants';
import { EuiLoadingSpinner } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import {
  getOriginalAlertIds,
  replaceAnonymizedValuesWithOriginalValues,
  type Replacements,
} from '@kbn/elastic-assistant-common';
import type {
  AttackAttachmentMetadata,
  AttackAttachmentPayload,
} from '../../../../common/cases/attachments/attack';
import {
  AttackAttachmentPayloadSchema,
  MAX_ATTACK_DETAILS_MARKDOWN_LENGTH,
  MAX_ATTACK_ENTITY_SUMMARY_MARKDOWN_LENGTH,
  MAX_ATTACK_MITRE_ATTACK_TACTIC_LENGTH,
  MAX_ATTACK_MITRE_ATTACK_TACTICS,
  MAX_ATTACK_SUMMARY_MARKDOWN_LENGTH,
  MAX_ATTACK_TIMESTAMP_LENGTH,
  MAX_ATTACK_TITLE_LENGTH,
} from '../../../../common/cases/attachments/attack';

export type { AttackAttachmentMetadata };

/**
 * An attack to attach, as read from the Attacks table or the attack flyout; its title and
 * narrative fields are still anonymised.
 */
export interface AttackToAttach {
  id: string;
  /** The scheduled or adhoc attack discovery index the document was read from. */
  index: string;
  title: string;
  summaryMarkdown?: string;
  detailsMarkdown?: string;
  entitySummaryMarkdown?: string;
  mitreAttackTactics?: string[];
  timestamp?: string;
  riskScore?: number;
  /** Not stored on the attack document, so only call sites that already have it pass it. */
  entityCount?: number;
  /** Raw `kibana.alert.attack_discovery.alert_ids`, which may still be anonymised. */
  alertIds?: string[];
  replacements?: Replacements;
  /** The index the constituent detection alerts live in. */
  alertsIndex: string;
}

const AttackAttachmentChildrenLazy = React.lazy(() => import('./components/attachment_children'));
const AttackTabContentLazy = React.lazy(() => import('./components/attack_tab_content'));
const ShowAttackButton = React.lazy(async () => {
  const { ShowAttackButton: Component } = await import('./components/show_attack_button');
  return { default: Component };
});
const AttackTabContentWrapper: ComponentType<CommonAttachmentListViewProps> = (props) => (
  <Suspense fallback={null}>
    <AttackTabContentLazy {...props} />
  </Suspense>
);

type AttackAttachmentViewProps = UnifiedReferenceAttachmentViewProps<
  AttackAttachmentPayload['metadata'],
  AttackAttachmentPayload['attachmentId']
>;

const DISPLAY_NAME = i18n.translate('xpack.securitySolution.attackDiscovery.cases.displayName', {
  defaultMessage: 'Attacks',
});

const getAttackCountLabel = (count: number): string =>
  i18n.translate('xpack.securitySolution.attackDiscovery.cases.attacksCount', {
    defaultMessage: '{count, plural, one {# attack} other {# attacks}}',
    values: { count },
  });

const getAttackRelatedRemoval = (count: number): RelatedRemovalChoice => ({
  description: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.relatedRemoval.description',
    {
      defaultMessage:
        'Also remove the alerts {count, plural, one {this attack} other {these attacks}} added to the case? Alerts that also belong to another attack in this case stay.',
      values: { count },
    }
  ),
  removeOnlyLabel: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.relatedRemoval.removeOnlyButtonLabel',
    {
      defaultMessage: 'Remove {count, plural, one {attack} other {attacks}} only',
      values: { count },
    }
  ),
  removeWithRelatedLabel: i18n.translate(
    'xpack.securitySolution.attackDiscovery.cases.relatedRemoval.removeWithAlertsButtonLabel',
    {
      defaultMessage: 'Remove {count, plural, one {attack} other {attacks}} and alerts',
      values: { count },
    }
  ),
});

export const getAttackAttachment = () =>
  defineAttachment({
    id: SECURITY_ATTACK_ATTACHMENT_TYPE,
    getIcon: () => 'securitySignalDetected',
    getLabel: () => DISPLAY_NAME,
    getCountLabel: ({ count }) => getAttackCountLabel(count),
    getRelatedRemoval: ({ count }) => getAttackRelatedRemoval(count),
    schema: AttackAttachmentPayloadSchema,
    getCreationActivity: () => ({
      eventColor: 'subdued' as const,
      event: (
        <FormattedMessage
          id="xpack.securitySolution.attackDiscovery.cases.eventDescription"
          defaultMessage="added an attack"
        />
      ),
      children: AttackAttachmentChildrenLazy,
      getActions: (actionProps: AttackAttachmentViewProps) => {
        const { attachmentId, metadata, savedObjectId } = actionProps;
        if (!metadata) {
          return [];
        }

        return [
          {
            type: AttachmentActionType.CUSTOM as const,
            isPrimary: true,
            render: () => (
              <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                <ShowAttackButton
                  id={savedObjectId}
                  attackId={attachmentId}
                  indexName={metadata.index}
                  attackTitle={metadata.title}
                />
              </Suspense>
            ),
          },
        ];
      },
    }),
    getRemovalActivity: () => ({
      event: (
        <FormattedMessage
          id="xpack.securitySolution.attackDiscovery.cases.removalEventDescription"
          defaultMessage="removed an attack"
        />
      ),
    }),
    // Renders attacks as a section of the shared Attachments tab rather than a tab of their own.
    getAttachmentList: () => ({
      children: AttackTabContentWrapper,
    }),
    workflow: {
      getActivityLabel: ({ workflowName, count }) => (
        <FormattedMessage
          id="xpack.securitySolution.attackDiscovery.cases.workflowActivityLabel"
          defaultMessage="ran {name} on {count, plural, =0 {an attack} one {# attack} other {# attacks}}"
          values={{ name: workflowName, count: count ?? 0 }}
        />
      ),
    },
    getDocumentAction: ({ id, documentId, index }) => {
      const documentIndex = getNonEmptyField(index);
      // Workflow origins carry no attack title, so the flyout history shows its generic label.
      return documentIndex
        ? {
            type: AttachmentActionType.CUSTOM as const,
            isPrimary: true,
            render: () => (
              <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                <ShowAttackButton id={id} attackId={documentId} indexName={documentIndex} />
              </Suspense>
            ),
          }
        : null;
    },
  });

const FIELD_TOKEN_OPEN = '{{';
const FIELD_TOKEN_CLOSE = '}}';

/** Truncates without splitting a `{{ field value }}` token, which renders as literal braces. */
const truncate = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) {
    return value;
  }

  const truncated = value.slice(0, maxLength);
  const tokenStart = truncated.lastIndexOf(FIELD_TOKEN_OPEN);
  const isCutMidToken = tokenStart !== -1 && !truncated.includes(FIELD_TOKEN_CLOSE, tokenStart);

  if (!isCutMidToken) {
    return truncated;
  }

  const previousTokenEnd = truncated.lastIndexOf(FIELD_TOKEN_CLOSE, tokenStart);

  // Nothing complete to fall back to: drop the opening braces rather than emit an unclosed token.
  return previousTokenEnd === -1
    ? truncated.slice(0, tokenStart)
    : truncated.slice(0, previousTokenEnd + FIELD_TOKEN_CLOSE.length);
};

/** De-anonymises then truncates a narrative field, leaving an absent field `undefined`. */
const snapshotNarrative = (
  value: string | undefined,
  replacements: Replacements | undefined,
  maxLength: number
): string | undefined =>
  value == null
    ? undefined
    : truncate(
        replaceAnonymizedValuesWithOriginalValues({ messageContent: value, replacements }),
        maxLength
      );

/** The `security.attack` attachment as posted to a case; the cases UI injects the `owner`. */
export type AttackAttachmentWithoutOwner = Omit<AttackAttachmentPayload, 'owner'>;

/** An attack's alerts in one attachment; Cases applies the scalar `index` to every id. */
export interface AlertAttachmentWithoutOwner {
  type: typeof SECURITY_ALERT_ATTACHMENT_TYPE;
  attachmentId: string[];
  metadata: { index: string; sourceAttachmentIds: string[] };
}

/** How many attacks one add-to-case may carry; each attack takes two bulk-create attachments. */
export const MAX_ATTACKS_PER_ATTACH = Math.floor(MAX_BULK_CREATE_ATTACHMENTS / 2);

/** The attachments to post to a case, plus what had to be dropped to build them. */
export interface AttackAttachmentsResult {
  /** Per attack, its `security.attack` attachment then, if any fit, its `security.alert` one. */
  attachments: Array<AttackAttachmentWithoutOwner | AlertAttachmentWithoutOwner>;
  /** All constituent alerts, counting a shared alert once per attack as the case limit does. */
  alertCount: number;
  /** How many alert ids the alert attachments carry — at most `MAX_ALERTS_PER_CASE`. */
  attachedAlertCount: number;
  /** True when some of the constituent alerts had to be left off. */
  truncated: boolean;
  /** How many attacks were asked for, counting any left off. */
  attackCount: number;
  /** How many `security.attack` attachments were built — at most `MAX_ATTACKS_PER_ATTACH`. */
  attachedAttackCount: number;
  /** True when some of the attacks themselves had to be left off. */
  attacksTruncated: boolean;
}

/** Options narrowing what {@link buildAttackAttachments} may put in the alert attachment. */
export interface BuildAttackAttachmentsOptions {
  /** The target case's remaining alert budget; defaults to `MAX_ALERTS_PER_CASE`. */
  maxAlerts?: number;
}

/** De-anonymises before deduping, since distinct anonymised ids can resolve to the same alert. */
const getDistinctOriginalAlertIds = ({ alertIds, replacements }: AttackToAttach): string[] => [
  ...new Set(getOriginalAlertIds({ alertIds: alertIds ?? [], replacements })),
];

/** Builds one attack's attachment, de-anonymised as the activity card has no `replacements`. */
const buildAttackAttachment = (attack: AttackToAttach): AttackAttachmentWithoutOwner => {
  const {
    id,
    index,
    title,
    summaryMarkdown,
    detailsMarkdown,
    entitySummaryMarkdown,
    mitreAttackTactics,
    timestamp,
    riskScore,
    entityCount,
    replacements,
  } = attack;

  const snapshot = {
    summaryMarkdown: snapshotNarrative(
      summaryMarkdown,
      replacements,
      MAX_ATTACK_SUMMARY_MARKDOWN_LENGTH
    ),
    detailsMarkdown: snapshotNarrative(
      detailsMarkdown,
      replacements,
      MAX_ATTACK_DETAILS_MARKDOWN_LENGTH
    ),
    entitySummaryMarkdown: snapshotNarrative(
      entitySummaryMarkdown,
      replacements,
      MAX_ATTACK_ENTITY_SUMMARY_MARKDOWN_LENGTH
    ),
  };

  return {
    type: SECURITY_ATTACK_ATTACHMENT_TYPE,
    attachmentId: id,
    metadata: {
      title: truncate(
        replaceAnonymizedValuesWithOriginalValues({ messageContent: title, replacements }),
        MAX_ATTACK_TITLE_LENGTH
      ),
      // Can exceed the alert ids actually attached when the case's alert budget runs out.
      alertCount: getDistinctOriginalAlertIds(attack).length,
      // Used by status sync, the flyout and authorization; the duplicate check matches on id alone.
      index,
      ...(snapshot.summaryMarkdown != null ? { summaryMarkdown: snapshot.summaryMarkdown } : {}),
      ...(snapshot.detailsMarkdown != null ? { detailsMarkdown: snapshot.detailsMarkdown } : {}),
      ...(snapshot.entitySummaryMarkdown != null
        ? { entitySummaryMarkdown: snapshot.entitySummaryMarkdown }
        : {}),
      ...(mitreAttackTactics != null
        ? {
            mitreAttackTactics: mitreAttackTactics
              .slice(0, MAX_ATTACK_MITRE_ATTACK_TACTICS)
              .map((tactic) => truncate(tactic, MAX_ATTACK_MITRE_ATTACK_TACTIC_LENGTH)),
          }
        : {}),
      ...(timestamp != null ? { timestamp: truncate(timestamp, MAX_ATTACK_TIMESTAMP_LENGTH) } : {}),
      ...(riskScore != null ? { riskScore } : {}),
      ...(entityCount != null ? { entityCount } : {}),
    } satisfies AttackAttachmentMetadata,
  };
};

/**
 * Builds each attack's attachment followed by its own alert attachment, which is kept per attack
 * because an alert attachment can only be deleted whole.
 */
export const buildAttacksAttachments = (
  attacks: ReadonlyArray<AttackToAttach | undefined>,
  { maxAlerts = MAX_ALERTS_PER_CASE }: BuildAttackAttachmentsOptions = {}
): AttackAttachmentsResult => {
  const attachableAttacks = attacks.filter((attack): attack is AttackToAttach => !!attack?.id);
  const attachedAttacks = attachableAttacks.slice(0, MAX_ATTACKS_PER_ATTACH);

  // One budget across all attacks, so the caller can report what was left off instead of the
  // server rejecting the whole attach.
  let alertSlots = Math.min(MAX_ALERTS_PER_CASE, Math.max(0, maxAlerts));
  let alertCount = 0;
  let attachedAlertCount = 0;
  const attachments: Array<AttackAttachmentWithoutOwner | AlertAttachmentWithoutOwner> = [];

  for (const attack of attachedAttacks) {
    const originalAlertIds = getDistinctOriginalAlertIds(attack);
    // Spent in selection order so an earlier attack keeps its alerts whole.
    const attachedAlertIds = originalAlertIds.slice(0, alertSlots);

    alertCount += originalAlertIds.length;
    attachedAlertCount += attachedAlertIds.length;
    alertSlots -= attachedAlertIds.length;

    attachments.push(buildAttackAttachment(attack));

    if (attachedAlertIds.length > 0) {
      attachments.push({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: attachedAlertIds,
        // Records the attack that brought these alerts, so removing it can take them along.
        metadata: { index: attack.alertsIndex, sourceAttachmentIds: [attack.id] },
      });
    }
  }

  return {
    attachments,
    alertCount,
    attachedAlertCount,
    truncated: alertCount > attachedAlertCount,
    attackCount: attachableAttacks.length,
    attachedAttackCount: attachedAttacks.length,
    attacksTruncated: attachableAttacks.length > attachedAttacks.length,
  };
};

/** {@link buildAttacksAttachments} for a single attack. */
export const buildAttackAttachments = (
  attack: AttackToAttach,
  options?: BuildAttackAttachmentsOptions
): AttackAttachmentsResult => buildAttacksAttachments([attack], options);
