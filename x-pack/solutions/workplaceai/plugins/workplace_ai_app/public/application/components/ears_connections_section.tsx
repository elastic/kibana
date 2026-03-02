/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import crypto from 'crypto';
import React, { useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiButton,
  EuiPanel,
  EuiText,
  EuiSpacer,
  EuiFieldText,
  EuiAvatar,
  EuiCallOut,
  EuiDescriptionList,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { GoogleUserInfo } from '../../../common';
import { EarsOAuthProvider } from '../../../common';
import type { WorkplaceAIClientConfig } from '../../types';
import { useWorkplaceAIConfig, useKibana } from '../hooks/use_kibana';
import { useExchangeCode, useRefreshToken, useRevokeToken } from '../hooks/use_ears_oauth';

/*
 * WARNING
 * THIS CODE IS A THROWAWAY CODE PURELY FOR DEMONSTRATION PURPOSES
 * DO NOT TRY TO RE-USE IT, JUST DELETE IT
 */

const GOOGLE_SCOPES = [
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.metadata.readonly',
];

function getEARSAuthUrl(
  config: WorkplaceAIClientConfig,
  kibanaBasePath: string | undefined,
  pkceCodeVerifier: string | undefined,
  state: string | null
): string | undefined {
  if (!kibanaBasePath) {
    return undefined;
  }

  const earsUrl = config.ears.url;

  const params = new URLSearchParams();
  GOOGLE_SCOPES.forEach((s) => params.append('scope', s));
  params.set('callback_uri', `${kibanaBasePath}/app/workplace_ai`);
  if (pkceCodeVerifier) {
    params.set('pkce_challenge', calculateCodeChallenge(pkceCodeVerifier));
    params.set('pkce_method', 'S256');
  }
  if (state) {
    params.set('state', state);
  }

  const authUrl = earsUrl
    ? `${earsUrl}/${EarsOAuthProvider.Google}/oauth/authorize?${params.toString()}`
    : undefined;

  return authUrl;
}

function generateCodeVerifier(length: number = 43) {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function calculateCodeChallenge(codeVerifier: string): string {
  // Step 1: Create a SHA-256 hash of the input
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();

  // Step 2: Convert the hash to Base64 (standard Base64 first)
  const base64 = hash.toString('base64');

  // Step 3: Convert Base64 to URL-safe Base64
  const base64UrlSafe = base64
    .replace(/\+/g, '-') // Replace '+' with '-'
    .replace(/\//g, '_') // Replace '/' with '_'
    .replace(/=+$/, ''); // Remove '=' padding

  return base64UrlSafe;
}

export const EarsConnectionsSection: React.FC = () => {
  const config = useWorkplaceAIConfig();
  const { http } = useKibana().services;
  const basePath = http.basePath.publicBaseUrl;

  const urlParams = new URLSearchParams(window.location.search);

  const code = urlParams.get('code');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [pkceCodeVerifier, setPkceCodeVerifier] = useState<string>(
    code !== null ? '' : generateCodeVerifier(128)
  );
  const [state, setState] = useState<string | null>(urlParams.get('state'));
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [earsLoading, setEarsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<GoogleUserInfo | null>(null);
  const [userInfoError, setUserInfoError] = useState<string | null>(null);
  const [userInfoLoading, setUserInfoLoading] = useState(false);
  const [earsError, setEarsError] = useState<string | null>(null);

  const earsAuthUrl = getEARSAuthUrl(config, basePath, pkceCodeVerifier, state);

  const exchangeCodeMutation = useExchangeCode();

  const handleExchangeCode = () => {
    if (!code) return;
    if (!pkceCodeVerifier || pkceCodeVerifier === '') {
      setEarsError(
        'PKCE Code Verifier is required. If you forgot to copy it you will need to restart the flow'
      );
      return;
    }

    setEarsError(null);
    setEarsLoading(true);

    exchangeCodeMutation.mutate(
      { provider: EarsOAuthProvider.Google, code, pkceCodeVerifier },
      {
        onSuccess: (data) => {
          if (!data.access_token || data.access_token.length === 0) {
            setEarsError(
              'Got empty token. Likely your access code is invalid - delete it from the query parameters and try the flow again'
            );
            return;
          }

          setAccessToken(data.access_token);
          if (data.refresh_token) {
            setRefreshToken(data.refresh_token);
          }
          setEarsError(null);
        },
        onError: (error) => {
          setEarsError(`Failed to exchange code for token: ${error}`);
        },
        onSettled: () => {
          setEarsLoading(false);
        },
      }
    );
  };

  const handleWhoAmI = async () => {
    setUserInfoLoading(true);
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!userInfoResponse.ok) {
        throw new Error(`Failed to fetch user info: ${userInfoResponse.status}`);
      }
      const userInfoData = (await userInfoResponse.json()) as GoogleUserInfo;
      setUserInfo(userInfoData);
      setUserInfoError(null);
    } catch (error) {
      setUserInfo(null);
      setUserInfoError(error instanceof Error ? error.message : 'Failed to fetch user info');
    } finally {
      setUserInfoLoading(false);
    }
  };

  const refreshTokenMutation = useRefreshToken();

  const handleRefreshToken = async () => {
    if (!refreshToken) return;
    setEarsLoading(true);

    refreshTokenMutation.mutate(
      { provider: EarsOAuthProvider.Google, refresh_token: refreshToken },
      {
        onSuccess: (data) => {
          setAccessToken(data.access_token);
          setEarsError(null);
        },
        onError: (error) => {
          setEarsError(`Failed to refresh token: ${error}`);
        },
        onSettled: () => {
          setEarsLoading(false);
        },
      }
    );
  };

  const revokeTokensMutation = useRevokeToken();

  const handleRevokeToken = async () => {
    if (!accessToken) return;
    setEarsLoading(true);

    revokeTokensMutation.mutate(
      { provider: EarsOAuthProvider.Google, token: accessToken },
      {
        onSuccess: () => {
          setEarsError(null);
        },
        onError: (error) => {
          setEarsError(`Failed to revoke the token: ${error}`);
        },
        onSettled: () => {
          setEarsLoading(false);
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
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.stateTitle"
                  defaultMessage="OAuth State (will be sent to EARS, when returned back should be the same!"
                />
              </h3>
            </EuiTitle>
            <EuiFieldText
              placeholder={i18n.translate('xpack.workplaceai.state.placeholder', {
                defaultMessage: 'Put your state here',
              })}
              value={state || ''}
              onChange={(e) => setState(e.target.value)}
              readOnly={!!code}
              fullWidth
              aria-label={i18n.translate('xpack.workplaceai.state.ariaLabel', {
                defaultMessage: 'State',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiPanel paddingSize="l">
        <EuiFlexGroup alignItems="center" gutterSize="l">
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>
                {pkceCodeVerifier && !code ? (
                  <FormattedMessage
                    id="xpack.workplaceai.gettingStarted.earsSection.pkceCopyTitle"
                    defaultMessage="PKCE Code Verifier (copy it for exchanging code for token later)"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.workplaceai.gettingStarted.earsSection.pkcePasteTitle"
                    defaultMessage="PKCE Code Verifier (paste it here to exchange the token)"
                  />
                )}
              </h3>
            </EuiTitle>
            <EuiFieldText
              placeholder={i18n.translate('xpack.workplaceai.pkceCodeVerifier.placeholder', {
                defaultMessage: 'Paste your PKCE Code Verifier',
              })}
              value={pkceCodeVerifier}
              onChange={(e) => setPkceCodeVerifier(e.target.value)}
              readOnly={!code}
              fullWidth
              aria-label={i18n.translate('xpack.workplaceai.pkceCodeVerifier.ariaLabel', {
                defaultMessage: 'PKCE Code Verifier',
              })}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>

      {!code && (
        <EuiPanel paddingSize="l">
          <EuiFlexGroup alignItems="center" gutterSize="l">
            <EuiFlexItem grow={false}>
              <EuiAvatar name="Google" iconType="logoGoogleG" size="l" color="plain" />
            </EuiFlexItem>
            {earsAuthUrl && (
              <>
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
                    <EuiFlexItem>
                      <EuiButton href={earsAuthUrl} isDisabled={!earsAuthUrl}>
                        <FormattedMessage
                          id="xpack.workplaceai.gettingStarted.earsSection.connectGoogleButton"
                          defaultMessage="Connect to Google"
                        />
                      </EuiButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              </>
            )}
            {!earsAuthUrl && (
              <EuiFlexItem>
                <EuiTitle size="xs">
                  <h3>
                    <FormattedMessage
                      id="xpack.workplaceai.gettingStarted.earsSection.notWorking"
                      defaultMessage="Not possible to use EARS"
                    />
                  </h3>
                </EuiTitle>
                <EuiText size="s" color="subdued">
                  <FormattedMessage
                    id="xpack.workplaceai.gettingStarted.earsSection.noPublicKibanaUrl"
                    defaultMessage="server.publicBaseUrl setting is not found. Not possible to form callback_uri"
                  />
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      )}

      {code && (
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
                  defaultMessage="Code received, you can try it out!"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                {!accessToken && (
                  <EuiFlexItem>
                    <EuiButton color="success" onClick={handleExchangeCode} isLoading={earsLoading}>
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
                          values={{ tokenSuffix: accessToken.slice(-10) }}
                        />
                      }
                      color="success"
                      iconType="check"
                    />
                  </EuiFlexItem>
                )}
                {refreshToken && (
                  <EuiFlexItem>
                    <EuiButton color="primary" onClick={handleRefreshToken} isLoading={earsLoading}>
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.earsSection.refreshTokenButton"
                        defaultMessage="Refresh Token"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
                {accessToken && (
                  <EuiFlexItem>
                    <EuiButton color="primary" onClick={handleRevokeToken} isLoading={earsLoading}>
                      <FormattedMessage
                        id="xpack.workplaceai.gettingStarted.earsSection.revokeTokenButton"
                        defaultMessage="Revoke Token"
                      />
                    </EuiButton>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            {earsError && (
              <>
                <EuiSpacer size="m" />
                <EuiCallOut
                  announceOnMount
                  title={
                    <FormattedMessage
                      id="xpack.workplaceai.gettingStarted.earsSection.earsInfoErrorTitle"
                      defaultMessage="Failed to execute EARS call"
                    />
                  }
                  color="warning"
                  iconType="warning"
                >
                  {earsError}
                </EuiCallOut>
              </>
            )}
          </EuiFlexGroup>
        </EuiPanel>
      )}
      {code && (
        <EuiPanel paddingSize="l">
          <EuiFlexGroup alignItems="center" gutterSize="l">
            <EuiFlexItem>
              <EuiButton color="primary" onClick={handleWhoAmI} isLoading={userInfoLoading}>
                <FormattedMessage
                  id="xpack.workplaceai.gettingStarted.earsSection.whoAmIButton"
                  defaultMessage="Who Am I?"
                />
              </EuiButton>
            </EuiFlexItem>
            {userInfo && (
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
          </EuiFlexGroup>
        </EuiPanel>
      )}
    </EuiFlexGroup>
  );
};
