/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { useMotionRefreshSettings } from '@kbn/react-kibana-context-root';
import { OrbitDotsLoader } from './orbit_dots_loader';
import { ShimmeringText } from './shimmering_text';

const TITLE = i18n.translate('xpack.alertzero.workersRunningPanel.title', {
  defaultMessage: 'Workers are running in the background...',
});

export const WorkersRunningPanel: React.FC = () => {
  const { dots, shimmer } = useMotionRefreshSettings();

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="xl"
      data-test-subj="alertZeroWorkersRunningPanel"
    >
      <EuiEmptyPrompt
        {...(dots ? { icon: <OrbitDotsLoader /> } : { iconType: 'logoElastic' })}
        paddingSize="none"
        body={<p>{shimmer ? <ShimmeringText text={TITLE} /> : TITLE}</p>}
      />
    </EuiPanel>
  );
};
