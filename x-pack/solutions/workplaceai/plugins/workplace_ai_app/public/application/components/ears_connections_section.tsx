/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiDescriptionList,
  EuiAvatar,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EarsOAuthProvider, type GoogleUserInfo } from '../../../common';
import { useStartOAuth, useFetchSecrets } from '../hooks/use_ears_oauth';

const GOOGLE_SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

export const EarsConnectionsSection: React.FC = () => {
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isAuthWindowOpen, setIsAuthWindowOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);
  const [isFetchingUserInfo, setIsFetchingUserInfo] = useState(false);

  const startOAuthMutation = useStartOAuth();
  const fetchSecretsQuery = useFetchSecrets(requestId, false);

  const handleConnectGoogle = useCallback(async () => {
    try {
      const result = await startOAuthMutation.mutateAsync({
        provider: EarsOAuthProvider.Google,
        scope: GOOGLE_SCOPES,
      });

      setRequestId(result.request_id);
      setIsAuthWindowOpen(true);

      // Open the auth URL in a new tab
      window.open(result.auth_url, '_blank');
    } catch (error) {
      // Error is handled by mutation state
    }
  }, [startOAuthMutation]);

  const handleWhoAmI = useCallback(async () => {
    if (!requestId) return;

    setIsFetchingUserInfo(true);
    setUserInfoError(null);

    try {
      // First, fetch the secrets from EARS
      const secretsResult = await fetchSecretsQuery.refetch();

      if (!secretsResult.data?.access_token) {
        setUserInfoError(
          'OAuth flow may not be complete. Please complete the Google sign-in in the other tab first.'
        );
        setIsFetchingUserInfo(false);
        return;
      }

      // Then use the access token to get user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${secretsResult.data.access_token}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
      }

      const userInfoData = (await userInfoResponse.json()) as GoogleUserInfo;
      setUserInfo(userInfoData);
    } catch (error) {
      setUserInfoError(error instanceof Error ? error.message : 'Failed to fetch user info');
    } finally {
      setIsFetchingUserInfo(false);
    }
  }, [requestId, fetchSecretsQuery]);

  const isConnecting = startOAuthMutation.isLoading;
  const hasStartedAuth = !!requestId;
  const connectionError =
    startOAuthMutation.error?.body?.message || startOAuthMutation.error?.message;

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage
            id="xpack.workplaceai.gettingStarted.earsSection.title"
            defaultMessage="Test the Elastic Auth Redirect Service"
          />
        </h2>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <p>
          <FormattedMessage
            id="xpack.workplaceai.gettingStarted.earsSection.description"
            defaultMessage="Connect to external services, seamlessly."
          />
        </p>
      </EuiText>
      <EuiSpacer size="m" />

      <EuiPanel paddingSize="l">
        <EuiFlexGroup alignItems="center" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiAvatar name="Google" iconType="logoGoogleG" size="l" color="plain" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.googleTitle"
                  defaultMessage="Google"
                />
              </h3>
            </EuiTitle>
            <EuiText size="s" color="subdued">
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.earsSection.googleDescription"
                defaultMessage="Connect your Google account."
              />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              {!hasStartedAuth && (
                <EuiFlexItem>
                  <EuiButton
                    onClick={handleConnectGoogle}
                    isLoading={isConnecting}
                    disabled={isConnecting}
                  >
                    <FormattedMessage
                      id="xpack.workplaceai.gettingStarted.earsSection.connectGoogleButton"
                      defaultMessage="Connect to Google"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
              {hasStartedAuth && !userInfo && (
                <EuiFlexItem>
                  <EuiButton
                    onClick={handleWhoAmI}
                    isLoading={isFetchingUserInfo}
                    disabled={isFetchingUserInfo}
                    color="success"
                  >
                    <FormattedMessage
                      id="xpack.workplaceai.gettingStarted.earsSection.whoAmIButton"
                      defaultMessage="Who am I, in Google?"
                    />
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>

        {isAuthWindowOpen && !userInfo && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.authInProgressTitle"
                  defaultMessage="Complete authentication in the other tab"
                />
              }
              color="primary"
              iconType="popout"
            >
              <FormattedMessage
                id="xpack.workplaceai.gettingStarted.earsSection.authInProgressDescription"
                defaultMessage="A new tab has opened for Google authentication. Once complete, return here and click 'Who am I?' to verify your connection."
              />
            </EuiCallOut>
          </>
        )}

        {connectionError && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.errorTitle"
                  defaultMessage="Connection failed"
                />
              }
              color="danger"
              iconType="error"
            >
              {connectionError}
            </EuiCallOut>
          </>
        )}

        {userInfoError && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.userInfoErrorTitle"
                  defaultMessage="Failed to fetch user info"
                />
              }
              color="warning"
              iconType="warning"
            >
              {userInfoError}
            </EuiCallOut>
          </>
        )}

        {isFetchingUserInfo && (
          <>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <FormattedMessage
                    id="xpack.workplaceai.gettingStarted.earsSection.fetchingUserInfo"
                    defaultMessage="Fetching user information..."
                  />
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}

        {userInfo && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut
              announceOnMount
              title={
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.connectedTitle"
                  defaultMessage="Successfully connected!"
                />
              }
              color="success"
              iconType="check"
            >
              <EuiSpacer size="s" />
              <EuiFlexGroup alignItems="center" gutterSize="m">
                {userInfo.picture && (
                  <EuiFlexItem grow={false}>
                    <EuiAvatar name={userInfo.name} imageUrl={userInfo.picture} size="l" />
                  </EuiFlexItem>
                )}
                <EuiFlexItem>
                  <EuiDescriptionList
                    type="column"
                    compressed
                    listItems={[
                      {
                        title: (
                          <FormattedMessage
                            id="xpack.workplaceai.gettingStarted.earsSection.nameLabel"
                            defaultMessage="Name"
                          />
                        ),
                        description: userInfo.name,
                      },
                      {
                        title: (
                          <FormattedMessage
                            id="xpack.workplaceai.gettingStarted.earsSection.emailLabel"
                            defaultMessage="Email"
                          />
                        ),
                        description: userInfo.email,
                      },
                    ]}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiCallOut>
          </>
        )}
      </EuiPanel>
    </EuiFlexGroup>
  );
};
