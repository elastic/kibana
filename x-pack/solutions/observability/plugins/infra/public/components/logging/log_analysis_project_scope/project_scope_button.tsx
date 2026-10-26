/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC } from 'react';
import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const loadingLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeLoadingLabel', {
  defaultMessage: 'Loading',
});

const unavailableLabel = i18n.translate('xpack.infra.analysisSetup.projectScopeUnavailableLabel', {
  defaultMessage: 'Project scope unavailable',
});

export interface ProjectScopeButtonProps {
  label: string;
  onClick: () => void;
  /**
   * Wraps whatever the button ends up showing, including its loading and error text, so callers can
   * qualify it without having to reproduce those states themselves.
   */
  decorateLabel?: (text: string) => string;
  variant?: 'regular' | 'empty';
  isDisabled?: boolean;
  isLoading?: boolean;
  hasError?: boolean;
  'data-test-subj'?: string;
  'data-ebt-action'?: string;
  'data-ebt-element'?: string;
  'data-ebt-detail'?: string;
}

export const ProjectScopeButton: FC<ProjectScopeButtonProps> = ({
  label,
  onClick,
  decorateLabel = (text) => text,
  variant = 'regular',
  isDisabled = false,
  isLoading = false,
  hasError = false,
  'data-test-subj': dataTestSubj,
  'data-ebt-action': dataEbtAction,
  'data-ebt-element': dataEbtElement,
  'data-ebt-detail': dataEbtDetail,
}) => {
  const ButtonComponent = variant === 'empty' ? EuiButtonEmpty : EuiButton;

  return (
    <ButtonComponent
      color="text"
      iconType="crossProjectSearch"
      isDisabled={isDisabled || isLoading || hasError}
      isLoading={isLoading}
      onClick={onClick}
      data-test-subj={dataTestSubj}
      data-ebt-action={dataEbtAction}
      data-ebt-element={dataEbtElement}
      data-ebt-detail={dataEbtDetail}
    >
      {decorateLabel(hasError ? unavailableLabel : isLoading ? loadingLabel : label)}
    </ButtonComponent>
  );
};
