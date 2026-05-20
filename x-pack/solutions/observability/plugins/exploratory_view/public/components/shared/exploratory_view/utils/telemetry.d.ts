import type { TrackEvent } from '@kbn/observability-shared-plugin/public';
import type { SeriesUrl } from '../types';
export declare const trackTelemetryOnApply: (trackEvent: TrackEvent, allSeries: SeriesUrl[], reportType: string) => void;
export declare const trackTelemetryOnLoad: (trackEvent: TrackEvent, start: number, end: number) => void;
export declare const trackChartLoadingTime: (trackEvent: TrackEvent, start: number, end: number) => void;
