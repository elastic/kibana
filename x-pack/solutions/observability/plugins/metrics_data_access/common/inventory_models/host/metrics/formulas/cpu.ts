/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  CPU_USAGE_LABEL,
  LOAD_15M_LABEL,
  LOAD_1M_LABEL,
  LOAD_5M_LABEL,
  NORMALIZED_LOAD_LABEL,
} from '../../../shared/charts/constants';
import type { SchemaBasedFormula } from '../../../shared/metrics/types';

export const cpuUsageIowait: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.iowaitLabel', {
    defaultMessage: 'iowait',
  }),
  value: {
    ecs: 'average(system.cpu.iowait.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: wait') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsageIrq: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.irqLabel', {
    defaultMessage: 'irq',
  }),
  value: {
    ecs: 'average(system.cpu.irq.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: interrupt') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsageNice: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.niceLabel', {
    defaultMessage: 'nice',
  }),
  value: {
    ecs: 'average(system.cpu.nice.norm.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: nice') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSoftirq: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.softirqLabel', {
    defaultMessage: 'softirq',
  }),
  value: {
    ecs: 'average(system.cpu.softirq.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: softirq') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSteal: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.stealLabel', {
    defaultMessage: 'steal',
  }),
  value: {
    ecs: 'average(system.cpu.steal.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: steal') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsageSystem: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.systemLabel', {
    defaultMessage: 'system',
  }),
  value: {
    ecs: 'average(system.cpu.system.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: system') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsageUser: SchemaBasedFormula = {
  label: i18n.translate('xpack.metricsData.assetDetails.formulas.cpuUsage.userLabel', {
    defaultMessage: 'user',
  }),
  value: {
    ecs: 'average(system.cpu.user.pct) / max(system.cpu.cores)',
    semconv:
      "average(metrics.system.cpu.utilization,kql='state: user') / max(metrics.system.cpu.logical.count)",
  },
  format: 'percent',
  decimals: 1,
};

export const cpuUsage: SchemaBasedFormula = {
  label: CPU_USAGE_LABEL,
  value: {
    ecs: 'average(system.cpu.total.norm.pct)',
    semconv:
      "1-(average(metrics.system.cpu.utilization,kql='state: idle') + average(metrics.system.cpu.utilization,kql='state: wait'))",
  },
  format: 'percent',
  decimals: 0,
};

export const load1m: SchemaBasedFormula = {
  label: LOAD_1M_LABEL,
  value: {
    ecs: 'average(system.load.1)',
    semconv: 'average(metrics.system.cpu.load_average.1m)',
  },
  format: 'number',
  decimals: 1,
};

export const load5m: SchemaBasedFormula = {
  label: LOAD_5M_LABEL,
  value: {
    ecs: 'average(system.load.5)',
    semconv: 'average(metrics.system.cpu.load_average.5m)',
  },
  format: 'number',
  decimals: 1,
};

export const load15m: SchemaBasedFormula = {
  label: LOAD_15M_LABEL,
  value: {
    ecs: 'average(system.load.15)',
    semconv: 'average(metrics.system.cpu.load_average.15m)',
  },
  format: 'number',
  decimals: 1,
};

export const normalizedLoad1m: SchemaBasedFormula = {
  label: NORMALIZED_LOAD_LABEL,
  value: {
    ecs: 'average(system.load.1) / max(system.load.cores)',
    semconv: 'average(metrics.system.cpu.load_average.1m) / max(metrics.system.cpu.logical.count)',
  },
  format: 'percent',
  decimals: 0,
};
