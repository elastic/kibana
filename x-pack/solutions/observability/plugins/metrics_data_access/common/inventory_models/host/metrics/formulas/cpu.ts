/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { LensBaseLayer } from '@kbn/lens-embeddable-utils/config_builder';
import {
  CPU_USAGE_LABEL,
  LOAD_15M_LABEL,
  LOAD_1M_LABEL,
  LOAD_5M_LABEL,
  NORMALIZED_LOAD_LABEL,
} from '../../../shared/charts/constants';
import { getFormulaForSchema } from '../../../shared/formulas/get_formula_for_schema';

export const cpuUsageIowait: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.iowaitLabel', {
    defaultMessage: 'iowait',
  }),
  value: `defaults(
        average(system.cpu.iowait.pct), 
        average(system.cpu.utilization,kql='state: wait')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsageIrq: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.irqLabel', {
    defaultMessage: 'irq',
  }),
  value: `defaults(
        average(system.cpu.irq.pct), 
        average(system.cpu.utilization,kql='state: interrupt')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsageNice: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.niceLabel', {
    defaultMessage: 'nice',
  }),
  value: `defaults(
        average(system.cpu.nice.norm.pct), 
        average(system.cpu.utilization,kql='state: nice')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSoftirq: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.softirqLabel', {
    defaultMessage: 'softirq',
  }),
  value: `defaults(
        average(system.cpu.softirq.pct), 
        average(system.cpu.utilization,kql='state: softirq')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSteal: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.stealLabel', {
    defaultMessage: 'steal',
  }),
  value: `defaults(
        average(system.cpu.steal.pct), 
        average(system.cpu.utilization,kql='state: steal')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSystem: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.systemLabel', {
    defaultMessage: 'system',
  }),
  value: `defaults(
        average(system.cpu.system.pct), 
        average(system.cpu.utilization,kql='state: system')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsageUser: LensBaseLayer = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.userLabel', {
    defaultMessage: 'user',
  }),
  value: `defaults(
        average(system.cpu.user.pct), 
        average(system.cpu.utilization,kql='state: user')
    ) / defaults(
        max(system.cpu.cores),
        max(system.cpu.logical.count)
    )`,
  format: 'percent',
  decimals: 1,
};

export const cpuUsage: {
  get: ({ schemas }: { schemas: Array<'ecs' | 'semconv'> }) => LensBaseLayer;
} = {
  get: ({ schemas }) => ({
    label: CPU_USAGE_LABEL,
    value: getFormulaForSchema({
      formulaBySchema: {
        ecs: 'average(system.cpu.total.norm.pct)',
        semconv: `1-(average(system.cpu.utilization,kql='attributes.state: idle') + average(system.cpu.utilization,kql='attributes.state: wait'))`,
        hybrid: `defaults(average(system.cpu.total.norm.pct), 1-(average(system.cpu.utilization,kql='attributes.state: idle') + average(system.cpu.utilization,kql='attributes.state: wait')))`,
      },
      schemas,
    }),
    format: 'percent',
    decimals: 0,
  }),
};

export const load1m: LensBaseLayer = {
  label: LOAD_1M_LABEL,
  value: `defaults(
        average(system.load.1),
        average(system.cpu.load_average.1m)
    )`,
  format: 'number',
  decimals: 1,
};

export const load5m: LensBaseLayer = {
  label: LOAD_5M_LABEL,
  value: `defaults(
        average(system.load.5),
        average(system.cpu.load_average.5m)
    )`,
  format: 'number',
  decimals: 1,
};

export const load15m: LensBaseLayer = {
  label: LOAD_15M_LABEL,
  value: `defaults(
        average(system.load.15),
        average(system.cpu.load_average.15m)
    )`,
  format: 'number',
  decimals: 1,
};

export const normalizedLoad1m: LensBaseLayer = {
  label: NORMALIZED_LOAD_LABEL,
  value: `defaults(
        average(system.cpu.load_average.1m), 
        average(system.load.1)
    ) / defaults(
        max(system.cpu.logical.count),
        max(system.load.cores)
    )`,
  format: 'percent',
  decimals: 0,
};
