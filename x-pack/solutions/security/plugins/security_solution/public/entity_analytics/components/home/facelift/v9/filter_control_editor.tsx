/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Create / Edit control flyout, mirroring the controls plugin's
 * `DataControlEditor` under the editor config Alerts uses: the data view and
 * values-source selectors and the additional settings are hidden, and number
 * fields are filtered out, so the form is Field → Control type → Label.
 *
 * Flyout chrome matches `openLazyFlyout` (size 500 / maxWidth 800 / ownFocus)
 * and cancelling with unsaved edits raises the same discard confirmation.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EntityStoreField } from './entity_store_fields';
import { ENTITY_STORE_FIELDS } from './entity_store_fields';
import { FilterControlFieldPicker } from './filter_control_field_picker';

const CREATE_CONTROL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.createTitle',
  { defaultMessage: 'Create control' }
);

const EDIT_CONTROL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.editTitle',
  { defaultMessage: 'Edit control' }
);

const FIELD = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.field',
  { defaultMessage: 'Field' }
);

const CONTROL_TYPE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.controlType',
  { defaultMessage: 'Control type' }
);

const LABEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.label',
  { defaultMessage: 'Label' }
);

const SAVE = i18n.translate('xpack.securitySolution.entityAnalytics.facelift.controlEditor.save', {
  defaultMessage: 'Save',
});

const CANCEL = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.cancel',
  { defaultMessage: 'Cancel' }
);

const OPTIONS_LIST = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.optionsList',
  { defaultMessage: 'Options list' }
);

const RANGE_SLIDER = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.rangeSlider',
  { defaultMessage: 'Range slider' }
);

const NO_FIELD_SELECTED = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.noFieldSelected',
  { defaultMessage: 'Select a field first.' }
);

const RANGE_SLIDER_INCOMPATIBLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.rangeSliderIncompatible',
  { defaultMessage: 'Range sliders are only compatible with number fields.' }
);

const DISCARD_TITLE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.discardTitle',
  { defaultMessage: 'Discard changes?' }
);

const DISCARD_BODY = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.discardBody',
  {
    defaultMessage: `Changes that you've made to this control will be discarded, are you sure you want to continue?`,
  }
);

const DISCARD_CONFIRM = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.discardConfirm',
  { defaultMessage: 'Discard changes' }
);

/** Alerts hides number fields, which leaves range sliders permanently disabled. */
const SELECTABLE_FIELDS = ENTITY_STORE_FIELDS.filter((field) => field.type !== 'number');

const OPTIONS_LIST_CONTROL = 'optionsListControl';
const RANGE_SLIDER_CONTROL = 'rangeSliderControl';

export const DEFAULT_CONTROL_TYPE = OPTIONS_LIST_CONTROL;

/** Sorted descending by the same `order` the real control type actions use. */
const CONTROL_TYPES = [
  { id: OPTIONS_LIST_CONTROL, label: OPTIONS_LIST, icon: 'listCheck', order: 1 },
  { id: RANGE_SLIDER_CONTROL, label: RANGE_SLIDER, icon: 'controls', order: 0 },
].sort((a, b) => b.order - a.order);

export interface FilterControlDraft {
  fieldName?: string;
  /** Undefined means "fall back to the field name". */
  title?: string;
  controlType: string;
}

export interface FilterControlEditorProps {
  /** Undefined when creating a control. */
  initialDraft?: FilterControlDraft;
  onSave: (draft: FilterControlDraft) => void;
  onClose: () => void;
}

export const FilterControlEditor: React.FC<FilterControlEditorProps> = ({
  initialDraft,
  onSave,
  onClose,
}) => {
  const isEdit = Boolean(initialDraft);
  const titleId = useGeneratedHtmlId({ prefix: 'eaFaceliftControlEditorTitle' });
  const discardTitleId = useGeneratedHtmlId({ prefix: 'eaFaceliftControlEditorDiscardTitle' });

  const [fieldName, setFieldName] = useState<string | undefined>(initialDraft?.fieldName);
  const [controlType, setControlType] = useState<string>(
    initialDraft?.controlType ?? DEFAULT_CONTROL_TYPE
  );
  /** What the input shows. */
  const [panelTitle, setPanelTitle] = useState<string>(
    initialDraft?.title ?? initialDraft?.fieldName ?? ''
  );
  /** Undefined until the user types a label of their own, as in the real editor. */
  const [titleOverride, setTitleOverride] = useState<string | undefined>(initialDraft?.title);
  const [defaultTitle, setDefaultTitle] = useState<string>(initialDraft?.fieldName ?? '');
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  const isDirty =
    fieldName !== initialDraft?.fieldName ||
    controlType !== (initialDraft?.controlType ?? DEFAULT_CONTROL_TYPE) ||
    titleOverride !== initialDraft?.title;

  const rangeSliderDisabledReason = useMemo(
    () => (fieldName ? RANGE_SLIDER_INCOMPATIBLE : NO_FIELD_SELECTED),
    [fieldName]
  );

  const onSelectField = useCallback(
    (field: EntityStoreField) => {
      setFieldName(field.name);
      setDefaultTitle(field.name);
      // The label follows the field until the user sets one explicitly.
      if (!titleOverride || titleOverride === field.name) {
        setPanelTitle(field.name);
      }
    },
    [titleOverride]
  );

  const requestClose = useCallback(() => {
    if (isDirty) {
      setIsDiscardModalOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const save = useCallback(() => {
    if (!fieldName) return;
    onSave({ fieldName, title: titleOverride, controlType });
  }, [controlType, fieldName, onSave, titleOverride]);

  return (
    <>
      <EuiFlyout
        onClose={requestClose}
        size={500}
        maxWidth={800}
        ownFocus
        paddingSize="m"
        aria-labelledby={titleId}
        data-test-subj="eaFaceliftControlEditorFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={titleId}>{isEdit ? EDIT_CONTROL : CREATE_CONTROL}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiForm fullWidth>
            <EuiFormRow label={FIELD}>
              <FilterControlFieldPicker
                fields={SELECTABLE_FIELDS}
                selectedFieldName={fieldName}
                onSelectField={onSelectField}
              />
            </EuiFormRow>
            <EuiFormRow label={CONTROL_TYPE}>
              {/* wrapped so focus is passed to the form row correctly */}
              <div>
                <EuiKeyPadMenu
                  data-test-subj="eaFaceliftControlEditorTypeMenu"
                  aria-label={CONTROL_TYPE}
                >
                  {CONTROL_TYPES.map((type) => {
                    const isDisabled = type.id === RANGE_SLIDER_CONTROL || !fieldName;
                    const item = (
                      <EuiKeyPadMenuItem
                        key={type.id}
                        id={`eaFaceliftCreate__${type.id}`}
                        aria-label={type.label}
                        data-test-subj={`eaFaceliftCreate__${type.id}`}
                        isSelected={type.id === controlType && Boolean(fieldName)}
                        disabled={isDisabled}
                        onClick={() => setControlType(type.id)}
                        label={type.label}
                      >
                        <EuiIcon type={type.icon} size="l" aria-hidden={true} />
                      </EuiKeyPadMenuItem>
                    );

                    return isDisabled ? (
                      <EuiToolTip key={`disabled__${type.id}`} content={rangeSliderDisabledReason}>
                        {item}
                      </EuiToolTip>
                    ) : (
                      item
                    );
                  })}
                </EuiKeyPadMenu>
              </div>
            </EuiFormRow>
            <EuiFormRow label={LABEL}>
              <EuiFieldText
                data-test-subj="eaFaceliftControlEditorTitleInput"
                placeholder={defaultTitle}
                value={panelTitle}
                compressed
                onChange={(event) => {
                  const next = event.target.value ?? '';
                  setPanelTitle(next);
                  setTitleOverride(next === '' ? undefined : next);
                }}
              />
            </EuiFormRow>
          </EuiForm>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup responsive={false} justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="eaFaceliftControlEditorCancel" onClick={requestClose}>
                {CANCEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="eaFaceliftControlEditorSave"
                fill
                color="primary"
                disabled={!fieldName}
                onClick={save}
              >
                {SAVE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {isDiscardModalOpen ? (
        <EuiConfirmModal
          title={DISCARD_TITLE}
          aria-labelledby={discardTitleId}
          titleProps={{ id: discardTitleId }}
          onCancel={() => setIsDiscardModalOpen(false)}
          onConfirm={() => {
            setIsDiscardModalOpen(false);
            onClose();
          }}
          cancelButtonText={CANCEL}
          confirmButtonText={DISCARD_CONFIRM}
          buttonColor="danger"
          data-test-subj="eaFaceliftControlEditorDiscardModal"
        >
          {DISCARD_BODY}
        </EuiConfirmModal>
      ) : null}
    </>
  );
};
