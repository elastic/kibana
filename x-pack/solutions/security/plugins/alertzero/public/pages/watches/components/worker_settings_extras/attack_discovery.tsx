/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { EuiFieldNumber, EuiFormRow, EuiSpacer } from '@elastic/eui';
import * as i18n from '../../settings_translations';
import type { WorkerSettingsExtrasProps } from './types';

/**
 * Attack Discovery–only extras. Mounted through the extras registry — the common card never
 * switches on worker id. Presence of `candidateLimit` on the projected settings is the opt-in.
 */
export const AttackDiscoverySettingsExtras: React.FC<WorkerSettingsExtrasProps> = ({
  worker,
  isDisabled,
  onPatch,
}) => {
  const current = worker.settings.candidateLimit;
  const [draft, setDraft] = useState(current ?? 100);
  const draftRef = useRef(draft);
  const lastPersistedRef = useRef(current);
  const onPatchRef = useRef(onPatch);

  onPatchRef.current = onPatch;

  useEffect(() => {
    lastPersistedRef.current = current;
    if (current != null) {
      draftRef.current = current;
      setDraft(current);
    }
  }, [current]);

  const persist = useCallback(() => {
    const next = draftRef.current;
    if (current == null || next === lastPersistedRef.current) {
      return;
    }
    lastPersistedRef.current = next;
    onPatchRef.current({ candidateLimit: next });
  }, [current]);

  if (current == null) {
    return null;
  }

  return (
    <>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={i18n.CANDIDATE_LIMIT_LABEL}
        helpText={i18n.CANDIDATE_LIMIT_HELP_TEXT}
        fullWidth
      >
        <EuiFieldNumber
          min={1}
          max={1000}
          value={draft}
          disabled={isDisabled}
          onChange={(event) => {
            const next = event.target.valueAsNumber;
            if (!Number.isFinite(next)) {
              return;
            }
            const clamped = Math.min(1000, Math.max(1, Math.trunc(next)));
            draftRef.current = clamped;
            setDraft(clamped);
          }}
          onBlur={persist}
          aria-label={i18n.CANDIDATE_LIMIT_ARIA_LABEL}
          data-test-subj="alertZeroCandidateLimit"
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
