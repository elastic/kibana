/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiButtonEmpty, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { CLICK_BIN_SESSION_SAMPLE, type RumClickPoint } from '../../../../common/rum_click_map';

export function ClickMapHotspotCard({
  click,
  sampledClicks,
  showSessionsAction,
  onViewSessions,
}: {
  click: RumClickPoint;
  sampledClicks: number;
  showSessionsAction: boolean;
  onViewSessions?: (sessionIds: string[]) => void;
}) {
  const sessionIds = click.sessionIds ?? [];
  const sharePct = sampledClicks > 0 ? Math.round((click.count / sampledClicks) * 1000) / 10 : null;

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow
      data-test-subj={showSessionsAction ? 'uxClickMapPopover' : 'uxClickMapTooltip'}
      css={css`
        min-width: 200px;
        max-width: 260px;
      `}
    >
      <EuiText size="s">
        <p>
          <strong>
            <FormattedMessage
              id="xpack.ux.overview.clickMap.hotspotClicksLabel"
              defaultMessage="{count, plural, one {# click} other {# clicks}}"
              values={{ count: click.count }}
            />
          </strong>
        </p>
      </EuiText>
      {sharePct != null && (
        <EuiText size="xs" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.ux.overview.clickMap.hotspotShareDescription"
              defaultMessage="{percent}% of sampled clicks on this page"
              values={{ percent: sharePct }}
            />
          </p>
        </EuiText>
      )}
      <EuiText size="xs" color="subdued">
        <p>
          {sessionIds.length >= CLICK_BIN_SESSION_SAMPLE ? (
            <FormattedMessage
              id="xpack.ux.overview.clickMap.hotspotCappedSessionsDescription"
              defaultMessage="Sample of {count} sessions in this area — not every visit."
              values={{ count: sessionIds.length }}
            />
          ) : (
            <FormattedMessage
              id="xpack.ux.overview.clickMap.hotspotSampledDescription"
              defaultMessage="Sampled in this area — not every visit."
            />
          )}
        </p>
      </EuiText>
      {showSessionsAction && onViewSessions && sessionIds.length > 0 && (
        <>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            data-test-subj="uxClickMapViewSessions"
            size="xs"
            flush="left"
            iconType="play"
            onClick={() => onViewSessions(sessionIds)}
          >
            {i18n.translate('xpack.ux.overview.clickMap.viewSessionsButtonLabel', {
              defaultMessage: 'View sessions',
            })}
          </EuiButtonEmpty>
        </>
      )}
      {showSessionsAction && sessionIds.length === 0 && (
        <>
          <EuiSpacer size="xs" />
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.ux.overview.clickMap.noSessionSampleDescription"
                defaultMessage="No sessions in this sample."
              />
            </p>
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
}
