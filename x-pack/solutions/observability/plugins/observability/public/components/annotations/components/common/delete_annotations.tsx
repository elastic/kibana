/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { AnnotationsPermissions } from '../../hooks/use_annotation_permissions';
import { Annotation } from '../../../../../common/annotations';

export function DeleteAnnotations({
  selection,
  isLoading,
  permissions,
  setIsDeleteModalVisible,
}: {
  selection: Annotation[];
  isLoading?: boolean;
  permissions?: AnnotationsPermissions;
  setIsDeleteModalVisible: (isVisible: boolean) => void;
}) {
  if (selection.length === 0) {
    return <> </>;
  }
  const btn = (
    <EuiButton
      data-test-subj="o11yRenderToolsLeftUsersButton"
      color="danger"
      iconType="trash"
      onClick={() => {
        setIsDeleteModalVisible(true);
      }}
      isLoading={isLoading}
      isDisabled={selection.length === 0 || !permissions?.write}
    >
      {i18n.translate('xpack.observability.renderToolsLeft.deleteButtonLabel', {
        defaultMessage: 'Delete {no} annotations',
        values: { no: selection.length },
      })}
    </EuiButton>
  );

  if (permissions?.write) {
    return <>{btn}</>;
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.observability.renderToolsLeft.deleteButtonDisabledTooltip', {
        defaultMessage: 'You do not have permission to delete annotations',
      })}
    >
      {btn}
    </EuiToolTip>
  );
}
