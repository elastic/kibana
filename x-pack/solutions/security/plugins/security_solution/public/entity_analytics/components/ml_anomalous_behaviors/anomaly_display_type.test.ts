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
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'high_count' }))
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_count', byFieldName: 'event.action' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where event.action exists`,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_count',
          byFieldName: 'event.action',
          byFieldValue: 'something-suspicous',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where event.action is something-suspicous`,
      observedHeader: `99 events`,
    });
  });

  it('should return correct display details for low_count function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'low_count' }))
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≥ 3 events`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });
  });

  it('should return correct display details for high_non_zero_count function', () => {
    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_non_zero_count' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_non_zero_count',
          byFieldName: 'okta.event_type',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where okta.event_type exists`,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_count',
          byFieldName: 'okta.event_type',
          byFieldValue: 'login',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 events`,
      expectedSubtitle: `where okta.event_type is login`,
      observedHeader: `99 events`,
    });
  });

  it('should return correct display details for high_distinct_count function', () => {
    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_distinct_count' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 distinct events`,
      expectedSubtitle: ``,
      observedHeader: `99 distinct events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_distinct_count', fieldName: 'event.action' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 distinct actions`,
      expectedSubtitle: ``,
      observedHeader: `99 distinct actions`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_distinct_count',
          fieldName: 'gcp.audit.status.message',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 distinct statuses`,
      expectedSubtitle: ``,
      observedHeader: `99 distinct statuses`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_distinct_count',
          fieldName: 'destination.ip',
          partitionFieldName: 'source.ip',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 distinct destination IPs`,
      expectedSubtitle: `where source.ip exists`,
      observedHeader: `99 distinct destination IPs`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_distinct_count',
          fieldName: 'source.ip',
          partitionFieldName: 'destination.ip',
          partitionFieldValue: '127.0.0.1',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `≤ 3 distinct source IPs`,
      expectedSubtitle: `where destination.ip is 127.0.0.1`,
      observedHeader: `99 distinct source IPs`,
    });
  });

  it('should return correct display details for high_info_content function', () => {
    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_info_content' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_info_content',
          fieldName: 'powershell.file.script_block_text',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg content ≤ 3 bits`,
      expectedSubtitle: ``,
      observedHeader: `99 bits`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_info_content',
          fieldName: 'dns.question.name',
          overFieldName: 'dns_question_etld',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg content ≤ 3 bits`,
      expectedSubtitle: `for domain`,
      observedHeader: `99 bits`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_info_content',
          fieldName: 'dns.question.name',
          overFieldName: 'dns_question_etld',
          overFieldValue: 'something.com',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg content ≤ 3 bits`,
      expectedSubtitle: `for something.com domain`,
      observedHeader: `99 bits`,
    });
  });

  it('should return correct display details for high_mean function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'high_mean' }))
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_mean', fieldName: 'session.duration' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg session duration ≤ 3 ms`,
      expectedSubtitle: ``,
      observedHeader: `99 ms`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_mean',
          fieldName: 'total_length_process_args',
          partitionFieldName: 'destination.ip',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg process arg length ≤ 3 chars`,
      expectedSubtitle: `where destination.ip exists`,
      observedHeader: `99 chars`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_mean',
          fieldName: 'total_length_process_args',
          partitionFieldName: 'source.ip',
          partitionFieldValue: '3.144.8.4',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `avg process arg length ≤ 3 chars`,
      expectedSubtitle: `where source.ip is 3.144.8.4`,
      observedHeader: `99 chars`,
    });
  });

  it('should return correct display details for high_median function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'high_median' }))
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `median events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_median',
          fieldName: 'process.command_line_entropy',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `median content ≤ 3 bits`,
      expectedSubtitle: ``,
      observedHeader: `99 bits`,
    });
  });

  it('should return correct display details for high_sum function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'high_sum' }))
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_sum', fieldName: 'file.size' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total file size ≤ 3 B`,
      expectedSubtitle: ``,
      observedHeader: `99 B`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'blocklist_label',
          byFieldName: 'process.parent.name',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total blocklist hit ≤ 3`,
      expectedSubtitle: `where process.parent.name exists`,
      observedHeader: `99 blocklist hit`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'blocklist_label',
          byFieldName: 'process.parent.name',
          byFieldValue: 'bad',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total blocklist hit ≤ 3`,
      expectedSubtitle: `where process.parent.name is bad`,
      observedHeader: `99 blocklist hit`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'ml_is_dga.malicious_probability',
          overFieldName: 'source.ip',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total DGA probability ≤ 3`,
      expectedSubtitle: `for source IPs`,
      observedHeader: `99 DGA probability`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'ml_is_dga.malicious_probability',
          overFieldName: 'source.ip',
          overFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total DGA probability ≤ 3`,
      expectedSubtitle: `for 3.444.2.4 source IPs`,
      observedHeader: `99 DGA probability`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'number_processes_per_session',
          partitionFieldName: 'destination.ip',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total processes / session ≤ 3`,
      expectedSubtitle: `where destination.ip exists`,
      observedHeader: `99 processes / session`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'number_processes_per_session',
          partitionFieldName: 'destination.ip',
          partitionFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total processes / session ≤ 3`,
      expectedSubtitle: `where destination.ip is 3.444.2.4`,
      observedHeader: `99 processes / session`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_sum',
          fieldName: 'source.bytes',
          overFieldName: 'destination.geo.country_iso_code',
          overFieldValue: 'RU',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `total bytes sent ≤ 3 B`,
      expectedSubtitle: `for RU country`,
      observedHeader: `99 B`,
    });
  });

  it('should return correct display details for high_varp function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'high_varp' }))
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `variance of events ≤ 3`,
      expectedSubtitle: ``,
      observedHeader: `99 events`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'high_varp', fieldName: 'session.duration' })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `variance of session duration ≤ 3 ms`,
      expectedSubtitle: ``,
      observedHeader: `99 ms`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_varp',
          fieldName: 'session.duration',
          partitionFieldName: 'source.ip',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `variance of session duration ≤ 3 ms`,
      expectedSubtitle: `where source.ip exists`,
      observedHeader: `99 ms`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'high_varp',
          fieldName: 'session.duration',
          partitionFieldName: 'source.ip',
          partitionFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      cardType: 'magnitude',
      expectedHeader: `variance of session duration ≤ 3 ms`,
      expectedSubtitle: `where source.ip is 3.444.2.4`,
      observedHeader: `99 ms`,
    });
  });

  it('should return correct display details for time_of_day function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'time_of_day' }))
    ).toEqual({
      cardType: 'calendar',
      expectedHeader: `Activity around 00:00`,
      expectedSubtitle: ``,
      observedHeader: `Activity at 00:01`,
    });
  });

  it('should return correct display details for time_of_week function', () => {
    expect(
      anomalyToDisplayDetails('generic', makeAnomalySummary({ detectorFunction: 'time_of_week' }))
    ).toEqual({
      cardType: 'calendar',
      expectedHeader: `Activity around Mon 00:00`,
      expectedSubtitle: ``,
      observedHeader: `Activity at Mon 00:01`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({ detectorFunction: 'time_of_week', partitionFieldName: 'source.ip' })
      )
    ).toEqual({
      cardType: 'calendar',
      expectedHeader: `Activity around Mon 00:00`,
      expectedSubtitle: `where source.ip exists`,
      observedHeader: `Activity at Mon 00:01`,
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'time_of_week',
          partitionFieldName: 'source.ip',
          partitionFieldValue: '3.444.2.4',
        })
      )
    ).toEqual({
      cardType: 'calendar',
      expectedHeader: `Activity around Mon 00:00`,
      expectedSubtitle: `where source.ip is 3.444.2.4`,
      observedHeader: `Activity at Mon 00:01`,
    });
  });

  it('should return correct display details for rare geo anomaly', () => {
    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'rare',
          byFieldName: 'source.geo.region_name',
          byFieldValue: 'Crimea',
          baseline: [{ value: 'New York', docCount: 15 }],
        })
      )
    ).toEqual({
      cardType: 'geo',
      expectedHeader: 'New York',
      expectedSubtitle: '',
      observedHeader: 'Crimea',
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'rare',
          byFieldName: 'client.geo.region_name',
          byFieldValue: 'Moscow Oblast',
          baseline: [{ value: 'California', docCount: 42 }],
        })
      )
    ).toEqual({
      cardType: 'geo',
      expectedHeader: 'California',
      expectedSubtitle: '',
      observedHeader: 'Moscow Oblast',
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'rare',
          byFieldName: 'source.geo.country_iso_code',
          byFieldValue: 'RU',
          baseline: [{ value: 'US', docCount: 30 }],
        })
      )
    ).toEqual({
      cardType: 'geo',
      expectedHeader: 'US',
      expectedSubtitle: '',
      observedHeader: 'RU',
    });
  });

  it('should return correct display details for rare non-geo anomaly', () => {
    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'rare',
          byFieldName: 'process.name',
          byFieldValue: 'mshta.exe',
          baseline: [{ value: 'chrome.exe', docCount: 42 }],
          partitionFieldName: 'host.name',
          partitionFieldValue: 'WORKSTATION-005',
        })
      )
    ).toEqual({
      cardType: 'rare',
      expectedHeader: 'chrome.exe',
      expectedSubtitle: 'where host.name is WORKSTATION-005',
      observedHeader: 'mshta.exe',
    });

    expect(
      anomalyToDisplayDetails(
        'generic',
        makeAnomalySummary({
          detectorFunction: 'rare',
          byFieldName: 'user.name',
          byFieldValue: 'svc_backup',
          baseline: [],
        })
      )
    ).toEqual({
      cardType: 'rare',
      expectedHeader: '',
      expectedSubtitle: '',
      observedHeader: 'svc_backup',
    });
  });
});
