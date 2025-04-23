/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type AttackDiscovery, type AttackDiscoveryAlert } from '@kbn/elastic-assistant-common';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';

import { useDateFormat } from '../../../../../../../common/lib/kibana';
import { isAttackDiscoveryAlert } from '../../../../../utils/is_attack_discovery_alert';
import { getFormattedDate } from '../../../../../loading_callout/loading_messages/get_formatted_time';
import * as i18n from './translations';

interface Props {
  attackDiscovery: AttackDiscovery | AttackDiscoveryAlert;
}

const SubtitleComponent: React.FC<Props> = ({ attackDiscovery }) => {
  const {
    euiTheme: { font },
  } = useEuiTheme();
  const userName = useMemo(
    () => (isAttackDiscoveryAlert(attackDiscovery) ? attackDiscovery.userName : null),
    [attackDiscovery]
  );

  const userId = useMemo(
    () => (isAttackDiscoveryAlert(attackDiscovery) ? attackDiscovery.userId : null),
    [attackDiscovery]
  );

  const createdBy = useMemo(() => {
    const user = userName ?? userId;

    return user != null ? i18n.CREATED_BY_USER(user) : null;
  }, [userId, userName]);

  const dateFormat = useDateFormat();

  const formattedTimestamp = useMemo(
    () =>
      getFormattedDate({
        date: attackDiscovery.timestamp,
        dateFormat,
      }),
    [attackDiscovery.timestamp, dateFormat]
  );

  return isAttackDiscoveryAlert(attackDiscovery) ? (
    <EuiText
      css={css`
        font-size: ${font.scale.xxs}${font.defaultUnits};
      `}
      color="subdued"
      data-test-subj="subtitle"
    >
      <span data-test-subj="timestamp">{formattedTimestamp}</span>
      &nbsp;&nbsp;
      <span data-test-subj="createdBy">{createdBy}</span>
    </EuiText>
  ) : null;
};

SubtitleComponent.displayName = 'Subtitle';

export const Subtitle = React.memo(SubtitleComponent);
