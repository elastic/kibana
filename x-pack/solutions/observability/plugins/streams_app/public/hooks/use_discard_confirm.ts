/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { OverlayModalConfirmOptions } from '@kbn/core/public';
import { useKibana } from './use_kibana';

const defaultMessage = i18n.translate('xpack.streams.cancelModal.message', {
  defaultMessage: 'Are you sure you want to discard your changes?',
});

export const useDiscardConfirm = <THandler extends (..._args: any[]) => any>(
  handler: THandler,
  options: OverlayModalConfirmOptions & { message?: string } = {}
) => {
  const { core } = useKibana();
  const { message = defaultMessage, ...optionsOverride } = options;

  return async (...args: Parameters<THandler>) => {
    const hasCancelled = await core.overlays.openConfirm(message, {
      buttonColor: 'danger',
      title: i18n.translate('xpack.streams.cancelModal.title', {
        defaultMessage: 'Discard changes?',
      }),
      confirmButtonText: i18n.translate('xpack.streams.cancelModal.confirm', {
        defaultMessage: 'Discard',
      }),
      cancelButtonText: i18n.translate('xpack.streams.cancelModal.cancel', {
        defaultMessage: 'Keep editing',
      }),
      ...optionsOverride,
    });

    if (hasCancelled) handler(...args);
  };
};
