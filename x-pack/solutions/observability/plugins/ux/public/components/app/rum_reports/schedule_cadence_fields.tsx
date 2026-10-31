/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  formatScheduleLabel,
  RUM_REPORT_MINUTES,
  type RumReportCadence,
  type RumReportMinute,
  type RumReportScheduleSpec,
  type RumReportWeekday,
} from '../../../../common/rum_report_schedule';

const freqOptions: Array<{ value: RumReportCadence; text: string }> = [
  {
    value: 'daily',
    text: i18n.translate('xpack.ux.reports.schedule.freqDailyLabel', {
      defaultMessage: 'Every day',
    }),
  },
  {
    value: 'weekdays',
    text: i18n.translate('xpack.ux.reports.schedule.freqWeekdaysLabel', {
      defaultMessage: 'Weekdays (Mon–Fri)',
    }),
  },
  {
    value: 'weekly',
    text: i18n.translate('xpack.ux.reports.schedule.freqWeeklyLabel', {
      defaultMessage: 'Every week',
    }),
  },
  {
    value: 'biweekly',
    text: i18n.translate('xpack.ux.reports.schedule.freqBiweeklyLabel', {
      defaultMessage: 'Every 2 weeks',
    }),
  },
  {
    value: 'monthly',
    text: i18n.translate('xpack.ux.reports.schedule.freqMonthlyLabel', {
      defaultMessage: 'Every month',
    }),
  },
];

const weekdayOptions: Array<{ value: RumReportWeekday; text: string }> = [
  {
    value: 'MO',
    text: i18n.translate('xpack.ux.reports.schedule.weekdayMondayLabel', {
      defaultMessage: 'Monday',
    }),
  },
  {
    value: 'TU',
    text: i18n.translate('xpack.ux.reports.schedule.weekdayTuesdayLabel', {
      defaultMessage: 'Tuesday',
    }),
  },
  {
    value: 'WE',
    text: i18n.translate('xpack.ux.reports.schedule.weekdayWednesdayLabel', {
      defaultMessage: 'Wednesday',
    }),
  },
  {
    value: 'TH',
    text: i18n.translate('xpack.ux.reports.schedule.weekdayThursdayLabel', {
      defaultMessage: 'Thursday',
    }),
  },
  {
    value: 'FR',
    text: i18n.translate('xpack.ux.reports.schedule.weekdayFridayLabel', {
      defaultMessage: 'Friday',
    }),
  },
  {
    value: 'SA',
    text: i18n.translate('xpack.ux.reports.schedule.weekdaySaturdayLabel', {
      defaultMessage: 'Saturday',
    }),
  },
  {
    value: 'SU',
    text: i18n.translate('xpack.ux.reports.schedule.weekdaySundayLabel', {
      defaultMessage: 'Sunday',
    }),
  },
];

const hourOptions = Array.from({ length: 24 }, (_, hour) => ({
  value: String(hour),
  text: String(hour).padStart(2, '0'),
}));

const minuteOptions = RUM_REPORT_MINUTES.map((minute) => ({
  value: String(minute),
  text: String(minute).padStart(2, '0'),
}));

const monthdayOptions = Array.from({ length: 28 }, (_, index) => ({
  value: String(index + 1),
  text: String(index + 1),
}));

const periodHelp = (cadence: RumReportCadence): string => {
  if (cadence === 'daily' || cadence === 'weekdays') {
    return i18n.translate('xpack.ux.reports.schedule.periodDayHelp', {
      defaultMessage: 'Each run emails the previous complete day.',
    });
  }
  if (cadence === 'monthly') {
    return i18n.translate('xpack.ux.reports.schedule.periodMonthHelp', {
      defaultMessage: 'Each run emails the previous complete calendar month.',
    });
  }
  return i18n.translate('xpack.ux.reports.schedule.periodWeekHelp', {
    defaultMessage: 'Each run emails the previous complete calendar week (Mon–Mon).',
  });
};

export function ScheduleCadenceFields({
  spec,
  onChange,
}: {
  spec: RumReportScheduleSpec;
  onChange: (next: RumReportScheduleSpec) => void;
}) {
  const browserTzid = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const tzOptions =
    browserTzid === 'UTC'
      ? [{ value: 'UTC', text: 'UTC' }]
      : [
          { value: 'UTC', text: 'UTC' },
          { value: browserTzid, text: browserTzid },
        ];

  const showWeekday = spec.cadence === 'weekly' || spec.cadence === 'biweekly';
  const showMonthday = spec.cadence === 'monthly';

  return (
    <>
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="flexStart">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            style={{ width: '100%' }}
            label={i18n.translate('xpack.ux.reports.schedule.frequencyLabel', {
              defaultMessage: 'Frequency',
            })}
          >
            <EuiSelect
              fullWidth
              data-test-subj="uxReportScheduleCadence"
              options={freqOptions}
              value={spec.cadence}
              onChange={(event) =>
                onChange({ ...spec, cadence: event.target.value as RumReportCadence })
              }
            />
          </EuiFormRow>
        </EuiFlexItem>
        {showWeekday && (
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              style={{ width: '100%' }}
              label={i18n.translate('xpack.ux.reports.schedule.onWeekdayLabel', {
                defaultMessage: 'On',
              })}
            >
              <EuiSelect
                fullWidth
                data-test-subj="uxReportScheduleWeekday"
                options={weekdayOptions}
                value={spec.weekday}
                onChange={(event) =>
                  onChange({ ...spec, weekday: event.target.value as RumReportWeekday })
                }
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        {showMonthday && (
          <EuiFlexItem>
            <EuiFormRow
              fullWidth
              style={{ width: '100%' }}
              label={i18n.translate('xpack.ux.reports.schedule.onMonthdayLabel', {
                defaultMessage: 'On day',
              })}
            >
              <EuiSelect
                fullWidth
                data-test-subj="uxReportScheduleMonthday"
                options={monthdayOptions}
                value={String(spec.monthday)}
                onChange={(event) => onChange({ ...spec, monthday: Number(event.target.value) })}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        <p>{periodHelp(spec.cadence)}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="m" responsive={false} alignItems="flexStart">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            style={{ width: '100%' }}
            label={i18n.translate('xpack.ux.reports.schedule.atTimeLabel', {
              defaultMessage: 'At',
            })}
          >
            <EuiFlexGroup gutterSize="s" responsive={false} style={{ width: '100%' }}>
              <EuiFlexItem>
                <EuiSelect
                  fullWidth
                  data-test-subj="uxReportScheduleHour"
                  options={hourOptions}
                  value={String(spec.hour)}
                  onChange={(event) => onChange({ ...spec, hour: Number(event.target.value) })}
                  aria-label={i18n.translate('xpack.ux.reports.schedule.hourAriaLabel', {
                    defaultMessage: 'Hour',
                  })}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  fullWidth
                  data-test-subj="uxReportScheduleMinute"
                  options={minuteOptions}
                  value={String(spec.minute)}
                  onChange={(event) =>
                    onChange({ ...spec, minute: Number(event.target.value) as RumReportMinute })
                  }
                  aria-label={i18n.translate('xpack.ux.reports.schedule.minuteAriaLabel', {
                    defaultMessage: 'Minute',
                  })}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            style={{ width: '100%' }}
            label={i18n.translate('xpack.ux.reports.schedule.timezoneLabel', {
              defaultMessage: 'Time zone',
            })}
          >
            <EuiSelect
              fullWidth
              data-test-subj="uxReportScheduleTzid"
              options={tzOptions}
              value={spec.tzid === browserTzid || spec.tzid === 'UTC' ? spec.tzid : 'UTC'}
              onChange={(event) => onChange({ ...spec, tzid: event.target.value })}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        <p>{formatScheduleLabel(spec)}</p>
      </EuiText>
    </>
  );
}
