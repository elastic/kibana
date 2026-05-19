import * as t from 'io-ts';
/**
 * This type has some overlap with the Ping type, but it helps avoid runtime type
 * check failures and removes a lot of unnecessary fields that our Synthetics UI code
 * does not care about.
 */
export declare const SyntheticsDataType: t.PartialC<{
    index: t.NumberC;
    journey: t.TypeC<{
        id: t.StringC;
        name: t.StringC;
    }>;
    error: t.PartialC<{
        message: t.StringC;
        name: t.StringC;
        stack: t.StringC;
    }>;
    package_version: t.StringC;
    step: t.TypeC<{
        status: t.StringC;
        index: t.NumberC;
        name: t.StringC;
        duration: t.TypeC<{
            us: t.NumberC;
        }>;
    }>;
    type: t.StringC;
    blob: t.StringC;
    blob_mime: t.StringC;
    payload: t.PartialC<{
        duration: t.NumberC;
        index: t.NumberC;
        is_navigation_request: t.BooleanC;
        message: t.StringC;
        method: t.StringC;
        name: t.StringC;
        params: t.PartialC<{
            homepage: t.StringC;
        }>;
        source: t.StringC;
        start: t.NumberC;
        status: t.StringC;
        ts: t.NumberC;
        type: t.StringC;
        url: t.StringC;
        end: t.NumberC;
        text: t.StringC;
    }>;
    isFullScreenshot: t.BooleanC;
    isScreenshotRef: t.BooleanC;
}>;
export declare const JourneyStepType: t.IntersectionC<[t.PartialC<{
    config_id: t.StringC;
    monitor: t.PartialC<{
        duration: t.TypeC<{
            us: t.NumberC;
        }>;
        name: t.StringC;
        status: t.StringC;
        type: t.StringC;
        timespan: t.TypeC<{
            gte: t.StringC;
            lt: t.StringC;
        }>;
    }>;
    observer: t.PartialC<{
        hostname: t.StringC;
        ip: t.ArrayC<t.StringC>;
        mac: t.ArrayC<t.StringC>;
        name: t.UnionC<[t.StringC, t.UndefinedC]>;
        geo: t.PartialC<{
            name: t.StringC;
            continent_name: t.StringC;
            city_name: t.StringC;
            country_iso_code: t.StringC;
            location: t.UnionC<[t.StringC, t.PartialC<{
                lat: t.NumberC;
                lon: t.NumberC;
            }>, t.PartialC<{
                lat: t.StringC;
                lon: t.StringC;
            }>]>;
        }>;
    }>;
    synthetics: t.PartialC<{
        index: t.NumberC;
        journey: t.TypeC<{
            id: t.StringC;
            name: t.StringC;
        }>;
        error: t.PartialC<{
            message: t.StringC;
            name: t.StringC;
            stack: t.StringC;
        }>;
        package_version: t.StringC;
        step: t.TypeC<{
            status: t.StringC;
            index: t.NumberC;
            name: t.StringC;
            duration: t.TypeC<{
                us: t.NumberC;
            }>;
        }>;
        type: t.StringC;
        blob: t.StringC;
        blob_mime: t.StringC;
        payload: t.PartialC<{
            duration: t.NumberC;
            index: t.NumberC;
            is_navigation_request: t.BooleanC;
            message: t.StringC;
            method: t.StringC;
            name: t.StringC;
            params: t.PartialC<{
                homepage: t.StringC;
            }>;
            source: t.StringC;
            start: t.NumberC;
            status: t.StringC;
            ts: t.NumberC;
            type: t.StringC;
            url: t.StringC;
            end: t.NumberC;
            text: t.StringC;
        }>;
        isFullScreenshot: t.BooleanC;
        isScreenshotRef: t.BooleanC;
    }>;
    error: t.TypeC<{
        message: t.StringC;
    }>;
}>, t.TypeC<{
    _id: t.StringC;
    '@timestamp': t.StringC;
    monitor: t.TypeC<{
        id: t.StringC;
        check_group: t.StringC;
    }>;
    synthetics: t.TypeC<{
        type: t.StringC;
    }>;
}>]>;
export type JourneyStep = t.TypeOf<typeof JourneyStepType>;
export declare const FailedStepsApiResponseType: t.TypeC<{
    checkGroups: t.ArrayC<t.StringC>;
    steps: t.ArrayC<t.IntersectionC<[t.PartialC<{
        config_id: t.StringC;
        monitor: t.PartialC<{
            duration: t.TypeC<{
                us: t.NumberC;
            }>;
            name: t.StringC;
            status: t.StringC;
            type: t.StringC;
            timespan: t.TypeC<{
                gte: t.StringC;
                lt: t.StringC;
            }>;
        }>;
        observer: t.PartialC<{
            hostname: t.StringC;
            ip: t.ArrayC<t.StringC>;
            mac: t.ArrayC<t.StringC>;
            name: t.UnionC<[t.StringC, t.UndefinedC]>;
            geo: t.PartialC<{
                name: t.StringC;
                continent_name: t.StringC;
                city_name: t.StringC;
                country_iso_code: t.StringC;
                location: t.UnionC<[t.StringC, t.PartialC<{
                    lat: t.NumberC;
                    lon: t.NumberC;
                }>, t.PartialC<{
                    lat: t.StringC;
                    lon: t.StringC;
                }>]>;
            }>;
        }>;
        synthetics: t.PartialC<{
            index: t.NumberC;
            journey: t.TypeC<{
                id: t.StringC;
                name: t.StringC;
            }>;
            error: t.PartialC<{
                message: t.StringC;
                name: t.StringC;
                stack: t.StringC;
            }>;
            package_version: t.StringC;
            step: t.TypeC<{
                status: t.StringC;
                index: t.NumberC;
                name: t.StringC;
                duration: t.TypeC<{
                    us: t.NumberC;
                }>;
            }>;
            type: t.StringC;
            blob: t.StringC;
            blob_mime: t.StringC;
            payload: t.PartialC<{
                duration: t.NumberC;
                index: t.NumberC;
                is_navigation_request: t.BooleanC;
                message: t.StringC;
                method: t.StringC;
                name: t.StringC;
                params: t.PartialC<{
                    homepage: t.StringC;
                }>;
                source: t.StringC;
                start: t.NumberC;
                status: t.StringC;
                ts: t.NumberC;
                type: t.StringC;
                url: t.StringC;
                end: t.NumberC;
                text: t.StringC;
            }>;
            isFullScreenshot: t.BooleanC;
            isScreenshotRef: t.BooleanC;
        }>;
        error: t.TypeC<{
            message: t.StringC;
        }>;
    }>, t.TypeC<{
        _id: t.StringC;
        '@timestamp': t.StringC;
        monitor: t.TypeC<{
            id: t.StringC;
            check_group: t.StringC;
        }>;
        synthetics: t.TypeC<{
            type: t.StringC;
        }>;
    }>]>>;
}>;
export type FailedStepsApiResponse = t.TypeOf<typeof FailedStepsApiResponseType>;
/**
 * The individual screenshot blocks Synthetics uses to reduce disk footprint.
 */
export declare const ScreenshotBlockType: t.TypeC<{
    hash: t.StringC;
    top: t.NumberC;
    left: t.NumberC;
    height: t.NumberC;
    width: t.NumberC;
}>;
/**
 * The old style of screenshot document that contains a full screenshot blob.
 */
export declare const FullScreenshotType: t.TypeC<{
    synthetics: t.IntersectionC<[t.PartialC<{
        blob: t.StringC;
        blob_mime: t.StringC;
    }>, t.TypeC<{
        step: t.TypeC<{
            name: t.StringC;
        }>;
        type: t.LiteralC<"step/screenshot">;
    }>]>;
}>;
export type FullScreenshot = t.TypeOf<typeof FullScreenshotType>;
export declare function isFullScreenshot(data: unknown): data is FullScreenshot;
/**
 * The ref used by synthetics to organize the blocks needed to recompose a
 * fragmented image.
 */
export declare const RefResultType: t.TypeC<{
    '@timestamp': t.StringC;
    monitor: t.TypeC<{
        check_group: t.StringC;
    }>;
    screenshot_ref: t.TypeC<{
        width: t.NumberC;
        height: t.NumberC;
        blocks: t.ArrayC<t.TypeC<{
            hash: t.StringC;
            top: t.NumberC;
            left: t.NumberC;
            height: t.NumberC;
            width: t.NumberC;
        }>>;
    }>;
    synthetics: t.TypeC<{
        package_version: t.StringC;
        step: t.TypeC<{
            name: t.StringC;
            index: t.NumberC;
        }>;
        type: t.LiteralC<"step/screenshot_ref">;
    }>;
}>;
export type RefResult = t.TypeOf<typeof RefResultType>;
export declare function isRefResult(data: unknown): data is RefResult;
/**
 * Represents the result of querying for the legacy-style full screenshot blob.
 */
export declare const ScreenshotImageBlobType: t.TypeC<{
    stepName: t.UnionC<[t.NullC, t.StringC]>;
    maxSteps: t.NumberC;
    src: t.StringC;
}>;
export type ScreenshotImageBlob = t.TypeOf<typeof ScreenshotImageBlobType>;
export declare function isScreenshotImageBlob(data: unknown): data is ScreenshotImageBlob;
/**
 * Represents the block blobs stored by hash. These documents are used to recompose synthetics images.
 */
export declare const ScreenshotBlockDocType: t.TypeC<{
    id: t.StringC;
    synthetics: t.TypeC<{
        blob: t.StringC;
        blob_mime: t.StringC;
    }>;
}>;
export type ScreenshotBlockDoc = t.TypeOf<typeof ScreenshotBlockDocType>;
export interface PendingBlock {
    status: 'pending' | 'loading';
}
export type StoreScreenshotBlock = ScreenshotBlockDoc | PendingBlock;
export interface ScreenshotBlockCache {
    [hash: string]: StoreScreenshotBlock;
}
export declare function isScreenshotBlockDoc(data: unknown): data is ScreenshotBlockDoc;
export declare function isPendingBlock(data: unknown): data is PendingBlock;
/**
 * Contains the fields requried by the Synthetics UI when utilizing screenshot refs.
 */
export declare const ScreenshotRefImageDataType: t.TypeC<{
    stepName: t.UnionC<[t.NullC, t.StringC]>;
    maxSteps: t.NumberC;
    ref: t.TypeC<{
        screenshotRef: t.TypeC<{
            '@timestamp': t.StringC;
            monitor: t.TypeC<{
                check_group: t.StringC;
            }>;
            screenshot_ref: t.TypeC<{
                width: t.NumberC;
                height: t.NumberC;
                blocks: t.ArrayC<t.TypeC<{
                    hash: t.StringC;
                    top: t.NumberC;
                    left: t.NumberC;
                    height: t.NumberC;
                    width: t.NumberC;
                }>>;
            }>;
            synthetics: t.TypeC<{
                package_version: t.StringC;
                step: t.TypeC<{
                    name: t.StringC;
                    index: t.NumberC;
                }>;
                type: t.LiteralC<"step/screenshot_ref">;
            }>;
        }>;
    }>;
}>;
export type ScreenshotRefImageData = t.TypeOf<typeof ScreenshotRefImageDataType>;
export declare function isScreenshotRef(data: unknown): data is ScreenshotRefImageData;
export declare const SyntheticsJourneyApiResponseType: t.IntersectionC<[t.TypeC<{
    checkGroup: t.StringC;
    steps: t.ArrayC<t.IntersectionC<[t.PartialC<{
        config_id: t.StringC;
        monitor: t.PartialC<{
            duration: t.TypeC<{
                us: t.NumberC;
            }>;
            name: t.StringC;
            status: t.StringC;
            type: t.StringC;
            timespan: t.TypeC<{
                gte: t.StringC;
                lt: t.StringC;
            }>;
        }>;
        observer: t.PartialC<{
            hostname: t.StringC;
            ip: t.ArrayC<t.StringC>;
            mac: t.ArrayC<t.StringC>;
            name: t.UnionC<[t.StringC, t.UndefinedC]>;
            geo: t.PartialC<{
                name: t.StringC;
                continent_name: t.StringC;
                city_name: t.StringC;
                country_iso_code: t.StringC;
                location: t.UnionC<[t.StringC, t.PartialC<{
                    lat: t.NumberC;
                    lon: t.NumberC;
                }>, t.PartialC<{
                    lat: t.StringC;
                    lon: t.StringC;
                }>]>;
            }>;
        }>;
        synthetics: t.PartialC<{
            index: t.NumberC;
            journey: t.TypeC<{
                id: t.StringC;
                name: t.StringC;
            }>;
            error: t.PartialC<{
                message: t.StringC;
                name: t.StringC;
                stack: t.StringC;
            }>;
            package_version: t.StringC;
            step: t.TypeC<{
                status: t.StringC;
                index: t.NumberC;
                name: t.StringC;
                duration: t.TypeC<{
                    us: t.NumberC;
                }>;
            }>;
            type: t.StringC;
            blob: t.StringC;
            blob_mime: t.StringC;
            payload: t.PartialC<{
                duration: t.NumberC;
                index: t.NumberC;
                is_navigation_request: t.BooleanC;
                message: t.StringC;
                method: t.StringC;
                name: t.StringC;
                params: t.PartialC<{
                    homepage: t.StringC;
                }>;
                source: t.StringC;
                start: t.NumberC;
                status: t.StringC;
                ts: t.NumberC;
                type: t.StringC;
                url: t.StringC;
                end: t.NumberC;
                text: t.StringC;
            }>;
            isFullScreenshot: t.BooleanC;
            isScreenshotRef: t.BooleanC;
        }>;
        error: t.TypeC<{
            message: t.StringC;
        }>;
    }>, t.TypeC<{
        _id: t.StringC;
        '@timestamp': t.StringC;
        monitor: t.TypeC<{
            id: t.StringC;
            check_group: t.StringC;
        }>;
        synthetics: t.TypeC<{
            type: t.StringC;
        }>;
    }>]>>;
}>, t.PartialC<{
    details: t.UnionC<[t.IntersectionC<[t.TypeC<{
        timestamp: t.StringC;
        journey: t.IntersectionC<[t.PartialC<{
            config_id: t.StringC;
            monitor: t.PartialC<{
                duration: t.TypeC<{
                    us: t.NumberC;
                }>;
                name: t.StringC;
                status: t.StringC;
                type: t.StringC;
                timespan: t.TypeC<{
                    gte: t.StringC;
                    lt: t.StringC;
                }>;
            }>;
            observer: t.PartialC<{
                hostname: t.StringC;
                ip: t.ArrayC<t.StringC>;
                mac: t.ArrayC<t.StringC>;
                name: t.UnionC<[t.StringC, t.UndefinedC]>;
                geo: t.PartialC<{
                    name: t.StringC;
                    continent_name: t.StringC;
                    city_name: t.StringC;
                    country_iso_code: t.StringC;
                    location: t.UnionC<[t.StringC, t.PartialC<{
                        lat: t.NumberC;
                        lon: t.NumberC;
                    }>, t.PartialC<{
                        lat: t.StringC;
                        lon: t.StringC;
                    }>]>;
                }>;
            }>;
            synthetics: t.PartialC<{
                index: t.NumberC;
                journey: t.TypeC<{
                    id: t.StringC;
                    name: t.StringC;
                }>;
                error: t.PartialC<{
                    message: t.StringC;
                    name: t.StringC;
                    stack: t.StringC;
                }>;
                package_version: t.StringC;
                step: t.TypeC<{
                    status: t.StringC;
                    index: t.NumberC;
                    name: t.StringC;
                    duration: t.TypeC<{
                        us: t.NumberC;
                    }>;
                }>;
                type: t.StringC;
                blob: t.StringC;
                blob_mime: t.StringC;
                payload: t.PartialC<{
                    duration: t.NumberC;
                    index: t.NumberC;
                    is_navigation_request: t.BooleanC;
                    message: t.StringC;
                    method: t.StringC;
                    name: t.StringC;
                    params: t.PartialC<{
                        homepage: t.StringC;
                    }>;
                    source: t.StringC;
                    start: t.NumberC;
                    status: t.StringC;
                    ts: t.NumberC;
                    type: t.StringC;
                    url: t.StringC;
                    end: t.NumberC;
                    text: t.StringC;
                }>;
                isFullScreenshot: t.BooleanC;
                isScreenshotRef: t.BooleanC;
            }>;
            error: t.TypeC<{
                message: t.StringC;
            }>;
        }>, t.TypeC<{
            _id: t.StringC;
            '@timestamp': t.StringC;
            monitor: t.TypeC<{
                id: t.StringC;
                check_group: t.StringC;
            }>;
            synthetics: t.TypeC<{
                type: t.StringC;
            }>;
        }>]>;
    }>, t.PartialC<{
        next: t.TypeC<{
            timestamp: t.StringC;
            checkGroup: t.StringC;
        }>;
        previous: t.TypeC<{
            timestamp: t.StringC;
            checkGroup: t.StringC;
        }>;
        summary: t.TypeC<{
            state: t.TypeC<{
                duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                checks: t.NumberC;
                ends: t.UnionC<[t.TypeC<{
                    duration_ms: t.UnionC<[t.StringC, t.NumberC]>;
                    checks: t.NumberC;
                    ends: t.UnionC<[t.StringC, t.NullC]>;
                    started_at: t.StringC;
                    id: t.StringC;
                    up: t.NumberC;
                    down: t.NumberC;
                    status: t.StringC;
                }>, t.NullC]>;
                started_at: t.StringC;
                id: t.StringC;
                up: t.NumberC;
                down: t.NumberC;
                status: t.StringC;
            }>;
        }>;
    }>]>, t.NullC]>;
}>]>;
export type SyntheticsJourneyApiResponse = t.TypeOf<typeof SyntheticsJourneyApiResponseType>;
