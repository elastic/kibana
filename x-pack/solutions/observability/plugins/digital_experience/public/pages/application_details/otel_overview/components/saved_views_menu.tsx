/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFieldText,
  EuiFilterButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormErrorText,
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { SAVED_VIEW_NAME_MAX_LENGTH, type SavedView } from '../../../../../common/saved_views';
import { canSaveViews } from '../../../../capabilities';
import {
  APPLICATION_OVERVIEW_EBT_ELEMENTS,
  DIGITAL_EXPERIENCE_EBT_ACTIONS,
} from '../../../../ebt_constants';
import { messageOfRequestError, useSavedViews } from '../../../../hooks/use_saved_views';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';
import { useApplyView, useCurrentView } from '../../../../hooks/use_view_state';

const LABEL = i18n.translate('xpack.digitalExperience.savedViews.buttonLabel', {
  defaultMessage: 'Views',
});

const TITLE = i18n.translate('xpack.digitalExperience.savedViews.title', {
  defaultMessage: 'Saved views',
});

const SUBTITLE = i18n.translate('xpack.digitalExperience.savedViews.subtitle', {
  defaultMessage:
    'A view keeps the filters, the query and the percentile. Everyone who uses this space sees it.',
});

const EMPTY = i18n.translate('xpack.digitalExperience.savedViews.empty', {
  defaultMessage: 'No saved views yet.',
});

const LOAD_ERROR = i18n.translate('xpack.digitalExperience.savedViews.loadError', {
  defaultMessage: 'Could not load the views.',
});

const NAME_PLACEHOLDER = i18n.translate('xpack.digitalExperience.savedViews.namePlaceholder', {
  defaultMessage: 'Name of the view',
});

const KEEP_TIME_RANGE = i18n.translate('xpack.digitalExperience.savedViews.keepTimeRange', {
  defaultMessage: 'Keep the time range',
});

const SAVE = i18n.translate('xpack.digitalExperience.savedViews.save', {
  defaultMessage: 'Save view',
});

const KEEPS_TIME_RANGE_TITLE = i18n.translate(
  'xpack.digitalExperience.savedViews.keepsTimeRangeTitle',
  { defaultMessage: 'Also sets the time range' }
);

const updateLabel = (name: string) =>
  i18n.translate('xpack.digitalExperience.savedViews.updateLabel', {
    defaultMessage: 'Save the current filters in {name}',
    values: { name },
  });

const deleteLabel = (name: string) =>
  i18n.translate('xpack.digitalExperience.savedViews.deleteLabel', {
    defaultMessage: 'Delete {name}',
    values: { name },
  });

/** The views of the space and, with the privilege, a form to save the Overview as another. */
function SavedViewsPanel({ onApplied }: { onApplied: () => void }) {
  const { euiTheme } = useEuiTheme();
  const { application } = useKibanaServices();
  const canSave = canSaveViews(application.capabilities);
  const { views, isLoading, error, create, update, remove } = useSavedViews();
  const { state, timeRange } = useCurrentView();
  const applyView = useApplyView();
  const keepTimeRangeId = useGeneratedHtmlId({ prefix: 'digitalExperienceSavedViewKeepTime' });
  const [name, setName] = useState('');
  const [keepTimeRange, setKeepTimeRange] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string>();
  const [requestError, setRequestError] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);

  /** Runs a change, showing why it failed, e.g. that the name is taken; whether it worked. */
  const run = async (change: () => Promise<unknown>): Promise<boolean> => {
    setIsBusy(true);
    setRequestError(undefined);
    try {
      await change();
      return true;
    } catch (changeError) {
      setRequestError(messageOfRequestError(changeError));
      return false;
    } finally {
      setIsBusy(false);
    }
  };

  const saveNew = async () => {
    const isSaved = await run(() =>
      create({ name: name.trim(), ...state, ...(keepTimeRange ? timeRange : {}) })
    );
    if (isSaved) {
      setName('');
    }
  };

  const saveAgain = (view: SavedView) =>
    run(() =>
      update(view.id, {
        name: view.name,
        description: view.description,
        ...state,
        // A view that kept a time range keeps the current one.
        ...(view.rangeFrom ? timeRange : {}),
      })
    );

  const deleteView = async (view: SavedView) => {
    await run(() => remove(view.id));
    setConfirmingId(undefined);
  };

  return (
    <div css={css({ inlineSize: 360 })} data-test-subj="digitalExperienceSavedViewsPanel">
      <EuiPopoverTitle paddingSize="s">
        <EuiText size="s">
          <strong>{TITLE}</strong>
        </EuiText>
        <EuiText size="xs" color="subdued">
          {SUBTITLE}
        </EuiText>
      </EuiPopoverTitle>
      <div css={css({ maxBlockSize: 240, overflowY: 'auto', padding: euiTheme.size.s })}>
        {isLoading && views.length === 0 && <EuiLoadingSpinner size="m" />}
        {error && (
          <EuiText size="s" color="danger" data-test-subj="digitalExperienceSavedViewsLoadError">
            {LOAD_ERROR}
          </EuiText>
        )}
        {!isLoading && !error && views.length === 0 && (
          <EuiText size="s" color="subdued" data-test-subj="digitalExperienceSavedViewsEmpty">
            {EMPTY}
          </EuiText>
        )}
        {views.map((view) => (
          <EuiFlexGroup
            key={view.id}
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            css={css({ minBlockSize: euiTheme.size.xl })}
          >
            <EuiFlexItem grow css={css({ minInlineSize: 0 })}>
              <EuiLink
                color="text"
                title={view.description}
                onClick={() => {
                  applyView(view);
                  onApplied();
                }}
                data-test-subj={`digitalExperienceSavedViewApply-${view.name}`}
                {...getEbtProps({
                  action: DIGITAL_EXPERIENCE_EBT_ACTIONS.APPLY_VIEW,
                  element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEWS,
                })}
              >
                <span className="eui-textTruncate">{view.name}</span>
              </EuiLink>
            </EuiFlexItem>
            {view.rangeFrom && (
              <EuiFlexItem grow={false}>
                <EuiIcon
                  type="clock"
                  size="s"
                  color="subdued"
                  title={KEEPS_TIME_RANGE_TITLE}
                  aria-label={KEEPS_TIME_RANGE_TITLE}
                />
              </EuiFlexItem>
            )}
            {canSave && confirmingId !== view.id && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={updateLabel(view.name)} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="save"
                      size="xs"
                      aria-label={updateLabel(view.name)}
                      isDisabled={isBusy}
                      onClick={() => saveAgain(view)}
                      data-test-subj={`digitalExperienceSavedViewUpdate-${view.name}`}
                      {...getEbtProps({
                        action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SAVE_VIEW,
                        element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEWS,
                      })}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiToolTip content={deleteLabel(view.name)} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      size="xs"
                      aria-label={deleteLabel(view.name)}
                      isDisabled={isBusy}
                      onClick={() => setConfirmingId(view.id)}
                      data-test-subj={`digitalExperienceSavedViewDelete-${view.name}`}
                      {...getEbtProps({
                        action: DIGITAL_EXPERIENCE_EBT_ACTIONS.DELETE_VIEW,
                        element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEW_DELETE,
                      })}
                    />
                  </EuiToolTip>
                </EuiFlexItem>
              </>
            )}
            {canSave && confirmingId === view.id && (
              <>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="xs"
                    color="danger"
                    isDisabled={isBusy}
                    onClick={() => deleteView(view)}
                    data-test-subj={`digitalExperienceSavedViewConfirmDelete-${view.name}`}
                    {...getEbtProps({
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.DELETE_VIEW,
                      element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEW_DELETE_CONFIRM,
                    })}
                  >
                    {i18n.translate('xpack.digitalExperience.savedViews.confirmDelete', {
                      defaultMessage: 'Delete',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="digitalExperienceSavedViewsPanelCancelButton"
                    size="xs"
                    onClick={() => setConfirmingId(undefined)}
                    {...getEbtProps({
                      action: DIGITAL_EXPERIENCE_EBT_ACTIONS.CANCEL_DELETE_VIEW,
                      element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEW_DELETE,
                    })}
                  >
                    {i18n.translate('xpack.digitalExperience.savedViews.cancelDelete', {
                      defaultMessage: 'Cancel',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              </>
            )}
          </EuiFlexGroup>
        ))}
      </div>
      {canSave && (
        <EuiPopoverFooter paddingSize="s">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim() !== '' && !isBusy) {
                saveNew();
              }
            }}
          >
            <EuiFieldText
              compressed
              fullWidth
              maxLength={SAVED_VIEW_NAME_MAX_LENGTH}
              placeholder={NAME_PLACEHOLDER}
              aria-label={NAME_PLACEHOLDER}
              value={name}
              onChange={(event) => setName(event.target.value)}
              data-test-subj="digitalExperienceSavedViewName"
            />
            <EuiSpacer size="xs" />
            <EuiCheckbox
              id={keepTimeRangeId}
              label={KEEP_TIME_RANGE}
              checked={keepTimeRange}
              onChange={(event) => setKeepTimeRange(event.target.checked)}
              data-test-subj="digitalExperienceSavedViewKeepTime"
            />
            <EuiSpacer size="s" />
            <EuiButton
              size="s"
              fill
              type="submit"
              isLoading={isBusy}
              isDisabled={name.trim() === '' || isBusy}
              data-test-subj="digitalExperienceSavedViewSave"
              {...getEbtProps({
                action: DIGITAL_EXPERIENCE_EBT_ACTIONS.SAVE_VIEW,
                element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEWS,
              })}
            >
              {SAVE}
            </EuiButton>
          </form>
        </EuiPopoverFooter>
      )}
      {requestError && (
        <div css={css({ padding: euiTheme.size.s })}>
          <EuiFormErrorText data-test-subj="digitalExperienceSavedViewError">
            {requestError}
          </EuiFormErrorText>
        </div>
      )}
    </div>
  );
}

/**
 * The button of the saved views, in the group of the filter buttons: its popover lists the views of
 * the space to apply, and lets those who may save the Overview as one. The views are read when the
 * popover opens, not before.
 */
export function SavedViewsMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiPopover
      aria-label={TITLE}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      panelPaddingSize="none"
      button={
        <EuiFilterButton
          // Like the saved views of Infrastructure.
          iconType="save"
          isSelected={isOpen}
          onClick={() => setIsOpen((open) => !open)}
          data-test-subj="digitalExperienceOverviewSavedViews"
          {...getEbtProps({
            action: DIGITAL_EXPERIENCE_EBT_ACTIONS.OPEN_FILTER,
            element: APPLICATION_OVERVIEW_EBT_ELEMENTS.SAVED_VIEWS,
          })}
        >
          {LABEL}
        </EuiFilterButton>
      }
    >
      {isOpen && <SavedViewsPanel onApplied={() => setIsOpen(false)} />}
    </EuiPopover>
  );
}
