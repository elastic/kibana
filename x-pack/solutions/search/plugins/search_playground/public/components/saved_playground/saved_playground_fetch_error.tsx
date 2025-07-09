/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { EuiButton } from '@elastic/eui';
import { useFormContext } from 'react-hook-form';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { PLUGIN_ID } from '../../../common';
import { useKibana } from '../../hooks/use_kibana';
import { SavedPlaygroundFormFetchError } from '../../types';

export const SavedPlaygroundFetchError = () => {
  const {
    services: { application },
  } = useKibana();
  const { getValues } = useFormContext<SavedPlaygroundFormFetchError>();
  const formData = useMemo(() => getValues(), [getValues]);
  const goToPlayground = useCallback(() => {
    application.navigateToApp(PLUGIN_ID);
  }, [application]);
  return (
    <KibanaPageTemplate.EmptyPrompt
      iconType="logoElasticsearch"
      title={
        <h1>
          {i18n.translate('xpack.searchPlayground.savedPlayground.fetchError.title', {
            defaultMessage: 'Error loading playground',
          })}
        </h1>
      }
      body={<p>{formData.error.message}</p>}
      actions={
        <EuiButton data-test-subj="savedPlaygroundFetchErrorCTA" onClick={goToPlayground} fill>
          {i18n.translate('xpack.searchPlayground.savedPlayground.fetchError.action1', {
            defaultMessage: 'Back to Playgrounds',
          })}
        </EuiButton>
      }
    />
  );
};
