/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// receives the configuration from the parser and renders
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import { reduce } from 'lodash';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiToolTip } from '@elastic/eui';
import { getFieldValue } from '@kbn/discover-utils';
import type { EcsSecurityExtension as Ecs } from '@kbn/securitysolution-ecs';
import { getTimelineFieldsDataFromHit } from '@kbn/timelines-plugin/common';
import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';
import type { EventHit } from '@kbn/timelines-plugin/common/search_strategy';
import { useUpsellingMessage } from '../../../../hooks/use_upselling';
import { expandDottedObject } from '../../../../../../common/utils/expand_dotted';
import { AlertDataContext } from '../../../../../flyout_v2/investigation_guide/components/investigation_guide_view';
import OsqueryLogo from './osquery_icon/osquery.svg';
import { OsqueryFlyout } from '../../../../../detections/components/osquery/osquery_flyout';

export const OsqueryRenderer = ({
  configuration,
}: {
  configuration: {
    label?: string;
    query: string;
    ecs_mapping: { [key: string]: {} };
    test: [];
  };
}) => {
  const [showFlyout, setShowFlyout] = useState(false);
  const hit = useContext(AlertDataContext);
  const agentId = useMemo(() => getFieldValue(hit, 'agent.id') as string | undefined, [hit]);
  const alertId = useMemo(() => hit.raw._id, [hit]);
  // This is a duplication of the code happening in the `timelineSearchStrategy`
  // We're doing this here to avoid having to refactor the `OsqueryFlyout` to receive the data in a different format.
  // The approach is to recreate the array similar to the one returned within the `timelineSearchStrategy` and that we often call in the call `dataFormattedForFieldBrowser`;
  // We should eventually refactor the `OsqueryFlyout` to accept the raw hit.
  const data = getTimelineFieldsDataFromHit(hit.raw as SearchHit<EventHit>);

  const handleOpen = useCallback(() => setShowFlyout(true), [setShowFlyout]);

  const handleClose = useCallback(() => setShowFlyout(false), [setShowFlyout]);

  const interactionsUpsellingMessage = useUpsellingMessage('investigation_guide_interactions');

  const ecsData = useMemo(() => {
    const fieldsMap: Record<string, string> = reduce(
      data,
      (acc, eventDetailItem) => ({
        ...acc,
        [eventDetailItem.field]: eventDetailItem?.values?.[0],
      }),
      {}
    );
    return expandDottedObject(fieldsMap) as Ecs;
  }, [data]);

  return (
    <>
      <EuiToolTip content={interactionsUpsellingMessage}>
        <EuiButton
          iconType={OsqueryLogo}
          onClick={handleOpen}
          disabled={!!interactionsUpsellingMessage}
          css={css`
            > span > img {
              margin-block-end: 0;
            }
          `}
        >
          {configuration.label ??
            i18n.translate('xpack.securitySolution.markdown.osquery.runOsqueryButtonLabel', {
              defaultMessage: 'Run Osquery',
            })}
        </EuiButton>
      </EuiToolTip>
      {showFlyout && (
        <OsqueryFlyout
          defaultValues={{
            ...(alertId ? { alertIds: [alertId] } : {}),
            query: configuration.query,
            ecs_mapping: configuration.ecs_mapping,
            queryField: false,
          }}
          agentId={agentId}
          onClose={handleClose}
          ecsData={ecsData}
        />
      )}
    </>
  );
};
