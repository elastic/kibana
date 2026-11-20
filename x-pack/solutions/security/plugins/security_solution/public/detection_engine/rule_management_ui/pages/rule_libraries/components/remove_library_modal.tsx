/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiCheckbox, EuiConfirmModal, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { RuleLibraryListItem } from '../types';
import * as i18n from '../translations';

interface RemoveLibraryModalContentProps {
  library: RuleLibraryListItem;
  isRemoving: boolean;
  onConfirm: (keepRuleVersions: boolean) => void;
  onCancel: () => void;
}

const RemoveLibraryModalContent = ({
  library,
  isRemoving,
  onConfirm,
  onCancel,
}: RemoveLibraryModalContentProps) => {
  const [keepRuleVersions, setKeepRuleVersions] = useState(false);
  const isShared = library.scope === 'shared';
  const checkboxId = useGeneratedHtmlId({ prefix: 'keepRuleVersions' });

  return (
    <EuiConfirmModal
      title={i18n.REMOVE_LIBRARY_MODAL_TITLE(library.title)}
      aria-label={i18n.REMOVE_LIBRARY_MODAL_TITLE(library.title)}
      confirmButtonText={i18n.REMOVE_LIBRARY_CONFIRM}
      cancelButtonText={i18n.REMOVE_LIBRARY_CANCEL}
      buttonColor="danger"
      isLoading={isRemoving}
      onConfirm={() => onConfirm(keepRuleVersions)}
      onCancel={onCancel}
      data-test-subj="removeRuleLibraryModal"
    >
      <p>{isShared ? i18n.REMOVE_LIBRARY_MODAL_BODY : i18n.REMOVE_SPACE_LIBRARY_MODAL_BODY}</p>
      {isShared ? (
        <>
          <EuiSpacer size="m" />
          <EuiCheckbox
            id={checkboxId}
            label={i18n.KEEP_RULE_VERSIONS_LABEL}
            checked={keepRuleVersions}
            onChange={(event) => setKeepRuleVersions(event.target.checked)}
            data-test-subj="keepRuleVersionsCheckbox"
          />
        </>
      ) : null}
      {isShared && !keepRuleVersions ? (
        <>
          <EuiSpacer size="m" />
          <KbnWarningCallout
            size="s"
            title={i18n.SHARED_LIBRARY_WARNING_TITLE}
            text={i18n.SHARED_LIBRARY_WARNING_BODY}
            data-test-subj="removeSharedRuleLibraryWarning"
          />
        </>
      ) : null}
    </EuiConfirmModal>
  );
};

interface RemoveLibraryModalProps {
  library?: RuleLibraryListItem;
  isRemoving: boolean;
  onConfirm: (keepRuleVersions: boolean) => void;
  onCancel: () => void;
}

// The content mounts per library, so the checkbox starts unchecked every time the modal opens.
export const RemoveLibraryModal = ({ library, ...props }: RemoveLibraryModalProps) =>
  library ? <RemoveLibraryModalContent key={library.id} library={library} {...props} /> : null;
