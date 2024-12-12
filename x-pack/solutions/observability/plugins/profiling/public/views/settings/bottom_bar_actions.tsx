/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  unsavedChangesCount: number;
  isLoading: boolean;
  onDiscardChanges: () => void;
  onSave: () => void;
  saveLabel: string;
  areChangesInvalid?: boolean;
}

export function BottomBarActions({
  isLoading,
  onDiscardChanges,
  onSave,
  unsavedChangesCount,
  saveLabel,
  areChangesInvalid = false,
}: Props) {
  return (
    <EuiBottomBar paddingSize="s" data-test-subj="profilingBottomBarActions">
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem
          grow={false}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <EuiHealth color="warning" />
          <EuiText>
            {i18n.translate('xpack.profiling.bottomBarActions.unsavedChanges', {
              defaultMessage:
                '{unsavedChangesCount, plural, =0{0 unsaved changes} one {1 unsaved change} other {# unsaved changes}} ',
              values: { unsavedChangesCount },
            })}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                data-test-subj="profilingBottomBarActionsDiscardChangesButton"
                color="text"
                onClick={onDiscardChanges}
              >
                {i18n.translate('xpack.profiling.bottomBarActions.discardChangesButton', {
                  defaultMessage: 'Discard changes',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={
                  areChangesInvalid &&
                  i18n.translate(
                    'xpack.profiling.bottomBarActions.saveButtonTooltipWithInvalidChanges',
                    {
                      defaultMessage: 'Fix invalid settings before saving.',
                    }
                  )
                }
              >
                <EuiButton
                  disabled={areChangesInvalid}
                  data-test-subj="profilingBottomBarActionsButton"
                  onClick={onSave}
                  fill
                  isLoading={isLoading}
                  color="success"
                  iconType="check"
                >
                  {saveLabel}
                </EuiButton>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiBottomBar>
  );
}
