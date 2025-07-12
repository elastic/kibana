/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiText, EuiLink, EuiEmptyPrompt, EuiSwitch, EuiSpacer, EuiForm } from '@elastic/eui';
import { SpacesContextProps } from '@kbn/spaces-plugin/public';
import { i18n } from '@kbn/i18n';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { IHttpFetchError, ResponseErrorBody } from '@kbn/core-http-browser';
import { ALL_SPACES_ID } from '@kbn/security-plugin/public';
import { FormProvider } from 'react-hook-form';
import { SyntheticsProjectAPIKey } from '../../../../../../common/runtime_types/settings/api_key';
import { HelpCommands } from './help_commands';
import { LoadingState } from '../../monitors_page/overview/overview/monitor_detail_flyout';
import { fetchProjectAPIKey } from '../../../state/monitor_management/api';
import { ClientPluginsStart } from '../../../../../plugin';
import { useEnablement } from '../../../hooks';
import { SpaceSelector } from '../components/spaces_select';
import { useFormWrapped } from '../../../../../hooks/use_form_wrapped';
import { useFeatureId } from '../../../../../hooks/use_capabilities';
import { ApiKeyBtn } from './api_key_btn';

const syntheticsTestRunDocsLink =
  'https://www.elastic.co/guide/en/observability/current/synthetic-run-tests.html';
const getEmptyFunctionComponent: React.FC<SpacesContextProps> = ({ children }) => <>{children}</>;

export const ProjectAPIKeys = () => {
  const { loading: enablementLoading, canManageApiKeys } = useEnablement();
  const [apiKey, setApiKey] = useState<string | undefined>(undefined);
  const [loadAPIKey, setLoadAPIKey] = useState(false);
  const [accessToElasticManagedLocations, setAccessToElasticManagedLocations] = useState(true);
  const SYNTHETICS_FEATURE_ID = useFeatureId();

  const form = useFormWrapped({
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      spaces: [ALL_SPACES_ID],
    },
  });

  const { handleSubmit } = form;

  const { spaces: spacesApi } = useKibana<ClientPluginsStart>().services;
  const spaces = useMemo(() => form.getValues()?.spaces, [form]);

  const ContextWrapper = useMemo(
    () =>
      spacesApi ? spacesApi.ui.components.getSpacesContextProvider : getEmptyFunctionComponent,
    [spacesApi]
  );

  const kServices = useKibana<ClientPluginsStart>().services;
  const canSaveIntegrations: boolean =
    !!kServices?.fleet?.authz.integrations.writeIntegrationPolicies;

  const canUsePublicLocations =
    useKibana().services?.application?.capabilities[SYNTHETICS_FEATURE_ID]
      ?.elasticManagedLocationsEnabled ?? true;

  const { data, loading, error } = useFetcher(async () => {
    if (loadAPIKey) {
      return fetchProjectAPIKey(
        accessToElasticManagedLocations && Boolean(canUsePublicLocations),
        spaces
      );
    }
    return null;
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Synthetics folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAPIKey, canUsePublicLocations, spaces]);

  const onSubmit = (formData: SyntheticsProjectAPIKey) => {
    if (formData.spaces?.length) {
      setLoadAPIKey(true);
    }
  };

  useEffect(() => {
    if (data?.apiKey) {
      setApiKey(data?.apiKey.encoded);
    }
    setLoadAPIKey(false);
  }, [data]);

  useEffect(() => {
    if (error) {
      const requestError = error as IHttpFetchError<ResponseErrorBody>;
      kServices?.notifications?.toasts.addError(error, {
        title: i18n.translate('xpack.synthetics.createApiKey.error', {
          defaultMessage: 'Error',
        }),
        toastMessage: requestError?.body?.message,
      });
    }
  }, [error, kServices?.notifications?.toasts]);

  const canSave: boolean =
    !!useKibana().services?.application?.capabilities[SYNTHETICS_FEATURE_ID]?.save;

  if (enablementLoading) {
    return <LoadingState />;
  }

  return (
    <ContextWrapper>
      <FormProvider {...form}>
        <EuiEmptyPrompt
          style={{ maxWidth: '50%' }}
          title={<h2>{GET_API_KEY_GENERATE}</h2>}
          body={
            canSave && canManageApiKeys ? (
              <EuiForm component="form" noValidate>
                <EuiText>
                  {GET_API_KEY_LABEL_DESCRIPTION}{' '}
                  {!canSaveIntegrations ? `${API_KEY_DISCLAIMER} ` : ''}
                  <EuiLink
                    data-test-subj="syntheticsProjectAPIKeysLink"
                    href={syntheticsTestRunDocsLink}
                    external
                    target="_blank"
                  >
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
                <EuiSpacer />
                <EuiSwitch
                  label={i18n.translate('xpack.synthetics.features.elasticManagedLocations', {
                    defaultMessage: 'Elastic managed locations enabled',
                  })}
                  checked={accessToElasticManagedLocations && Boolean(canUsePublicLocations)}
                  onChange={() => {
                    setAccessToElasticManagedLocations(!accessToElasticManagedLocations);
                  }}
                  disabled={!canUsePublicLocations}
                />
                <SpaceSelector helpText={API_KEY_HELP_TEXT} />
              </EuiForm>
            ) : (
              <>
                <EuiText>
                  {GET_API_KEY_REDUCED_PERMISSIONS_LABEL}{' '}
                  <EuiLink
                    data-test-subj="syntheticsProjectAPIKeysLink"
                    href={syntheticsTestRunDocsLink}
                    external
                    target="_blank"
                  >
                    {LEARN_MORE_LABEL}
                  </EuiLink>
                </EuiText>
              </>
            )
          }
          actions={
            <ApiKeyBtn
              loading={loading}
              onClick={handleSubmit(onSubmit)}
              apiKey={apiKey}
              isDisabled={!canSave || !canManageApiKeys}
            />
          }
        />
        {apiKey && <HelpCommands apiKey={apiKey} />}
      </FormProvider>
    </ContextWrapper>
  );
};

const LEARN_MORE_LABEL = i18n.translate('xpack.synthetics.monitorManagement.learnMore.label', {
  defaultMessage: 'Learn more',
});

const GET_API_KEY_GENERATE = i18n.translate(
  'xpack.synthetics.monitorManagement.getProjectAPIKeyLabel.generate',
  {
    defaultMessage: 'Generate Project API Key',
  }
);

const GET_API_KEY_LABEL_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.description',
  {
    defaultMessage: 'Use an API key to push monitors remotely from a CLI or CD pipeline.',
  }
);

const API_KEY_DISCLAIMER = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyLabel.disclaimer',
  {
    defaultMessage:
      'Please note: In order to use push monitors using private testing locations, you must generate this API key with a user who has Fleet and Integrations write permissions.',
  }
);

const GET_API_KEY_REDUCED_PERMISSIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.getAPIKeyReducedPermissions.description',
  {
    defaultMessage:
      'Use an API key to push monitors remotely from a CLI or CD pipeline. To generate an API key, you must have permissions to manage API keys and Uptime write access. Please contact your administrator.',
  }
);

const API_KEY_HELP_TEXT = i18n.translate('xpack.synthetics.privateLocation.apiKeySpacesHelpText', {
  defaultMessage: 'Select the spaces where this API key will be available.',
});
