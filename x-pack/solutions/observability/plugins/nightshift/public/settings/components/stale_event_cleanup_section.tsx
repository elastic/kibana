/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useCleanupStaleEvents } from '../hooks/use_cleanup_stale_events';
import { SettingsSectionRow } from './settings_section';

export function StaleEventCleanupSection({ canManage }: { canManage: boolean }) {
  const { cleanupStaleEvents, isCleaningUp } = useCleanupStaleEvents();

  return (
    <SettingsSectionRow
      title={i18n.translate('xpack.nightshift.settings.staleEventCleanup.title', {
        defaultMessage: 'Stale event cleanup',
      })}
      description={
        <p>
          {i18n.translate('xpack.nightshift.settings.staleEventCleanup.description', {
            defaultMessage:
              'Close open significant events when none of their backing rules still exist. This cleanup runs automatically every day.',
          })}
        </p>
      }
      data-test-subj="streams-settings-stale-event-cleanup-header"
    >
      <EuiFlexGroup responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="streams-settings-stale-event-cleanup-button"
            size="s"
            iconType="broom"
            isLoading={isCleaningUp}
            isDisabled={!canManage || isCleaningUp}
            onClick={cleanupStaleEvents}
          >
            {i18n.translate('xpack.nightshift.settings.staleEventCleanup.buttonLabel', {
              defaultMessage: 'Clean up stale events',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </SettingsSectionRow>
  );
}
