/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiDatePicker,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { getEbtProps } from '@kbn/ebt-click';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { Moment } from 'moment';
import moment from 'moment';
import {
  KNOWLEDGE_PURGE_CONFIRMATION,
  type KnowledgePurgePreview,
} from '@kbn/nightshift-investigations-plugin/common';
import { NIGHTSHIFT_EBT_ACTIONS, NIGHTSHIFT_EBT_ELEMENTS } from '../../common/ebt_constants';
import { SettingsSectionRow } from './settings_section';
import { usePurgeKnowledge, usePurgePreview } from './use_knowledge_purge';

/** Hours before now the cutoff starts at: long enough to cover a nightly run, short enough to be safe. */
const DEFAULT_CUTOFF_HOURS_AGO = 24;

const PreviewCounts = ({ preview }: { preview: KnowledgePurgePreview }) => {
  const { counts, investigations, investigations_capped: capped } = preview;
  const total =
    counts.memory_pages + counts.cortex_pages + counts.decision_trees + counts.investigations;

  if (total === 0) {
    return (
      <EuiText size="s" data-test-subj="nightshiftPurgePreviewEmpty">
        <p>
          <FormattedMessage
            id="xpack.nightshift.settings.purge.previewEmpty"
            defaultMessage="Nothing was learned after this time. There is nothing to purge."
          />
        </p>
      </EuiText>
    );
  }

  return (
    <EuiText size="s" data-test-subj="nightshiftPurgePreview">
      <ul>
        <li>
          <FormattedMessage
            id="xpack.nightshift.settings.purge.previewMemory"
            defaultMessage="{count, plural, one {# Semantic Memory page} other {# Semantic Memory pages}}"
            values={{ count: counts.memory_pages }}
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.nightshift.settings.purge.previewCortex"
            defaultMessage="{count, plural, one {# Cortex page} other {# Cortex pages}}"
            values={{ count: counts.cortex_pages }}
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.nightshift.settings.purge.previewTrees"
            defaultMessage="{count, plural, one {# decision tree document} other {# decision tree documents}} (heads and versions)"
            values={{ count: counts.decision_trees }}
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.nightshift.settings.purge.previewInvestigations"
            defaultMessage="{count, plural, one {# investigation} other {# investigations}}{capped, select, true { (only the first batch is listed) } other {}}"
            values={{ count: counts.investigations, capped: String(capped) }}
          />
          {investigations.length > 0 && (
            <ul data-test-subj="nightshiftPurgePreviewInvestigations">
              {investigations.slice(0, 5).map(({ id, title }) => (
                <li key={id}>{title}</li>
              ))}
            </ul>
          )}
        </li>
      </ul>
    </EuiText>
  );
};

/**
 * Recovery path after a suspected prompt-injection run: drop everything the investigator wrote
 * to its own knowledge stores after a cutoff, so poisoned pages cannot be recalled again.
 */
export const KnowledgePurgeSection = ({ canManage }: { canManage: boolean }) => {
  const [cutoff, setCutoff] = useState<Moment>(() =>
    moment().subtract(DEFAULT_CUTOFF_HOURS_AGO, 'hours')
  );
  const [isPreviewRequested, setIsPreviewRequested] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const since = cutoff.toISOString();
  const preview = usePurgePreview(isPreviewRequested ? since : undefined);
  const { mutate: purge, isLoading: isPurging } = usePurgeKnowledge();

  const isFuture = cutoff.isAfter(moment());
  const canConfirm = canManage && !isPurging && confirmation === KNOWLEDGE_PURGE_CONFIRMATION;

  const closeModal = () => {
    setIsModalOpen(false);
    setConfirmation('');
  };

  return (
    <>
      <SettingsSectionRow
        data-test-subj="nightshiftKnowledgePurgeSection"
        title={i18n.translate('xpack.nightshift.settings.purge.sectionTitle', {
          defaultMessage: 'Purge knowledge learned after a point in time',
        })}
        description={
          <p>
            <FormattedMessage
              id="xpack.nightshift.settings.purge.scopeDescription"
              defaultMessage="After a suspected prompt injection, permanently delete the investigations, Semantic Memory pages, Cortex pages and decision tree versions in this space that were written after the chosen time. Knowledge written before it is kept. There is no undo."
            />
          </p>
        }
      >
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate('xpack.nightshift.settings.purge.cutoffLabel', {
                defaultMessage: 'Delete everything learned after',
              })}
              isInvalid={isFuture}
              error={
                isFuture
                  ? i18n.translate('xpack.nightshift.settings.purge.cutoffFutureError', {
                      defaultMessage: 'Pick a time in the past.',
                    })
                  : undefined
              }
            >
              <EuiDatePicker
                data-test-subj="nightshiftPurgeCutoffPicker"
                showTimeSelect
                selected={cutoff}
                maxDate={moment()}
                disabled={!canManage}
                onChange={(date) => {
                  if (date) {
                    setCutoff(date);
                    setIsPreviewRequested(false);
                  }
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiButtonEmpty
                data-test-subj="nightshiftPurgePreviewButton"
                size="s"
                iconType="inspect"
                isDisabled={!canManage || isFuture}
                isLoading={isPreviewRequested && preview.isFetching}
                onClick={() => {
                  setIsPreviewRequested(true);
                  preview.refetch();
                }}
                {...getEbtProps({
                  action: NIGHTSHIFT_EBT_ACTIONS.PREVIEW_KNOWLEDGE_PURGE,
                  element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                })}
              >
                <FormattedMessage
                  id="xpack.nightshift.settings.purge.previewButtonLabel"
                  defaultMessage="Preview impact"
                />
              </EuiButtonEmpty>
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow hasEmptyLabelSpace>
              <EuiToolTip
                content={
                  !canManage
                    ? i18n.translate('xpack.nightshift.settings.purge.privilegeTooltip', {
                        defaultMessage:
                          'Purging requires the Nightshift Manage and Configure privileges.',
                      })
                    : undefined
                }
              >
                <span tabIndex={!canManage ? 0 : undefined}>
                  <EuiButton
                    data-test-subj="nightshiftPurgeButton"
                    size="s"
                    color="danger"
                    iconType="trash"
                    isLoading={isPurging}
                    isDisabled={!canManage || isFuture}
                    onClick={() => setIsModalOpen(true)}
                    {...getEbtProps({
                      action: NIGHTSHIFT_EBT_ACTIONS.OPEN_KNOWLEDGE_PURGE_CONFIRMATION,
                      element: NIGHTSHIFT_EBT_ELEMENTS.SETTINGS,
                    })}
                  >
                    <FormattedMessage
                      id="xpack.nightshift.settings.purge.purgeButtonLabel"
                      defaultMessage="Purge knowledge"
                    />
                  </EuiButton>
                </span>
              </EuiToolTip>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        {isPreviewRequested && (
          <>
            <EuiSpacer size="s" />
            {preview.isLoading && <EuiLoadingSpinner size="m" />}
            {preview.isError && (
              <KbnDangerCallout
                announceOnMount
                size="s"
                data-test-subj="nightshiftPurgePreviewError"
                title={i18n.translate('xpack.nightshift.settings.purge.previewErrorTitle', {
                  defaultMessage: 'Could not count what would be deleted',
                })}
              />
            )}
            {preview.data && <PreviewCounts preview={preview.data} />}
          </>
        )}
      </SettingsSectionRow>
      {isModalOpen && (
        <EuiConfirmModal
          data-test-subj="nightshiftPurgeModal"
          aria-label={i18n.translate('xpack.nightshift.settings.purge.confirmAriaLabel', {
            defaultMessage: 'Confirm permanent knowledge purge',
          })}
          title={i18n.translate('xpack.nightshift.settings.purge.confirmTitle', {
            defaultMessage: 'Permanently purge knowledge?',
          })}
          onCancel={closeModal}
          onConfirm={() => {
            closeModal();
            purge({ since });
          }}
          cancelButtonText={i18n.translate('xpack.nightshift.settings.purge.cancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.nightshift.settings.purge.confirmButtonLabel', {
            defaultMessage: 'Purge permanently',
          })}
          confirmButtonDisabled={!canConfirm}
          buttonColor="danger"
          initialFocus="[data-test-subj='nightshiftPurgeConfirmation']"
        >
          <EuiText size="s">
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.purge.confirmScopeDescription"
                defaultMessage="This affects only the current Kibana space. Everything written at or after {cutoff} is permanently deleted:"
                values={{ cutoff: <strong>{cutoff.format('LLL')}</strong> }}
              />
            </p>
            {preview.data ? (
              <PreviewCounts preview={preview.data} />
            ) : (
              <ul>
                <li>
                  <FormattedMessage
                    id="xpack.nightshift.settings.purge.confirmMemory"
                    defaultMessage="Semantic Memory pages and Cortex pages"
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.nightshift.settings.purge.confirmTrees"
                    defaultMessage="Decision tree heads and versions"
                  />
                </li>
                <li>
                  <FormattedMessage
                    id="xpack.nightshift.settings.purge.confirmInvestigations"
                    defaultMessage="Investigation conversations and their rounds"
                  />
                </li>
              </ul>
            )}
            <p>
              <FormattedMessage
                id="xpack.nightshift.settings.purge.notSecureEraseDescription"
                defaultMessage="Deleted documents may still exist in Elasticsearch snapshots, so this is not a secure erase. Purging is best-effort; any failures are reported afterward."
              />
            </p>
          </EuiText>
          <EuiFormRow
            label={i18n.translate('xpack.nightshift.settings.purge.confirmationLabel', {
              defaultMessage: 'Type {confirmation} to confirm',
              values: { confirmation: KNOWLEDGE_PURGE_CONFIRMATION },
            })}
          >
            <EuiFieldText
              data-test-subj="nightshiftPurgeConfirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              maxLength={100}
              disabled={isPurging}
            />
          </EuiFormRow>
        </EuiConfirmModal>
      )}
    </>
  );
};
