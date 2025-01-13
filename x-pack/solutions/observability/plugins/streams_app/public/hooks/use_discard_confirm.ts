/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useKibana } from './use_kibana';

export const useDiscardConfirm = (handler: () => void) => {
  const { core } = useKibana();

  return async () => {
    const hasCancelled = await core.overlays.openConfirm(
      i18n.translate('xpack.streams.cancelModal.message', {
        defaultMessage: 'Are you sure you want to discard your changes?',
      }),
      {
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
      }
    );

    if (hasCancelled) handler();
  };
};
