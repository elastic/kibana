import * as rt from 'io-ts';
import type { InfraDatabaseSearchResponse, CallWithRequestParams } from '../adapters/framework';
export type ESSearchClient = <Hit = {}, Aggregation = undefined>(options: CallWithRequestParams) => Promise<InfraDatabaseSearchResponse<Hit, Aggregation>>;
export declare const BasicMetricValueRT: rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>;
export declare const NormalizedMetricValueRT: rt.IntersectionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.TypeC<{
    normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>]>;
export declare const PercentilesTypeRT: rt.TypeC<{
    values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
}>;
export declare const PercentilesKeyedTypeRT: rt.TypeC<{
    values: rt.ArrayC<rt.TypeC<{
        key: rt.StringC;
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>;
}>;
export declare const TopMetricsTypeRT: rt.TypeC<{
    top: rt.ArrayC<rt.TypeC<{
        sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
        metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
    }>>;
}>;
export declare const MaxPeriodFilterExistsTypeRT: rt.TypeC<{
    doc_count: rt.NumberC;
    period: rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>;
}>;
export declare const FilterWithNestedAggRT: rt.IntersectionC<[rt.TypeC<{
    doc_count: rt.NumberC;
}>, rt.RecordC<rt.StringC, rt.UnknownC>]>;
export declare const MetricValueTypeRT: rt.UnionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.IntersectionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.TypeC<{
    normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>]>, rt.TypeC<{
    values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
}>, rt.TypeC<{
    values: rt.ArrayC<rt.TypeC<{
        key: rt.StringC;
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>;
}>, rt.TypeC<{
    top: rt.ArrayC<rt.TypeC<{
        sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
        metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
    }>>;
}>, rt.TypeC<{
    doc_count: rt.NumberC;
    period: rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>;
}>]>;
export type MetricValueType = rt.TypeOf<typeof MetricValueTypeRT>;
export declare const TermsWithMetrics: rt.IntersectionC<[rt.TypeC<{
    buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>, rt.IntersectionC<[rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>, rt.TypeC<{
        normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>]>, rt.TypeC<{
        values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
    }>, rt.TypeC<{
        values: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>;
    }>, rt.TypeC<{
        top: rt.ArrayC<rt.TypeC<{
            sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
            metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
        }>>;
    }>, rt.TypeC<{
        doc_count: rt.NumberC;
        period: rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>;
    }>]>]>>>;
}>, rt.PartialC<{
    sum_other_doc_count: rt.NumberC;
    doc_count_error_upper_bound: rt.NumberC;
}>]>;
export declare const BucketRT: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.IntersectionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.TypeC<{
    normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>]>, rt.TypeC<{
    values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
}>, rt.TypeC<{
    values: rt.ArrayC<rt.TypeC<{
        key: rt.StringC;
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>;
}>, rt.TypeC<{
    top: rt.ArrayC<rt.TypeC<{
        sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
        metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
    }>>;
}>, rt.TypeC<{
    doc_count: rt.NumberC;
    period: rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>;
}>]>, rt.IntersectionC<[rt.TypeC<{
    buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>, rt.IntersectionC<[rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>, rt.TypeC<{
        normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>]>, rt.TypeC<{
        values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
    }>, rt.TypeC<{
        values: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>;
    }>, rt.TypeC<{
        top: rt.ArrayC<rt.TypeC<{
            sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
            metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
        }>>;
    }>, rt.TypeC<{
        doc_count: rt.NumberC;
        period: rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>;
    }>]>]>>>;
}>, rt.PartialC<{
    sum_other_doc_count: rt.NumberC;
    doc_count_error_upper_bound: rt.NumberC;
}>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
    doc_count: rt.NumberC;
}>]>>;
export declare const MetricsetRT: rt.TypeC<{
    buckets: rt.ArrayC<rt.TypeC<{
        key: rt.StringC;
        doc_count: rt.NumberC;
    }>>;
}>;
export declare const HistogramRT: rt.TypeC<{
    histogram: rt.TypeC<{
        buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.IntersectionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.TypeC<{
            normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>]>, rt.TypeC<{
            values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
        }>, rt.TypeC<{
            values: rt.ArrayC<rt.TypeC<{
                key: rt.StringC;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>;
        }>, rt.TypeC<{
            top: rt.ArrayC<rt.TypeC<{
                sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
            }>>;
        }>, rt.TypeC<{
            doc_count: rt.NumberC;
            period: rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>;
        }>]>, rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.IntersectionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.TypeC<{
                normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>]>, rt.TypeC<{
                values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
            }>, rt.TypeC<{
                values: rt.ArrayC<rt.TypeC<{
                    key: rt.StringC;
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>;
            }>, rt.TypeC<{
                top: rt.ArrayC<rt.TypeC<{
                    sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                    metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
                }>>;
            }>, rt.TypeC<{
                doc_count: rt.NumberC;
                period: rt.TypeC<{
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>;
            }>]>]>>>;
        }>, rt.PartialC<{
            sum_other_doc_count: rt.NumberC;
            doc_count_error_upper_bound: rt.NumberC;
        }>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
            doc_count: rt.NumberC;
        }>]>>>;
    }>;
    metricsets: rt.TypeC<{
        buckets: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            doc_count: rt.NumberC;
        }>>;
    }>;
}>;
export declare const MetricsBucketRT: rt.IntersectionC<[rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.IntersectionC<[rt.TypeC<{
    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>, rt.TypeC<{
    normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
}>]>, rt.TypeC<{
    values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
}>, rt.TypeC<{
    values: rt.ArrayC<rt.TypeC<{
        key: rt.StringC;
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>>;
}>, rt.TypeC<{
    top: rt.ArrayC<rt.TypeC<{
        sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
        metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
    }>>;
}>, rt.TypeC<{
    doc_count: rt.NumberC;
    period: rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>;
}>]>, rt.IntersectionC<[rt.TypeC<{
    buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>, rt.IntersectionC<[rt.TypeC<{
        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>, rt.TypeC<{
        normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
    }>]>, rt.TypeC<{
        values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
    }>, rt.TypeC<{
        values: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>>;
    }>, rt.TypeC<{
        top: rt.ArrayC<rt.TypeC<{
            sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
            metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
        }>>;
    }>, rt.TypeC<{
        doc_count: rt.NumberC;
        period: rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>;
    }>]>]>>>;
}>, rt.PartialC<{
    sum_other_doc_count: rt.NumberC;
    doc_count_error_upper_bound: rt.NumberC;
}>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
    doc_count: rt.NumberC;
}>]>>, rt.TypeC<{
    metricsets: rt.TypeC<{
        buckets: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            doc_count: rt.NumberC;
        }>>;
    }>;
}>]>;
export declare const HistogramBucketRT: rt.IntersectionC<[rt.TypeC<{
    key: rt.RecordC<rt.StringC, rt.StringC>;
    doc_count: rt.NumberC;
}>, rt.TypeC<{
    histogram: rt.TypeC<{
        buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.IntersectionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.TypeC<{
            normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>]>, rt.TypeC<{
            values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
        }>, rt.TypeC<{
            values: rt.ArrayC<rt.TypeC<{
                key: rt.StringC;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>;
        }>, rt.TypeC<{
            top: rt.ArrayC<rt.TypeC<{
                sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
            }>>;
        }>, rt.TypeC<{
            doc_count: rt.NumberC;
            period: rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>;
        }>]>, rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.IntersectionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.TypeC<{
                normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>]>, rt.TypeC<{
                values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
            }>, rt.TypeC<{
                values: rt.ArrayC<rt.TypeC<{
                    key: rt.StringC;
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>;
            }>, rt.TypeC<{
                top: rt.ArrayC<rt.TypeC<{
                    sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                    metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
                }>>;
            }>, rt.TypeC<{
                doc_count: rt.NumberC;
                period: rt.TypeC<{
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>;
            }>]>]>>>;
        }>, rt.PartialC<{
            sum_other_doc_count: rt.NumberC;
            doc_count_error_upper_bound: rt.NumberC;
        }>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
            doc_count: rt.NumberC;
        }>]>>>;
    }>;
    metricsets: rt.TypeC<{
        buckets: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            doc_count: rt.NumberC;
        }>>;
    }>;
}>]>;
export declare const AggregationResponseRT: rt.TypeC<{
    histogram: rt.TypeC<{
        buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.IntersectionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.TypeC<{
            normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>]>, rt.TypeC<{
            values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
        }>, rt.TypeC<{
            values: rt.ArrayC<rt.TypeC<{
                key: rt.StringC;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>;
        }>, rt.TypeC<{
            top: rt.ArrayC<rt.TypeC<{
                sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
            }>>;
        }>, rt.TypeC<{
            doc_count: rt.NumberC;
            period: rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>;
        }>]>, rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.IntersectionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.TypeC<{
                normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>]>, rt.TypeC<{
                values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
            }>, rt.TypeC<{
                values: rt.ArrayC<rt.TypeC<{
                    key: rt.StringC;
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>;
            }>, rt.TypeC<{
                top: rt.ArrayC<rt.TypeC<{
                    sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                    metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
                }>>;
            }>, rt.TypeC<{
                doc_count: rt.NumberC;
                period: rt.TypeC<{
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>;
            }>]>]>>>;
        }>, rt.PartialC<{
            sum_other_doc_count: rt.NumberC;
            doc_count_error_upper_bound: rt.NumberC;
        }>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
            doc_count: rt.NumberC;
        }>]>>>;
    }>;
    metricsets: rt.TypeC<{
        buckets: rt.ArrayC<rt.TypeC<{
            key: rt.StringC;
            doc_count: rt.NumberC;
        }>>;
    }>;
}>;
export declare const CompositeResponseRT: rt.TypeC<{
    groupings: rt.IntersectionC<[rt.TypeC<{
        buckets: rt.ArrayC<rt.UnionC<[rt.IntersectionC<[rt.TypeC<{
            key: rt.RecordC<rt.StringC, rt.StringC>;
            doc_count: rt.NumberC;
        }>, rt.TypeC<{
            histogram: rt.TypeC<{
                buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>, rt.IntersectionC<[rt.TypeC<{
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>, rt.TypeC<{
                    normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>]>, rt.TypeC<{
                    values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
                }>, rt.TypeC<{
                    values: rt.ArrayC<rt.TypeC<{
                        key: rt.StringC;
                        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                    }>>;
                }>, rt.TypeC<{
                    top: rt.ArrayC<rt.TypeC<{
                        sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                        metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
                    }>>;
                }>, rt.TypeC<{
                    doc_count: rt.NumberC;
                    period: rt.TypeC<{
                        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                    }>;
                }>]>, rt.IntersectionC<[rt.TypeC<{
                    buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
                        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                    }>, rt.IntersectionC<[rt.TypeC<{
                        value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                    }>, rt.TypeC<{
                        normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                    }>]>, rt.TypeC<{
                        values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
                    }>, rt.TypeC<{
                        values: rt.ArrayC<rt.TypeC<{
                            key: rt.StringC;
                            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                        }>>;
                    }>, rt.TypeC<{
                        top: rt.ArrayC<rt.TypeC<{
                            sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                            metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
                        }>>;
                    }>, rt.TypeC<{
                        doc_count: rt.NumberC;
                        period: rt.TypeC<{
                            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                        }>;
                    }>]>]>>>;
                }>, rt.PartialC<{
                    sum_other_doc_count: rt.NumberC;
                    doc_count_error_upper_bound: rt.NumberC;
                }>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
                    doc_count: rt.NumberC;
                }>]>>>;
            }>;
            metricsets: rt.TypeC<{
                buckets: rt.ArrayC<rt.TypeC<{
                    key: rt.StringC;
                    doc_count: rt.NumberC;
                }>>;
            }>;
        }>]>, rt.IntersectionC<[rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.IntersectionC<[rt.TypeC<{
            value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>, rt.TypeC<{
            normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
        }>]>, rt.TypeC<{
            values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
        }>, rt.TypeC<{
            values: rt.ArrayC<rt.TypeC<{
                key: rt.StringC;
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>>;
        }>, rt.TypeC<{
            top: rt.ArrayC<rt.TypeC<{
                sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
            }>>;
        }>, rt.TypeC<{
            doc_count: rt.NumberC;
            period: rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>;
        }>]>, rt.IntersectionC<[rt.TypeC<{
            buckets: rt.ArrayC<rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.UnionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.IntersectionC<[rt.TypeC<{
                value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>, rt.TypeC<{
                normalized_value: rt.UnionC<[rt.NumberC, rt.NullC]>;
            }>]>, rt.TypeC<{
                values: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.NullC]>>;
            }>, rt.TypeC<{
                values: rt.ArrayC<rt.TypeC<{
                    key: rt.StringC;
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>>;
            }>, rt.TypeC<{
                top: rt.ArrayC<rt.TypeC<{
                    sort: rt.UnionC<[rt.ArrayC<rt.NumberC>, rt.ArrayC<rt.StringC>]>;
                    metrics: rt.RecordC<rt.StringC, rt.UnionC<[rt.NumberC, rt.StringC, rt.NullC]>>;
                }>>;
            }>, rt.TypeC<{
                doc_count: rt.NumberC;
                period: rt.TypeC<{
                    value: rt.UnionC<[rt.NumberC, rt.NullC]>;
                }>;
            }>]>]>>>;
        }>, rt.PartialC<{
            sum_other_doc_count: rt.NumberC;
            doc_count_error_upper_bound: rt.NumberC;
        }>]>, rt.RecordC<rt.StringC, rt.StringC>, rt.TypeC<{
            doc_count: rt.NumberC;
        }>]>>, rt.TypeC<{
            metricsets: rt.TypeC<{
                buckets: rt.ArrayC<rt.TypeC<{
                    key: rt.StringC;
                    doc_count: rt.NumberC;
                }>>;
            }>;
        }>]>]>>;
    }>, rt.PartialC<{
        after_key: rt.RecordC<rt.StringC, rt.StringC>;
    }>]>;
}>;
export type Bucket = rt.TypeOf<typeof BucketRT>;
export type HistogramBucket = rt.TypeOf<typeof HistogramBucketRT>;
export type CompositeResponse = rt.TypeOf<typeof CompositeResponseRT>;
export type AggregationResponse = rt.TypeOf<typeof AggregationResponseRT>;
export type MetricsESResponse = AggregationResponse | CompositeResponse;
export interface LogQueryFields {
    indexPattern: string;
}
