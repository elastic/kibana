/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiAvatar,
  EuiCallOut,
  EuiDescriptionList,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EarsOAuthProvider, GoogleUserInfo } from '../../../common';
import { useWorkplaceAIConfig } from '../hooks/use_kibana';
import { useExchangeCode, useRefreshToken } from '../hooks/use_ears_oauth';

const GOOGLE_SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];


function getEARSAuthUrl() : string | undefined {
  const config = useWorkplaceAIConfig();
  const earsUrl = config.ears.url;

  const params = new URLSearchParams();
  GOOGLE_SCOPES.forEach((s) => params.append('scope', s));
  params.set('callback_uri', 'http://localhost:5601/app/workplace_ai')

  const authUrl = earsUrl
    ? `${earsUrl}/${EarsOAuthProvider.Google}/oauth/authorize?${params.toString()}`
    : undefined;

  return authUrl;
}

export const EarsConnectionsSection: React.FC = () => {
  const earsAuthUrl = getEARSAuthUrl()

  const urlParams = new URLSearchParams(window.location.search);

  const [code, setCode] = useState<string | null>(urlParams.get('code'));
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);

  const exchangeCodeMutation = useExchangeCode();

  const handleExchangeCode = () => {
    if (!code) return;

    exchangeCodeMutation.mutate(
      { provider: EarsOAuthProvider.Google, code },
      {
        onSuccess: (data) => {
          setAccessToken(data.access_token);
          if (data.refresh_token) {
            setRefreshToken(data.refresh_token);
          }
        },
        onError: (error) => {
          console.error('Failed to exchange code:', error);
        },
      }
    );
  };

  const handleWhoAmI = async () => {
    if (!accessToken) return;
    try {
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userInfoResponse.statusText}`);
      }
      const userInfoData = (await userInfoResponse.json()) as GoogleUserInfo;
      setUserInfo(userInfoData);
    } catch (error) {
      setUserInfoError(error instanceof Error ? error.message : 'Failed to fetch user info');
    }
  };

  const useRefreshTokenMutation = useRefreshToken();

  const handleRefreshToken = async () => {
    if (!refreshToken) return;

    useRefreshTokenMutation.mutate(
      { provider: EarsOAuthProvider.Google, refresh_token: refreshToken },
      {
        onSuccess: (data) => {
          setAccessToken(data.access_token);
        },
        onError: (error) => {
          console.error('Failed to exchange code:', error);
        },
      }
    );
  };

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
                {!code && (
                <EuiFlexItem>
                  <EuiButton
                    href={earsAuthUrl}
                    isDisabled={!earsAuthUrl}
                  >
                    <FormattedMessage
                      id="xpack.workplaceai.gettingStarted.earsSection.connectGoogleButton"
                      defaultMessage="Connect to Google"
                    />
                  </EuiButton>
                </EuiFlexItem>
                )}
                {code && !accessToken && (
                  <EuiFlexItem>
                    <EuiButton
                      color="success"
                      onClick={handleExchangeCode}
                    >
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.earsSection.exchangeCodeButton"
                        defaultMessage="Exchange code for token"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
                {accessToken && (
                  <EuiFlexItem>
                    <EuiCallOut
                      title={
                        <FormattedMessage
                          id="xpack.workplaceai.gettingStarted.earsSection.gotAccessToken"
                          defaultMessage="Got a token: ...{tokenSuffix}"
                          values={{ tokenSuffix: accessToken }}
                        />
                      }
                      color="success"
                      iconType="check"
                    />
                  </EuiFlexItem>
                )}
                {accessToken && (
                  <EuiFlexItem>
                    <EuiButton
                      color="primary"
                      onClick={handleWhoAmI}
                    >
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.earsSection.whoAmIButton"
                        defaultMessage="Who Am I?"
                      />
                    </EuiButton>
                  </EuiFlexItem>
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
                            <EuiAvatar name={userInfo.email} imageUrl={userInfo.picture} size="l" />
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
                {refreshToken && (
                  <EuiFlexItem>
                    <EuiButton
                      color="primary"
                      onClick={handleRefreshToken}
                    >
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.earsSection.refreshTokenButton"
                        defaultMessage="Refresh Token"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiFlexGroup>
  );
};
