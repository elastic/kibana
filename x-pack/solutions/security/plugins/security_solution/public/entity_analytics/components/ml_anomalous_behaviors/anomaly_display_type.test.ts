/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnomalySummaryEntry } from '../../../../common/api/entity_analytics';
import { anomalyToDisplayDetails } from './anomaly_display_type';

const makeAnomalySummary = (opts: Partial<AnomalySummaryEntry>) =>
  ({
    ...opts,
    actual: [99],
    typical: [3],
  } as unknown as AnomalySummaryEntry);

describe('anomalyToDisplayDetails', () => {
  it('should return correct display details for high_count function', () => {
    expect(anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_count' }))).toEqual(
      {
        expectedHeader: `≤ 3 events`,
        expectedSubtitle: ``,
        observedHeader: `99 events`,
      }
    );

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({ detectorFunction: 'high_count', byFieldName: 'event.action' })
      )
    ).toEqual({
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where event.action exists`,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_count',
          byFieldName: 'event.action',
          byFieldValue: 'something-suspicous',
        })
      )
    ).toEqual({
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where event.action is something-suspicous`,
      observedHeader: `99 events`,
    });
  });

  it('should return correct display details for low_count function', () => {
    expect(anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'low_count' }))).toEqual({
      expectedHeader: `≥ 3 events`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });
  });

  it('should return correct display details for high_non_zero_count function', () => {
    expect(
      anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_non_zero_count' }))
    ).toEqual({
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_non_zero_count',
          byFieldName: 'okta.event_type',
        })
      )
    ).toEqual({
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where okta.event_type exists`,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_count',
          byFieldName: 'okta.event_type',
          byFieldValue: 'login',
        })
      )
    ).toEqual({
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where okta.event_type is login`,
      observedHeader: `99 events`,
    });
  });

  it('should return correct display details for high_distinct_count function', () => {
    expect(
      anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_distinct_count' }))
    ).toEqual({
      expectedHeader: `≤ 3 distinct events`,
      expectedSubtitle: ``,
      observedHeader: `99 distinct events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({ detectorFunction: 'high_distinct_count', fieldName: 'event.action' })
      )
    ).toEqual({
      expectedHeader: `≤ 3 distinct actions`,
      expectedSubtitle: ``,
      observedHeader: `99 distinct actions`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_distinct_count',
          fieldName: 'gcp.audit.status.message',
        })
      )
    ).toEqual({
      expectedHeader: `≤ 3 distinct statuses`,
      expectedSubtitle: ``,
      observedHeader: `99 distinct statuses`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_distinct_count',
          fieldName: 'destination.ip',
          partitionFieldName: 'source.ip',
        })
      )
    ).toEqual({
      expectedHeader: `≤ 3 distinct destination IPs`,
      expectedSubtitle: `where source.ip exists`,
      observedHeader: `99 distinct destination IPs`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_distinct_count',
          fieldName: 'source.ip',
          partitionFieldName: 'destination.ip',
          partitionFieldValue: '127.0.0.1',
        })
      )
    ).toEqual({
      expectedHeader: `≤ 3 distinct source IPs`,
      expectedSubtitle: `where destination.ip is 127.0.0.1`,
      observedHeader: `99 distinct source IPs`,
    });
  });

  it('should return correct display details for high_info_content function', () => {
    expect(
      anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_info_content' }))
    ).toEqual({
      expectedHeader: `avg events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_info_content',
          fieldName: 'powershell.file.script_block_text',
        })
      )
    ).toEqual({
      expectedHeader: `avg content ≤ 3 bits`,
      expectedSubtitle: ``,
      observedHeader: `99 bits`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_info_content',
          fieldName: 'dns.question.name',
          overFieldName: 'dns_question_etld',
        })
      )
    ).toEqual({
      expectedHeader: `avg content ≤ 3 bits`,
      expectedSubtitle: `for domain`,
      observedHeader: `99 bits`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_info_content',
          fieldName: 'dns.question.name',
          overFieldName: 'dns_question_etld',
          overFieldValue: 'something.com',
        })
      )
    ).toEqual({
      expectedHeader: `avg content ≤ 3 bits`,
      expectedSubtitle: `for something.com domain`,
      observedHeader: `99 bits`,
    });
  });

  it('should return correct display details for high_mean function', () => {
    expect(anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_mean' }))).toEqual({
      expectedHeader: `avg events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({ detectorFunction: 'high_mean', fieldName: 'session.duration' })
      )
    ).toEqual({
      expectedHeader: `avg session duration ≤ 3 ms`,
      expectedSubtitle: ``,
      observedHeader: `99 ms`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_mean',
          fieldName: 'total_length_process_args',
          partitionFieldName: 'destination.ip',
        })
      )
    ).toEqual({
      expectedHeader: `avg process arg length ≤ 3 chars`,
      expectedSubtitle: `where destination.ip exists`,
      observedHeader: `99 chars`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_mean',
          fieldName: 'total_length_process_args',
          partitionFieldName: 'source.ip',
          partitionFieldValue: '3.144.8.4',
        })
      )
    ).toEqual({
      expectedHeader: `avg process arg length ≤ 3 chars`,
      expectedSubtitle: `where source.ip is 3.144.8.4`,
      observedHeader: `99 chars`,
    });
  });

  it('should return correct display details for high_median function', () => {
    expect(
      anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_median' }))
    ).toEqual({
      expectedHeader: `median events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_median',
          fieldName: 'process.command_line_entropy',
        })
      )
    ).toEqual({
      expectedHeader: `median content ≤ 3 bits`,
      expectedSubtitle: ``,
      observedHeader: `99 bits`,
    });
  });

  it('should return correct display details for high_sum function', () => {
    expect(anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_sum' }))).toEqual({
      expectedHeader: `total events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({ detectorFunction: 'high_sum', fieldName: 'file.size' })
      )
    ).toEqual({
      expectedHeader: `total file size ≤ 3 B`,
      expectedSubtitle: ``,
      observedHeader: `99 B`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'blocklist_label',
          byFieldName: 'process.parent.name',
        })
      )
    ).toEqual({
      expectedHeader: `total blocklist hit ≤ 3`,
      expectedSubtitle: `where process.parent.name exists`,
      observedHeader: `99 blocklist hit`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'blocklist_label',
          byFieldName: 'process.parent.name',
          byFieldValue: 'bad',
        })
      )
    ).toEqual({
      expectedHeader: `total blocklist hit ≤ 3`,
      expectedSubtitle: `where process.parent.name is bad`,
      observedHeader: `99 blocklist hit`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'ml_is_dga.malicious_probability',
          overFieldName: 'source.ip',
        })
      )
    ).toEqual({
      expectedHeader: `total DGA probability ≤ 3`,
      expectedSubtitle: `for source IPs`,
      observedHeader: `99 DGA probability`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'ml_is_dga.malicious_probability',
          overFieldName: 'source.ip',
          overFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      expectedHeader: `total DGA probability ≤ 3`,
      expectedSubtitle: `for 3.444.2.4 source IPs`,
      observedHeader: `99 DGA probability`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'number_processes_per_session',
          partitionFieldName: 'destination.ip',
        })
      )
    ).toEqual({
      expectedHeader: `total processes / session ≤ 3`,
      expectedSubtitle: `where destination.ip exists`,
      observedHeader: `99 processes / session`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'number_processes_per_session',
          partitionFieldName: 'destination.ip',
          partitionFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      expectedHeader: `total processes / session ≤ 3`,
      expectedSubtitle: `where destination.ip is 3.444.2.4`,
      observedHeader: `99 processes / session`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'source.bytes',
          overFieldName: 'destination.geo.country_iso_code',
          overFieldValue: 'RU',
        })
      )
    ).toEqual({
      expectedHeader: `total bytes sent ≤ 3 B`,
      expectedSubtitle: `for RU country`,
      observedHeader: `99 B`,
    });
  });

  it('should return correct display details for high_varp function', () => {
    expect(anomalyToDisplayDetails(makeAnomalySummary({ detectorFunction: 'high_varp' }))).toEqual({
      expectedHeader: `variance of events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({ detectorFunction: 'high_varp', fieldName: 'session.duration' })
      )
    ).toEqual({
      expectedHeader: `variance of session duration ≤ 3 ms`,
      expectedSubtitle: ``,
      observedHeader: `99 ms`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_varp',
          fieldName: 'session.duration',
          partitionFieldName: 'source.ip',
        })
      )
    ).toEqual({
      expectedHeader: `variance of session duration ≤ 3 ms`,
      expectedSubtitle: `where source.ip exists`,
      observedHeader: `99 ms`,
    });

    expect(
      anomalyToDisplayDetails(
        makeAnomalySummary({
          detectorFunction: 'high_varp',
          fieldName: 'session.duration',
          partitionFieldName: 'source.ip',
          partitionFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      expectedHeader: `variance of session duration ≤ 3 ms`,
      expectedSubtitle: `where source.ip is 3.444.2.4`,
      observedHeader: `99 ms`,
    });
  });
});
