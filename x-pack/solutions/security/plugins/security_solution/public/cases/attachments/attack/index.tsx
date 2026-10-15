/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, type ComponentType } from 'react';
import type {
  CaseAttachmentsWithoutOwner,
  CommonAttachmentListViewProps,
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
 * The attack a call site is attaching, normalised out of whichever surface it came from — the
 * Attacks page table row or the attack flyout.
 */
export interface AttackToAttach {
  /** The attack document `_id`. */
  id: string;
  /**
   * The index the attack document came from — either the scheduled
   * (`.alerts-security.attack.discovery.alerts-*`) or the adhoc
   * (`.adhoc.alerts-security.attack.discovery.alerts-*`) index. Both are attachable; the caller
   * passes whichever the document was read from so the distinction is preserved.
   */
  index: string;
  /**
   * The attack's plain-text title, as it sits on the document — still anonymised. De-anonymised
   * and truncated to the schema bound when it is snapshotted.
   */
  title: string;
  /**
   * The attack's summary markdown, still anonymised. De-anonymised and truncated when
   * snapshotted.
   */
  summaryMarkdown?: string;
  /**
   * The attack's details markdown, still anonymised. De-anonymised and truncated when
   * snapshotted.
   */
  detailsMarkdown?: string;
  /**
   * The attack's one-line entity summary markdown, still anonymised. De-anonymised and truncated
   * when snapshotted.
   */
  entitySummaryMarkdown?: string;
  /** The MITRE ATT&CK tactic names the attack maps to, rendered as the attack chain. */
  mitreAttackTactics?: string[];
  /** The time the attack was generated, rendered as the card's "Detected on" line. */
  timestamp?: string;
  /** The attack's risk score. The attack document has no `severity`. */
  riskScore?: number;
  /**
   * Distinct entity count for the attack. Not stored on the attack document and not cheap to
   * derive (two cardinality aggregations), so call sites that already have it pass it and the
   * rest leave it out — the metadata field is optional.
   */
  entityCount?: number;
  /** Raw `kibana.alert.attack_discovery.alert_ids`, which may still be anonymised. */
  alertIds?: string[];
  /** `kibana.alert.attack_discovery.replacements`, used to reverse the anonymisation. */
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
const RemoveAttackCardAction = React.lazy(async () => {
  const { RemoveAttackCardAction: Component } = await import(
    './components/remove_attack_card_action'
  );
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

export const getAttackAttachment = () =>
  defineAttachment({
    id: SECURITY_ATTACK_ATTACHMENT_TYPE,
    getIcon: () => 'securitySignalDetected',
    getLabel: () => DISPLAY_NAME,
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
      // The framework's own trash action removes the attack attachment on its own. Attacks bring
      // their constituent alerts onto the case with them, so removal is registered here instead,
      // to offer to take those alerts back off — see `resolveRemovableAlertAttachments` for which
      // of them are actually the attack's to remove.
      hideDefaultActions: true,
      getActions: (actionProps: AttackAttachmentViewProps) => {
        const { attachmentId, caseData, metadata, permissions, savedObjectId } = actionProps;
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
          ...(permissions.delete
            ? [
                {
                  type: AttachmentActionType.CUSTOM as const,
                  isPrimary: true,
                  render: () => (
                    <Suspense fallback={<EuiLoadingSpinner size="m" />}>
                      <RemoveAttackCardAction
                        attackId={attachmentId}
                        attackTitle={metadata.title}
                        caseId={caseData.id}
                        savedObjectId={savedObjectId}
                      />
                    </Suspense>
                  ),
                },
              ]
            : []),
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
    // Exposing `children` here is what makes attacks their own section in the consolidated
    // Attachments tab, contributes to the tab badge, and adds the type filter entry — no new
    // tab is registered.
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
      // The workflow origin carries only the attack's id and index, so the flyout history entry
      // falls back to its generic label rather than the attack title.
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

/**
 * Truncates to `maxLength` without ever cutting inside a `{{ field value }}` token — a half a
 * token renders as literal braces in the markdown formatter, so the cut falls back to the end of
 * the last complete token before the bound.
 */
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

/**
 * De-anonymises then truncates one narrative field, so the snapshot holds text the activity card
 * can render with no `replacements` map. Returns `undefined` for an absent field so it stays out
 * of the metadata rather than being persisted as an empty string.
 */
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

/** The `security.attack` attachment as posted to a case — the cases UI injects the `owner`. */
export type AttackAttachmentWithoutOwner = Omit<AttackAttachmentPayload, 'owner'>;

/**
 * The attack's constituent alerts, batched into one attachment the way the alerts table batches
 * a bulk add, so the case activity log gets a single "added N alerts" entry rather than one entry
 * per alert.
 *
 * `metadata.index` stays a scalar: the Cases platform broadcasts a scalar index across every id,
 * and every alert an attack comprises comes from the same alerts index pattern. An array would
 * have to pair 1-to-1 with the ids, repeating the same string up to `MAX_ALERTS_PER_CASE` times.
 */
export interface AlertAttachmentWithoutOwner {
  type: typeof SECURITY_ALERT_ATTACHMENT_TYPE;
  attachmentId: string[];
  metadata: { index: string };
}

/**
 * How many attacks one add-to-case may carry. A bulk create takes at most
 * `MAX_BULK_CREATE_ATTACHMENTS` attachments, and each attack contributes two of them — itself
 * and the alert attachment holding its constituent alerts.
 */
export const MAX_ATTACKS_PER_ATTACH = Math.floor(MAX_BULK_CREATE_ATTACHMENTS / 2);

/** The attachments to post to a case, plus what had to be dropped to build them. */
export interface AttackAttachmentsResult {
  /**
   * Per attack, its `security.attack` attachment followed by the `security.alert` attachment
   * holding its constituent alert ids. The alert attachment is absent for an attack with no
   * alerts, or one the case had no room left for.
   *
   * Typed narrower than the framework's `CaseAttachmentsWithoutOwner` union so callers and tests
   * can reach `metadata` without re-narrowing; assignability to the framework type is checked by
   * {@link generateAttackAttachmentsWithoutOwner}.
   */
  attachments: Array<AttackAttachmentWithoutOwner | AlertAttachmentWithoutOwner>;
  /**
   * The attacks' full de-anonymised count of constituent alerts, counting an alert once per
   * attack that comprises it, as the case's own limit does.
   */
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
  /**
   * How many alert ids the alert attachment may carry, which is the target case's remaining
   * alert budget: `MAX_ALERTS_PER_CASE` minus the alerts it already holds. Clamped into
   * `[0, MAX_ALERTS_PER_CASE]`. Defaults to the full budget, i.e. an empty case.
   */
  maxAlerts?: number;
}

/**
 * The de-anonymised, deduplicated ids of the alerts one attack comprises, in the order the attack
 * lists them. Distinct anonymised ids can resolve to the same original alert, so de-anonymise
 * before deduping or duplicates survive.
 */
const getDistinctOriginalAlertIds = ({ alertIds, replacements }: AttackToAttach): string[] => [
  ...new Set(getOriginalAlertIds({ alertIds: alertIds ?? [], replacements })),
];

/**
 * Builds the `security.attack` attachment for one attack: the metadata snapshot the activity card
 * and the preview card render from.
 *
 * The narrative fields are de-anonymised here, once, so nothing downstream of the attachment
 * needs the attack's `replacements` map.
 */
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

  // Snapshot the narrative de-anonymised: the activity card renders straight from metadata and
  // is never handed a replacements map, so anything left anonymised here stays that way on screen.
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
      // The attack's own alert count, which is what the preview card means by "alerts" — it can
      // exceed the number of ids actually attached when the batch below was capped.
      alertCount: getDistinctOriginalAlertIds(attack).length,
      // Tells status sync which index to write the attack's status to, lets the flyout reopen
      // the attack document, and is what authorization checks resolve the attack against.
      // Note the "already attached" duplicate check matches on the attack id alone.
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
 * Builds the attachments for attaching one or more attacks to a case: for each attack, a
 * `security.attack` attachment carrying the metadata snapshot the activity card renders from,
 * followed by its own `security.alert` attachment holding its de-anonymised constituent alert
 * ids.
 *
 * The constituent alerts are always included — attaching an attack means attaching the alerts it
 * comprises, so there is no at-attach-time choice about them. They go in one attachment per
 * attack, rather than one merged attachment for the whole selection, because an alert attachment
 * can only be deleted whole: a merged one belongs to no single attack, so removing an attack
 * could not take its alerts with it. The cost is one "added N alerts" activity entry per attack
 * instead of one for the batch, and an alert shared by two selected attacks being attached — and
 * counted against the case's limit — once for each.
 *
 * Attacks with no id are skipped. Both the attacks and their alerts are capped — at
 * `MAX_ATTACKS_PER_ATTACH` and at the case's remaining alert budget — by taking them in the order
 * given, so an earlier attack keeps its alerts whole rather than every attack losing some. The
 * counts come back alongside the attachments so the caller can warn about whatever was left off.
 * Use {@link generateAttackAttachmentsWithoutOwner} where that reporting isn't needed.
 *
 * @param attacks the attacks we're attaching to a case, in the order they should be attached
 * @param options how many alert ids the target case still has room for
 */
export const buildAttacksAttachments = (
  attacks: ReadonlyArray<AttackToAttach | undefined>,
  { maxAlerts = MAX_ALERTS_PER_CASE }: BuildAttackAttachmentsOptions = {}
): AttackAttachmentsResult => {
  const attachableAttacks = attacks.filter((attack): attack is AttackToAttach => !!attack?.id);
  // One bulk create carries a bounded number of attachments, so take the attacks in selection
  // order and leave the rest for the caller to report.
  const attachedAttacks = attachableAttacks.slice(0, MAX_ATTACKS_PER_ATTACH);

  // A case holds at most MAX_ALERTS_PER_CASE alerts in total, counting the ones it already has
  // and counting an alert once per attachment that references it, so draw every attack's alerts
  // from one shared budget and let the caller surface what was left off rather than having the
  // server reject the whole attach.
  let alertSlots = Math.min(MAX_ALERTS_PER_CASE, Math.max(0, maxAlerts));
  let alertCount = 0;
  let attachedAlertCount = 0;
  const attachments: Array<AttackAttachmentWithoutOwner | AlertAttachmentWithoutOwner> = [];

  for (const attack of attachedAttacks) {
    const originalAlertIds = getDistinctOriginalAlertIds(attack);
    // Spent in selection order, so an earlier attack keeps its alerts whole and a later one goes
    // without, rather than every attack in the selection losing some of its evidence.
    const attachedAlertIds = originalAlertIds.slice(0, alertSlots);

    alertCount += originalAlertIds.length;
    attachedAlertCount += attachedAlertIds.length;
    alertSlots -= attachedAlertIds.length;

    attachments.push(buildAttackAttachment(attack));

    if (attachedAlertIds.length > 0) {
      attachments.push({
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: attachedAlertIds,
        // The index is what makes the duplicate check and status sync work for these alerts too.
        metadata: { index: attack.alertsIndex },
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

/**
 * {@link buildAttacksAttachments} for the single-attack case. Returns no attachments when the
 * attack has no id.
 *
 * @param attack the attack we're attaching to a case
 * @param options how many alert ids the target case still has room for
 */
export const buildAttackAttachments = (
  attack: AttackToAttach,
  options?: BuildAttackAttachmentsOptions
): AttackAttachmentsResult => buildAttacksAttachments([attack], options);

/**
 * {@link buildAttackAttachments} narrowed to the cases-framework "without owner" payload — the
 * cases UI injects the `owner` at creation time, so callers hand the attachments over without it.
 * Returns an empty array when the attack has no id.
 *
 * @param attack the attack we're attaching to a case
 */
export const generateAttackAttachmentsWithoutOwner = (
  attack: AttackToAttach
): CaseAttachmentsWithoutOwner => buildAttackAttachments(attack).attachments;
