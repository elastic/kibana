/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormInfoField } from '@kbn/search-shared-ui';
import { ANALYTICS_APP_API_KEY_PATH } from '../../../../common/analytics_app_api_key';
import type {
  AnalyticsAppApiKeyAvailability,
  AnalyticsAppApiKeyRequest,
  AnalyticsAppApiKeyResult,
  AppApiKeyUnavailableReason,
} from '../../../../common/analytics_app_api_key';
import { useKibana } from '../../../hooks/use_kibana';
import { ANALYTICS_TELEMETRY_PREFIX } from '../../constants';
import { useElasticsearchUrl } from '../../hooks/use_elasticsearch_url';
import { buildQuerySnippets } from '../../query_snippets';
import type { AnalyticsStarterQuery } from '../../types';
import { CodeSnippets } from './code_snippets';

const getUnavailableMessage = (reason: AppApiKeyUnavailableReason, index: string): string => {
  switch (reason) {
    case 'apiKeysDisabled':
      return i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.apiKeysDisabled', {
        defaultMessage: 'API keys are turned off in Elasticsearch.',
      });
    case 'missingApiKeyPrivilege':
      return i18n.translate(
        'xpack.searchHomepage.analytics.useInAppFlyout.missingApiKeyPrivilege',
        {
          defaultMessage: 'Your role needs the manage_own_api_key cluster privilege.',
        }
      );
    case 'missingReadPrivilege':
      return i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.missingReadPrivilege', {
        defaultMessage: 'Your role needs the read privilege on {index}.',
        values: { index },
      });
    case 'sourceNotFound':
      return i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.sourceNotFound', {
        defaultMessage: '{index} no longer exists.',
        values: { index },
      });
  }
};

const REASONS: readonly AppApiKeyUnavailableReason[] = [
  'apiKeysDisabled',
  'missingApiKeyPrivilege',
  'missingReadPrivilege',
  'sourceNotFound',
];

interface RequestFailure {
  body?: { attributes?: { reason?: string } };
}

const getFailureReason = ({ body }: RequestFailure): AppApiKeyUnavailableReason | undefined =>
  REASONS.find((reason) => reason === body?.attributes?.reason);

export interface UseInAppFlyoutProps {
  query: AnalyticsStarterQuery;
  /** The index or data stream the query reads, which is all the API key may read. */
  sourceName: string;
  /** The field the request is limited to the starter query time range on, when Discover does so too. */
  timeField?: string;
  /** A key made for this source earlier on this page. It is kept in memory only. */
  apiKey: AnalyticsAppApiKeyResult | undefined;
  onApiKeyCreated: (apiKey: AnalyticsAppApiKeyResult) => void;
  onClose: () => void;
}

/** Shows how to run a starter query from the user's own code, with a key that can only read its source. */
export const UseInAppFlyout = ({
  query,
  sourceName,
  timeField,
  apiKey,
  onApiKeyCreated,
  onClose,
}: UseInAppFlyoutProps): React.JSX.Element => {
  const { http, cloud } = useKibana().services;
  const elasticsearchUrl = useElasticsearchUrl();
  const titleId = useGeneratedHtmlId({ prefix: 'analyticsUseInAppFlyoutTitle' });
  const [availability, setAvailability] = useState<AnalyticsAppApiKeyAvailability>();
  const [isCreating, setIsCreating] = useState(false);
  const [hasCreateFailed, setHasCreateFailed] = useState(false);
  const [hasJustCreated, setHasJustCreated] = useState(false);
  const keyRef = useRef<HTMLDivElement | null>(null);
  const hasKey = apiKey !== undefined;

  useEffect(() => {
    if (hasKey) {
      return;
    }
    let isCurrent = true;
    http
      .get<AnalyticsAppApiKeyAvailability>(ANALYTICS_APP_API_KEY_PATH, {
        query: { index: sourceName },
      })
      .then((result) => {
        if (isCurrent) {
          setAvailability(result);
        }
      })
      // The button stays usable when the check fails: creating the key reports why it cannot.
      .catch(() => {
        if (isCurrent) {
          setAvailability({ canCreate: true });
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [http, sourceName, hasKey]);

  useEffect(() => {
    if (hasJustCreated) {
      keyRef.current?.focus();
    }
  }, [hasJustCreated]);

  const createKey = async (): Promise<void> => {
    setIsCreating(true);
    setHasCreateFailed(false);
    try {
      const body: AnalyticsAppApiKeyRequest = { index: sourceName };
      const created = await http.post<AnalyticsAppApiKeyResult>(ANALYTICS_APP_API_KEY_PATH, {
        body: JSON.stringify(body),
      });
      onApiKeyCreated(created);
      setHasJustCreated(true);
    } catch (error) {
      const reason = getFailureReason(error);
      if (reason === undefined) {
        setHasCreateFailed(true);
      } else {
        setAvailability({ canCreate: false, reason });
      }
    } finally {
      setIsCreating(false);
    }
  };

  const snippets = useMemo(
    () =>
      buildQuerySnippets(
        query.esql,
        {
          elasticsearchUrl,
          apiKey: apiKey?.encoded,
          isServerless: cloud?.isServerlessEnabled === true,
        },
        timeField
      ),
    [query.esql, elasticsearchUrl, apiKey, cloud, timeField]
  );

  const unavailableMessage =
    availability?.canCreate === false
      ? getUnavailableMessage(availability.reason, sourceName)
      : undefined;
  const scopeNote = i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.keyScope', {
    defaultMessage: 'The key can only read {index}.',
    values: { index: sourceName },
  });

  return (
    <EuiFlyout
      onClose={onClose}
      size="m"
      aria-labelledby={titleId}
      data-test-subj="analyticsUseInAppFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id={titleId}>
            {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.title', {
              defaultMessage: 'Use in your app',
            })}
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p data-test-subj="analyticsUseInAppQuestion">{query.question}</p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.keyTitle', {
              defaultMessage: 'API key',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        {hasKey ? (
          <div ref={keyRef} tabIndex={-1} data-test-subj="analyticsUseInAppKey">
            <FormInfoField
              label={apiKey.name}
              value={apiKey.encoded}
              copyValue={apiKey.encoded}
              dataTestSubj="analyticsUseInAppKeyValue"
              copyValueDataTestSubj="analyticsUseInAppCopyKey"
            />
            <EuiSpacer size="s" />
            <EuiText size="s" color="subdued">
              <p>{scopeNote}</p>
              <p>
                {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.keyShownOnce', {
                  defaultMessage: 'Copy it before you leave this page. It is not shown again.',
                })}
              </p>
            </EuiText>
          </div>
        ) : (
          <EuiFlexGroup gutterSize="m" alignItems="center" wrap>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                iconType="key"
                onClick={createKey}
                isLoading={isCreating || availability === undefined}
                isDisabled={availability?.canCreate === false}
                hasAriaDisabled
                data-test-subj="analyticsUseInAppCreateKey"
                data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-useInAppFlyout-createKey`}
              >
                {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.createKeyButton', {
                  defaultMessage: 'Create read-only API key',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText
                size="s"
                color={hasCreateFailed ? 'danger' : 'subdued'}
                role={hasCreateFailed ? 'alert' : undefined}
                data-test-subj="analyticsUseInAppKeyNote"
              >
                <p>
                  {hasCreateFailed
                    ? i18n.translate(
                        'xpack.searchHomepage.analytics.useInAppFlyout.createKeyFailed',
                        { defaultMessage: 'The API key could not be created. Try again.' }
                      )
                    : unavailableMessage ?? scopeNote}
                </p>
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        )}
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.requestTitle', {
              defaultMessage: 'Request',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.serverSide', {
              defaultMessage: 'Send it from your server, so the API key stays out of the browser.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <CodeSnippets snippets={snippets} idPrefix={`${ANALYTICS_TELEMETRY_PREFIX}UseInApp`} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty
          flush="left"
          onClick={onClose}
          data-test-subj="analyticsUseInAppFlyoutClose"
          data-telemetry-id={`${ANALYTICS_TELEMETRY_PREFIX}-useInAppFlyout-close`}
        >
          {i18n.translate('xpack.searchHomepage.analytics.useInAppFlyout.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
