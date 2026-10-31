/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useState } from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SYNTHETICS_API_URLS } from '../../../../../common/constants';
import { SyntheticsSettingsContext } from '../../contexts';
import { useGetUrlParams } from '../../hooks';

export const getJourneyVideoUrl = ({
  basePath,
  checkGroup,
  remoteName,
  timestamp,
}: {
  basePath: string;
  checkGroup: string;
  remoteName?: string;
  timestamp?: string;
}): string => {
  const path = `${basePath}${SYNTHETICS_API_URLS.JOURNEY_VIDEO.replace(
    '{checkGroup}',
    encodeURIComponent(checkGroup)
  )}`;
  const params = new URLSearchParams();
  if (remoteName) params.set('remoteName', remoteName);
  if (timestamp) params.set('timestamp', timestamp);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
};

/** Renders nothing when the run has no recording (route responds 404). */
export const JourneyVideo = ({
  checkGroup,
  timestamp,
}: {
  checkGroup?: string;
  timestamp?: string;
}) => {
  const { basePath } = useContext(SyntheticsSettingsContext);
  const { remoteName } = useGetUrlParams();
  const [hasError, setHasError] = useState(false);

  if (!checkGroup || hasError) {
    return null;
  }

  return (
    <>
      <EuiPanel hasShadow={false} hasBorder data-test-subj="syntheticsJourneyVideoPanel">
        <EuiTitle size="xs">
          <h3>{VIDEO_TITLE}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <video
          key={checkGroup}
          controls
          preload="metadata"
          css={{ width: '100%', maxHeight: 480 }}
          src={getJourneyVideoUrl({ basePath, checkGroup, remoteName, timestamp })}
          onError={() => setHasError(true)}
          data-test-subj="syntheticsJourneyVideo"
        />
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};

const VIDEO_TITLE = i18n.translate('xpack.synthetics.testRunDetails.journeyVideo.title', {
  defaultMessage: 'Recording',
});
