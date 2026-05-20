import type { Rule } from '@kbn/alerts-ui-shared';
import type { TopAlert } from '../../../../typings/alerts';
export declare const useDiscoverUrl: ({ alert, rule }: {
    alert: TopAlert | null;
    rule?: Rule;
}) => {
    discoverUrl: string;
} | {
    discoverUrl: null;
};
