/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef, VFC } from 'react';
import { DataProvider } from '@kbn/timelines-plugin/common';
import { AddToTimelineButtonProps } from '@kbn/timelines-plugin/public';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiFlexItem,
  EuiToolTip,
} from '@elastic/eui';
import { generateDataProvider } from '../utils/data_provider';
import { fieldAndValueValid, getIndicatorFieldAndValue } from '../../indicators/utils/field_value';
import { Indicator } from '../../../../common/types/indicator';
import { useKibana } from '../../../hooks/use_kibana';
import { useSecurityContext } from '../../../hooks/use_security_context';
import { useStyles } from './styles';
import { useAddToTimeline } from '../hooks/use_add_to_timeline';
import { TITLE } from './translations';

const ICON_TYPE = 'timeline';

export interface AddToTimelineProps {
  /**
   * Value passed to the timeline. Used in combination with field if is type of {@link Indicator}.
   */
  data: Indicator | string;
  /**
   * Value passed to the timeline.
   */
  field: string;
  /**
   * Used for unit and e2e tests.
   */
  ['data-test-subj']?: string;
}

export interface AddToTimelineCellActionProps extends AddToTimelineProps {
  /**
   * Only used with `EuiDataGrid` (see {@link AddToTimelineButtonProps}).
   */
  Component: typeof EuiButtonEmpty | typeof EuiButtonIcon;
}

/**
 * Add to timeline feature, leverages the built-in functionality retrieves from the timeLineService (see ThreatIntelligenceSecuritySolutionContext in x-pack/plugins/threat_intelligence/public/types.ts)
 * Clicking on the button will add a key-value pair to an Untitled timeline.
 *
 * This component is renders an {@link EuiButtonIcon}.
 *
 * @returns add to timeline button or an empty component
 */
export const AddToTimelineButtonIcon: VFC<AddToTimelineProps> = ({
  data,
  field,
  'data-test-subj': dataTestSubj,
}) => {
  const addToTimelineButton =
    useKibana().services.timelines.getHoverActions().getAddToTimelineButton;
  const securitySolutionContext = useSecurityContext();

  const { addToTimelineProps } = useAddToTimeline({ indicator: data, field });
  if (!securitySolutionContext?.hasAccessToTimeline || !addToTimelineProps) {
    return null;
  }

  return (
    <EuiToolTip content={TITLE}>
      <EuiFlexItem data-test-subj={dataTestSubj}>
        {addToTimelineButton(addToTimelineProps)}
      </EuiFlexItem>
    </EuiToolTip>
  );
};

/**
 * Add to timeline feature, leverages the built-in functionality retrieves from the timeLineService (see ThreatIntelligenceSecuritySolutionContext in x-pack/plugins/threat_intelligence/public/types.ts)
 * Clicking on the button will add a key-value pair to an Untitled timeline.
 *
 * This component is renders an {@link EuiButtonEmpty}.
 *
 * @returns add to timeline button or an empty component
 */
export const AddToTimelineButtonEmpty: VFC<AddToTimelineProps> = ({
  data,
  field,
  'data-test-subj': dataTestSubj,
}) => {
  const styles = useStyles();
  const securitySolutionContext = useSecurityContext();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const { timelines, analytics, i18n: i18nStart, theme } = useKibana().services;
  const startServices = { analytics, i18n: i18nStart, theme };
  const addToTimelineButton = timelines.getHoverActions().getAddToTimelineButton;

  const { key, value } =
    typeof data === 'string' ? { key: field, value: data } : getIndicatorFieldAndValue(data, field);

  if (!securitySolutionContext?.hasAccessToTimeline || !fieldAndValueValid(key, value)) {
    return null;
  }

  const dataProvider: DataProvider[] = [generateDataProvider(key, value as string)];

  const addToTimelineProps: AddToTimelineButtonProps = {
    dataProvider,
    field: key,
    ownFocus: false,
    startServices,
  };

  // Use case is for the barchart legend (for example).
  // We can't use the addToTimelineButton directly because the UI doesn't work in a EuiContextMenu.
  // We hide it and use the defaultFocusedButtonRef props to programmatically click it.
  addToTimelineProps.defaultFocusedButtonRef = buttonRef;

  return (
    <>
      <div css={styles.displayNone}>{addToTimelineButton(addToTimelineProps)}</div>
      <EuiToolTip content={TITLE}>
        <EuiButtonEmpty
          aria-label={TITLE}
          iconType={ICON_TYPE}
          iconSize="s"
          color="primary"
          onClick={() => buttonRef.current?.click()}
          data-test-subj={dataTestSubj}
        >
          {TITLE}
        </EuiButtonEmpty>
      </EuiToolTip>
    </>
  );
};

/**
 * Add to timeline feature, leverages the built-in functionality retrieves from the timeLineService (see ThreatIntelligenceSecuritySolutionContext in x-pack/plugins/threat_intelligence/public/types.ts)
 * Clicking on the button will add a key-value pair to an Untitled timeline.
 *
 * This component is to be used in an EuiContextMenu.
 *
 * @returns add to timeline {@link EuiContextMenuItem} for a context menu
 */
export const AddToTimelineContextMenu: VFC<AddToTimelineProps> = ({
  data,
  field,
  'data-test-subj': dataTestSubj,
}) => {
  const styles = useStyles();
  const securitySolutionContext = useSecurityContext();
  const contextMenuRef = useRef<HTMLButtonElement>(null);

  const { timelines, analytics, i18n: i18nStart, theme } = useKibana().services;
  const startServices = { analytics, i18n: i18nStart, theme };

  const addToTimelineButton = timelines.getHoverActions().getAddToTimelineButton;

  const { key, value } =
    typeof data === 'string' ? { key: field, value: data } : getIndicatorFieldAndValue(data, field);

  if (!securitySolutionContext?.hasAccessToTimeline || !fieldAndValueValid(key, value)) {
    return null;
  }

  const dataProvider: DataProvider[] = [generateDataProvider(key, value as string)];

  const addToTimelineProps: AddToTimelineButtonProps = {
    dataProvider,
    field: key,
    ownFocus: false,
    startServices,
  };

  // Use case is for the barchart legend (for example).
  // We can't use the addToTimelineButton directly because the UI doesn't work in a EuiContextMenu.
  // We hide it and use the defaultFocusedButtonRef props to programmatically click it.
  addToTimelineProps.defaultFocusedButtonRef = contextMenuRef;

  return (
    <>
      <div css={styles.displayNone}>{addToTimelineButton(addToTimelineProps)}</div>
      <EuiContextMenuItem
        key="addToTimeline"
        icon={ICON_TYPE}
        size="s"
        onClick={() => contextMenuRef.current?.click()}
        data-test-subj={dataTestSubj}
      >
        {TITLE}
      </EuiContextMenuItem>
    </>
  );
};

/**
 * Add to timeline feature, leverages the built-in functionality retrieves from the timeLineService (see ThreatIntelligenceSecuritySolutionContext in x-pack/plugins/threat_intelligence/public/types.ts)
 * Clicking on the button will add a key-value pair to an Untitled timeline.
 *
 * This component is to be used as a cellAction in an {@link EuiDataGrid}.
 *
 * @returns add to timeline button or an empty component
 */
export const AddToTimelineCellAction: VFC<AddToTimelineCellActionProps> = ({
  data,
  field,
  Component,
  'data-test-subj': dataTestSubj,
}) => {
  const addToTimelineButton =
    useKibana().services.timelines.getHoverActions().getAddToTimelineButton;
  const securitySolutionContext = useSecurityContext();

  const { addToTimelineProps } = useAddToTimeline({ indicator: data, field });
  if (!securitySolutionContext?.hasAccessToTimeline || !addToTimelineProps) {
    return null;
  }
  addToTimelineProps.Component = Component;

  return (
    <EuiToolTip content={TITLE}>
      <EuiFlexItem data-test-subj={dataTestSubj}>
        {addToTimelineButton(addToTimelineProps)}
      </EuiFlexItem>
    </EuiToolTip>
  );
};
