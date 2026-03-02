/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable no-continue */

import React, { memo, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EuiBreadcrumb, EuiBasicTableColumn, EuiSearchBarProps } from '@elastic/eui';
import { EuiSpacer, EuiText, EuiInMemoryTable } from '@elastic/eui';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import { SECURITY_CELL_ACTIONS_DEFAULT } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { BoldCode, StyledTime } from './styles';
import { GeneratedText } from '../generated_text';
import { CellActionsMode, SecurityCellActions } from '../../../common/components/cell_actions';
import { getSourcererScopeId } from '../../../helpers';
import { Breadcrumbs } from './breadcrumbs';
import * as eventModel from '../../../../common/endpoint/models/event';
import * as selectors from '../../store/selectors';
import { PanelLoading } from './panel_loading';
import { PanelContentError } from './panel_content_error';
import { DescriptiveName } from './descriptive_name';
import { useLinkProps } from '../use_link_props';
import type { SafeResolverEvent } from '../../../../common/endpoint/types';
import { deepObjectEntries } from './deep_object_entries';
import { useFormattedDate } from './use_formatted_date';
import * as nodeDataModel from '../../models/node_data';
import { expandDottedObject } from '../../../../common/utils/expand_dotted';
import type { State } from '../../../common/store/types';

const eventDetailRequestError = i18n.translate(
  'xpack.securitySolution.resolver.panel.eventDetail.requestError',
  {
    defaultMessage: 'Event details were unable to be retrieved',
  }
);

export const EventDetail = memo(function EventDetail({
  id,
  nodeID,
  eventCategory: eventType,
}: {
  id: string;
  nodeID: string;
  /** The event type to show in the breadcrumbs */
  eventCategory: string;
}) {
  const isEventLoading = useSelector((state: State) =>
    selectors.isCurrentRelatedEventLoading(state.analyzer[id])
  );
  const isTreeLoading = useSelector((state: State) => selectors.isTreeLoading(state.analyzer[id]));
  const processEvent = useSelector((state: State) =>
    nodeDataModel.firstEvent(selectors.nodeDataForID(state.analyzer[id])(nodeID))
  );
  const nodeStatus = useSelector((state: State) =>
    selectors.nodeDataStatus(state.analyzer[id])(nodeID)
  );

  const isNodeDataLoading = nodeStatus === 'loading';
  const isLoading = isEventLoading || isTreeLoading || isNodeDataLoading;

  const event = useSelector((state: State) =>
    selectors.currentRelatedEventData(state.analyzer[id])
  );

  return isLoading ? (
    <PanelLoading id={id} />
  ) : event ? (
    <EventDetailContents
      id={id}
      nodeID={nodeID}
      event={event}
      processEvent={processEvent}
      eventType={eventType}
    />
  ) : (
    <PanelContentError id={id} translatedErrorMessage={eventDetailRequestError} />
  );
});

/**
 * This view presents a detailed view of all the available data for a related event, split and titled by the "section"
 * it appears in the underlying ResolverEvent
 */
// eslint-disable-next-line react/display-name
const EventDetailContents = memo(function ({
  id,
  nodeID,
  event,
  eventType,
  processEvent,
}: {
  id: string;
  nodeID: string;
  event: SafeResolverEvent;
  /**
   * Event type to use in the breadcrumbs
   */
  eventType: string;
  processEvent: SafeResolverEvent | undefined;
}) {
  const timestamp = eventModel.timestampSafeVersion(event);
  const formattedDate =
    useFormattedDate(timestamp) ||
    i18n.translate('xpack.securitySolution.enpdoint.resolver.panelutils.noTimestampRetrieved', {
      defaultMessage: 'No timestamp retrieved',
    });

  const nodeName = processEvent ? eventModel.processNameSafeVersion(processEvent) : null;

  return (
    <div data-test-subj="resolver:panel:event-detail">
      <EventDetailBreadcrumbs
        id={id}
        nodeID={nodeID}
        nodeName={nodeName}
        event={event}
        breadcrumbEventCategory={eventType}
      />
      <EuiSpacer size="l" />
      <EuiText size="s">
        <BoldCode>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.categoryAndType"
            values={{
              category: eventType,
              eventType: String(eventModel.eventType(event)),
            }}
            defaultMessage="{category} {eventType}"
          />
        </BoldCode>
        <StyledTime dateTime={formattedDate}>
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.atTime"
            values={{ date: formattedDate }}
            defaultMessage="@ {date}"
          />
        </StyledTime>
      </EuiText>
      <EuiSpacer size="m" />
      <StyledDescriptiveName>
        <GeneratedText>
          <DescriptiveName event={event} />
        </GeneratedText>
      </StyledDescriptiveName>
      <EuiSpacer size="l" />
      <EventDetailFields event={event} id={id} />
    </div>
  );
});

interface EventDetailsTableView {
  title: string;
  description: string;
}

function EventDetailFields({ event, id }: { event: SafeResolverEvent; id: string }) {
  const descriptions = useMemo(() => {
    const returnValue: EventDetailsTableView[] = [];
    const expandedEventObject: object = expandDottedObject(event);
    for (const [key, value] of Object.entries(expandedEventObject)) {
      // ignore these keys
      if (key === 'agent' || key === 'ecs' || key === '@timestamp' || !value) {
        continue;
      }

      const description = deepObjectEntries(value).map(([path, fieldValue]) => {
        // The field name is the 'namespace' key as well as the rest of the path, joined with '.'
        const fieldName = [key, ...path].join('.');

        return {
          title: fieldName,
          description: String(fieldValue),
        };
      });
      returnValue.push(...description);
    }
    return returnValue;
  }, [event]);

  const search: EuiSearchBarProps = {
    box: {
      incremental: true,
      schema: true,
    },
  };
  const columns: Array<EuiBasicTableColumn<EventDetailsTableView>> = [
    {
      field: 'title',
      'data-test-subj': 'resolver:panel:event-detail:event-field-title',
      name: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.panel.eventDetail.fieldTitle"
          defaultMessage="Field"
        />
      ),
      width: 'fit-content(8em)',
      sortable: true,
    },
    {
      name: (
        <FormattedMessage
          id="xpack.securitySolution.endpoint.resolver.panel.eventDetail.valueTitle"
          defaultMessage="Value"
        />
      ),
      render(data: EventDetailsTableView) {
        return (
          <SecurityCellActions
            data={{
              field: data.title,
              value: data.description,
            }}
            visibleCellActions={5}
            triggerId={SECURITY_CELL_ACTIONS_DEFAULT}
            mode={CellActionsMode.HOVER_DOWN}
            sourcererScopeId={getSourcererScopeId(id)}
            metadata={{ scopeId: id }}
          >
            {data.description}
          </SecurityCellActions>
        );
      },
    },
  ];
  return (
    <EuiInMemoryTable<EventDetailsTableView>
      items={descriptions}
      columns={columns}
      search={search}
      pagination={true}
      sorting
      tableCaption={i18n.translate(
        'xpack.securitySolution.endpoint.resolver.panel.eventDetail.eventFieldsCaption',
        {
          defaultMessage: 'Event fields',
        }
      )}
    />
  );
}

function EventDetailBreadcrumbs({
  id,
  nodeID,
  nodeName,
  event,
  breadcrumbEventCategory,
}: {
  id: string;
  nodeID: string;
  nodeName: string | null | undefined;
  event: SafeResolverEvent;
  breadcrumbEventCategory: string;
}) {
  const countByCategory = useSelector((state: State) =>
    selectors.relatedEventCountOfTypeForNode(state.analyzer[id])(nodeID, breadcrumbEventCategory)
  );
  const relatedEventCount: number | undefined = useSelector((state: State) =>
    selectors.relatedEventTotalCount(state.analyzer[id])(nodeID)
  );
  const nodesLinkNavProps = useLinkProps(id, {
    panelView: 'nodes',
  });

  const nodeDetailLinkNavProps = useLinkProps(id, {
    panelView: 'nodeDetail',
    panelParameters: { nodeID },
  });

  const nodeEventsLinkNavProps = useLinkProps(id, {
    panelView: 'nodeEvents',
    panelParameters: { nodeID },
  });

  const nodeEventsInCategoryLinkNavProps = useLinkProps(id, {
    panelView: 'nodeEventsInCategory',
    panelParameters: { nodeID, eventCategory: breadcrumbEventCategory },
  });
  const breadcrumbs = useMemo(() => {
    const crumbs: EuiBreadcrumb[] = [
      {
        text: i18n.translate(
          'xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.events',
          {
            defaultMessage: 'Events',
          }
        ),
        'data-test-subj': 'resolver:event-detail:breadcrumbs:node-list-link',
        ...nodesLinkNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.numberOfEvents"
            values={{ totalCount: relatedEventCount }}
            defaultMessage="{totalCount} Events"
          />
        ),
        ...nodeEventsLinkNavProps,
      },
      {
        text: (
          <FormattedMessage
            id="xpack.securitySolution.endpoint.resolver.panel.relatedEventDetail.countByCategory"
            values={{ count: countByCategory, category: breadcrumbEventCategory }}
            defaultMessage="{count} {category}"
          />
        ),
        ...nodeEventsInCategoryLinkNavProps,
      },
      {
        text: <DescriptiveName event={event} />,
      },
    ];

    if (nodeName) {
      crumbs.splice(1, 0, {
        text: nodeName,
        ...nodeDetailLinkNavProps,
      });
    }

    return crumbs;
  }, [
    breadcrumbEventCategory,
    countByCategory,
    event,
    nodeDetailLinkNavProps,
    nodeEventsLinkNavProps,
    nodeName,
    relatedEventCount,
    nodesLinkNavProps,
    nodeEventsInCategoryLinkNavProps,
  ]);
  return <Breadcrumbs breadcrumbs={breadcrumbs} />;
}

// Also prevents horizontal scrollbars on long descriptive names
const StyledDescriptiveName = memo(styled(EuiText)`
  padding-right: 1em;
  overflow-wrap: break-word;
`);
