import type { ReportViewType, SeriesUrl } from '../types';
import type { AllSeries } from '../../../..';
export declare function convertToShortUrl(series: SeriesUrl): {
    time: {
        to: string;
        from: string;
    };
    textReportDefinitions?: import("../types").URLTextReportDefinition;
    showPercentileAnnotations?: boolean;
    op: string | undefined;
    st: import("@kbn/lens-common").SeriesType | undefined;
    bd: string | undefined;
    ft: import("../types").UrlFilter[] | undefined;
    rdf: import("../types").URLReportDefinition | undefined;
    dt: import("../types").AppDataType;
    mt: string | undefined;
    h: boolean | undefined;
    n: string;
    c: string | undefined;
};
export declare function createExploratoryViewUrl({ reportType, allSeries }: {
    reportType: ReportViewType;
    allSeries: AllSeries;
}, baseHref?: string): string;
/**
 * Encodes the uri if it contains characters (`/?@&=+#`).
 * It doesn't consider `,` and `:` as they are part of [Rison]{@link https://www.npmjs.com/package/rison-node} syntax.
 *
 * @param uri Non encoded URI
 */
export declare function encodeUriIfNeeded(uri: string): string;
