/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_VALUE } from '@kbn/slo-schema';
import type { DiscoverStart } from '@kbn/discover-plugin/public';
import {
  buildApmAvailabilityIndicator,
  buildApmLatencyIndicator,
} from '../../../../data/slo/indicator';
import { buildSlo } from '../../../../data/slo/slo';
import { getApmTracesEsqlLink, navigateToApmTracesEsqlLink } from './get_apm_traces_esql_link';

const TRANSACTION_INDEX = 'traces-apm*,apm-*';
const TIME_RANGE = { from: 'now-24h', to: 'now' };

function createMockDiscover(): DiscoverStart {
  return {
    locator: {
      getRedirectUrl: jest.fn(({ query }: { query: { esql: string } }) => query.esql),
    },
  } as unknown as DiscoverStart;
}

describe('getApmTracesEsqlLink', () => {
  it('returns undefined when discover is not provided', () => {
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

    expect(
      getApmTracesEsqlLink({ slo, timeRange: TIME_RANGE, transactionIndex: TRANSACTION_INDEX })
    ).toBeUndefined();
  });

  it('opens a new Discover tab labelled with "Good vs bad events" and the SLO name', () => {
    const getRedirectUrl = jest.fn(() => 'url');
    const discover = { locator: { getRedirectUrl } } as unknown as DiscoverStart;
    const slo = buildSlo({ indicator: buildApmLatencyIndicator(), name: 'My APM SLO' });

    getApmTracesEsqlLink({
      slo,
      timeRange: TIME_RANGE,
      discover,
      transactionIndex: TRANSACTION_INDEX,
    });

    expect(getRedirectUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        tab: { id: 'new', label: 'Good vs bad events - My APM SLO' },
      })
    );
  });

  it('returns undefined when transactionIndex is empty', () => {
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

    expect(
      getApmTracesEsqlLink({
        slo,
        timeRange: TIME_RANGE,
        discover: createMockDiscover(),
        transactionIndex: '',
      })
    ).toBeUndefined();
  });

  describe('latency SLO', () => {
    it('generates correct ESQL query with specific params', () => {
      const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

      expect(
        getApmTracesEsqlLink({
          slo,
          timeRange: TIME_RANGE,
          discover: createMockDiscover(),
          transactionIndex: TRANSACTION_INDEX,
        })
      ).toEqual(
        `FROM traces-apm*, apm-*
  | WHERE \`processor.event\` == "transaction"
  | WHERE \`service.name\` == "o11y-app"
  | WHERE \`service.environment\` == "development"
  | WHERE \`transaction.type\` == "request"
  | WHERE \`transaction.name\` == "GET /slow"
  | EVAL event_type = CASE(\`transaction.duration.us\` <= 500000, "Good", "Bad")
  | WHERE
      ?event_type == "Bad" AND \`transaction.duration.us\` > 500000 OR
        ?event_type == "Good" AND \`transaction.duration.us\` <= 500000 OR
        ?event_type == "All"`
      );
    });

    it('omits filters for ALL_VALUE params', () => {
      const slo = buildSlo({
        indicator: buildApmLatencyIndicator({
          service: ALL_VALUE,
          environment: ALL_VALUE,
          transactionType: ALL_VALUE,
          transactionName: ALL_VALUE,
        }),
      });

      expect(
        getApmTracesEsqlLink({
          slo,
          timeRange: TIME_RANGE,
          discover: createMockDiscover(),
          transactionIndex: TRANSACTION_INDEX,
        })
      ).toEqual(
        `FROM traces-apm*, apm-*
  | WHERE \`processor.event\` == "transaction"
  | EVAL event_type = CASE(\`transaction.duration.us\` <= 500000, "Good", "Bad")
  | WHERE
      ?event_type == "Bad" AND \`transaction.duration.us\` > 500000 OR
        ?event_type == "Good" AND \`transaction.duration.us\` <= 500000 OR
        ?event_type == "All"`
      );
    });

    it('adds grouping filters', () => {
      const slo = buildSlo({
        indicator: buildApmLatencyIndicator(),
        groupings: { 'service.name': 'grouped-svc', 'http.status_code': 200 },
      });

      expect(
        getApmTracesEsqlLink({
          slo,
          timeRange: TIME_RANGE,
          discover: createMockDiscover(),
          transactionIndex: TRANSACTION_INDEX,
        })
      ).toEqual(
        `FROM traces-apm*, apm-*
  | WHERE \`processor.event\` == "transaction"
  | WHERE \`service.name\` == "o11y-app"
  | WHERE \`service.environment\` == "development"
  | WHERE \`transaction.type\` == "request"
  | WHERE \`transaction.name\` == "GET /slow"
  | WHERE \`service.name\` == "grouped-svc"
  | WHERE \`http.status_code\` == 200
  | EVAL event_type = CASE(\`transaction.duration.us\` <= 500000, "Good", "Bad")
  | WHERE
      ?event_type == "Bad" AND \`transaction.duration.us\` > 500000 OR
        ?event_type == "Good" AND \`transaction.duration.us\` <= 500000 OR
        ?event_type == "All"`
      );
    });
  });

  describe('availability SLO', () => {
    it('generates correct ESQL query with specific params', () => {
      const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });

      expect(
        getApmTracesEsqlLink({
          slo,
          timeRange: TIME_RANGE,
          discover: createMockDiscover(),
          transactionIndex: TRANSACTION_INDEX,
        })
      ).toEqual(
        `FROM traces-apm*, apm-*
  | WHERE \`processor.event\` == "transaction"
  | WHERE \`service.name\` == "o11y-app"
  | WHERE \`service.environment\` == "development"
  | WHERE \`transaction.type\` == "request"
  | WHERE \`transaction.name\` == "GET /flaky"
  | WHERE \`event.outcome\` IN ("success", "failure")
  | EVAL event_type = CASE(\`event.outcome\` == "success", "Good", "Bad")
  | WHERE
      ?event_type == "Bad" AND \`event.outcome\` == "failure" OR
        ?event_type == "Good" AND \`event.outcome\` == "success" OR
        ?event_type == "All"`
      );
    });

    it('omits filters for ALL_VALUE params', () => {
      const slo = buildSlo({
        indicator: buildApmAvailabilityIndicator({
          service: ALL_VALUE,
          environment: ALL_VALUE,
          transactionType: ALL_VALUE,
          transactionName: ALL_VALUE,
        }),
      });

      expect(
        getApmTracesEsqlLink({
          slo,
          timeRange: TIME_RANGE,
          discover: createMockDiscover(),
          transactionIndex: TRANSACTION_INDEX,
        })
      ).toEqual(
        `FROM traces-apm*, apm-*
  | WHERE \`processor.event\` == "transaction"
  | WHERE \`event.outcome\` IN ("success", "failure")
  | EVAL event_type = CASE(\`event.outcome\` == "success", "Good", "Bad")
  | WHERE
      ?event_type == "Bad" AND \`event.outcome\` == "failure" OR
        ?event_type == "Good" AND \`event.outcome\` == "success" OR
        ?event_type == "All"`
      );
    });

    it('adds grouping filters', () => {
      const slo = buildSlo({
        indicator: buildApmAvailabilityIndicator(),
        groupings: { 'service.name': 'grouped-svc' },
      });

      expect(
        getApmTracesEsqlLink({
          slo,
          timeRange: TIME_RANGE,
          discover: createMockDiscover(),
          transactionIndex: TRANSACTION_INDEX,
        })
      ).toEqual(
        `FROM traces-apm*, apm-*
  | WHERE \`processor.event\` == "transaction"
  | WHERE \`service.name\` == "o11y-app"
  | WHERE \`service.environment\` == "development"
  | WHERE \`transaction.type\` == "request"
  | WHERE \`transaction.name\` == "GET /flaky"
  | WHERE \`service.name\` == "grouped-svc"
  | WHERE \`event.outcome\` IN ("success", "failure")
  | EVAL event_type = CASE(\`event.outcome\` == "success", "Good", "Bad")
  | WHERE
      ?event_type == "Bad" AND \`event.outcome\` == "failure" OR
        ?event_type == "Good" AND \`event.outcome\` == "success" OR
        ?event_type == "All"`
      );
    });
  });
});

describe('navigateToApmTracesEsqlLink', () => {
  it('does nothing when discover is not provided', () => {
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

    expect(() =>
      navigateToApmTracesEsqlLink({
        slo,
        timeRange: TIME_RANGE,
        transactionIndex: TRANSACTION_INDEX,
      })
    ).not.toThrow();
  });

  it('does nothing when transactionIndex is empty', () => {
    const navigate = jest.fn();
    const discover = { locator: { navigate } } as unknown as DiscoverStart;
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

    navigateToApmTracesEsqlLink({ slo, timeRange: TIME_RANGE, discover, transactionIndex: '' });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('calls locator.navigate with the correct time range and tab label', () => {
    const navigate = jest.fn();
    const discover = { locator: { navigate } } as unknown as DiscoverStart;
    const slo = buildSlo({ indicator: buildApmLatencyIndicator(), name: 'My APM SLO' });

    navigateToApmTracesEsqlLink({
      slo,
      timeRange: TIME_RANGE,
      discover,
      transactionIndex: TRANSACTION_INDEX,
    });

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        timeRange: TIME_RANGE,
        tab: { id: 'new', label: 'Good vs bad events - My APM SLO' },
      })
    );
  });

  it('defaults selectedEventType to All in the esql control', () => {
    const navigate = jest.fn();
    const discover = { locator: { navigate } } as unknown as DiscoverStart;
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

    navigateToApmTracesEsqlLink({
      slo,
      timeRange: TIME_RANGE,
      discover,
      transactionIndex: TRANSACTION_INDEX,
    });

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlControls: expect.objectContaining({
          slo_event_control: expect.objectContaining({ selected_options: ['All'] }),
        }),
      })
    );
  });

  it('sets selected_options to Bad when selectedEventType is Bad', () => {
    const navigate = jest.fn();
    const discover = { locator: { navigate } } as unknown as DiscoverStart;
    const slo = buildSlo({ indicator: buildApmLatencyIndicator() });

    navigateToApmTracesEsqlLink({
      slo,
      timeRange: TIME_RANGE,
      discover,
      transactionIndex: TRANSACTION_INDEX,
      selectedEventType: 'Bad',
    });

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlControls: expect.objectContaining({
          slo_event_control: expect.objectContaining({ selected_options: ['Bad'] }),
        }),
      })
    );
  });

  it('sets selected_options to Good when selectedEventType is Good', () => {
    const navigate = jest.fn();
    const discover = { locator: { navigate } } as unknown as DiscoverStart;
    const slo = buildSlo({ indicator: buildApmAvailabilityIndicator() });

    navigateToApmTracesEsqlLink({
      slo,
      timeRange: TIME_RANGE,
      discover,
      transactionIndex: TRANSACTION_INDEX,
      selectedEventType: 'Good',
    });

    expect(navigate).toHaveBeenCalledWith(
      expect.objectContaining({
        esqlControls: expect.objectContaining({
          slo_event_control: expect.objectContaining({ selected_options: ['Good'] }),
        }),
      })
    );
  });
});
