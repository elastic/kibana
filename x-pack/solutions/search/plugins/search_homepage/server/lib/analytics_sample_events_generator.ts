/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';

const HOUR_MS = 60 * 60 * 1000;
const WINDOW_HOURS = 7 * 24;

/** The events end at the time anchor and start this long before it. */
export const SAMPLE_EVENTS_WINDOW_MS = WINDOW_HOURS * HOUR_MS;
export const SAMPLE_EVENTS_DEFAULT_SEED = 20261119;

/** The purchase funnel, in the order a session moves through it. */
export const SAMPLE_EVENTS_FUNNEL = [
  'page_view',
  'product_view',
  'add_to_cart',
  'checkout_started',
  'purchase',
] as const;

export type SampleEventAction = (typeof SAMPLE_EVENTS_FUNNEL)[number] | 'signup';
type DeviceType = 'mobile' | 'desktop' | 'tablet';
type UserSegment = 'new' | 'returning';

export interface SampleEvent {
  '@timestamp': string;
  event: { action: SampleEventAction };
  user: { id: string; segment: UserSegment };
  session: { id: string };
  url: { path: string };
  http?: { request: { referrer: string } };
  campaign: { source: string; medium: string; name?: string };
  device: { type: DeviceType };
  user_agent: { name: string; os: { name: string } };
  geo: {
    country_iso_code: string;
    country_name: string;
    city_name: string;
    location: { lat: number; lon: number };
  };
  product?: { id: string; name: string; category: string; price: number };
  order?: { id: string; total: number; quantity: number; currency: string };
}

const keyword = { type: 'keyword' } as const;
const money = { type: 'scaled_float', scaling_factor: 100 } as const;

/** Strict, so an event field that is missing here fails the install instead of being guessed. */
export const SAMPLE_EVENTS_MAPPINGS: MappingTypeMapping = {
  dynamic: 'strict',
  properties: {
    '@timestamp': { type: 'date' },
    event: { properties: { action: keyword } },
    user: { properties: { id: keyword, segment: keyword } },
    session: { properties: { id: keyword } },
    url: { properties: { path: keyword } },
    http: { properties: { request: { properties: { referrer: keyword } } } },
    campaign: { properties: { source: keyword, medium: keyword, name: keyword } },
    device: { properties: { type: keyword } },
    user_agent: { properties: { name: keyword, os: { properties: { name: keyword } } } },
    geo: {
      properties: {
        country_iso_code: keyword,
        country_name: keyword,
        city_name: keyword,
        location: { type: 'geo_point' },
      },
    },
    product: { properties: { id: keyword, name: keyword, category: keyword, price: money } },
    order: {
      properties: { id: keyword, total: money, quantity: { type: 'integer' }, currency: keyword },
    },
  },
};

interface Weighted {
  weight: number;
}

interface Place extends Weighted {
  isoCode: string;
  country: string;
  city: string;
  lat: number;
  lon: number;
  mobileShare: number;
  androidShare: number;
  /** How likely a checkout in this market ends in a purchase, relative to the average. */
  purchaseFactor: number;
}

const place = (
  isoCode: string,
  country: string,
  city: string,
  lat: number,
  lon: number,
  weight: number,
  mobileShare: number,
  androidShare: number,
  purchaseFactor: number
): Place => ({
  isoCode,
  country,
  city,
  lat,
  lon,
  weight,
  mobileShare,
  androidShare,
  purchaseFactor,
});

const PLACES: readonly Place[] = [
  place('US', 'United States', 'New York', 40.71, -74.01, 14, 0.5, 0.4, 1.1),
  place('US', 'United States', 'Los Angeles', 34.05, -118.24, 10, 0.5, 0.4, 1.1),
  place('US', 'United States', 'Chicago', 41.88, -87.63, 8, 0.5, 0.4, 1.1),
  place('GB', 'United Kingdom', 'London', 51.51, -0.13, 12, 0.5, 0.45, 1.05),
  place('DE', 'Germany', 'Berlin', 52.52, 13.4, 10, 0.42, 0.6, 1.15),
  place('IN', 'India', 'Bengaluru', 12.97, 77.59, 10, 0.78, 0.85, 0.6),
  place('BR', 'Brazil', 'São Paulo', -23.55, -46.63, 7, 0.72, 0.8, 0.7),
  place('FR', 'France', 'Paris', 48.86, 2.35, 6, 0.5, 0.5, 1),
  place('CA', 'Canada', 'Toronto', 43.65, -79.38, 5, 0.48, 0.4, 1.05),
  place('AU', 'Australia', 'Sydney', -33.87, 151.21, 4, 0.5, 0.4, 1.05),
  place('JP', 'Japan', 'Tokyo', 35.68, 139.69, 4, 0.6, 0.3, 0.95),
  place('MX', 'Mexico', 'Mexico City', 19.43, -99.13, 4, 0.7, 0.75, 0.7),
  place('NL', 'Netherlands', 'Amsterdam', 52.37, 4.9, 3, 0.42, 0.5, 1.1),
  place('ES', 'Spain', 'Madrid', 40.42, -3.7, 3, 0.55, 0.6, 0.9),
];

const TABLET_SHARE = 0.07;

/** How likely a cart on this device reaches checkout and a checkout reaches purchase. */
const DEVICE_CHECKOUT_FACTOR: Record<DeviceType, number> = {
  desktop: 1.12,
  tablet: 1,
  mobile: 0.85,
};

interface Named extends Weighted {
  name: string;
}

const DESKTOP_OS: readonly Named[] = [
  { name: 'Windows', weight: 58 },
  { name: 'macOS', weight: 34 },
  { name: 'Linux', weight: 8 },
];

const BROWSERS: Record<string, readonly Named[]> = {
  iOS: [
    { name: 'Safari', weight: 75 },
    { name: 'Chrome', weight: 25 },
  ],
  Android: [
    { name: 'Chrome', weight: 80 },
    { name: 'Samsung Internet', weight: 20 },
  ],
  Windows: [
    { name: 'Chrome', weight: 62 },
    { name: 'Edge', weight: 28 },
    { name: 'Firefox', weight: 10 },
  ],
  macOS: [
    { name: 'Safari', weight: 50 },
    { name: 'Chrome', weight: 42 },
    { name: 'Firefox', weight: 8 },
  ],
  Linux: [
    { name: 'Firefox', weight: 50 },
    { name: 'Chrome', weight: 50 },
  ],
};

interface Channel {
  source: string;
  medium: string;
  campaign?: string;
  referrer?: string;
  landingPath: string;
  /** Share of sessions from people who have never visited before, and of later visits. */
  firstVisitWeight: number;
  returnVisitWeight: number;
  /** How much the channel's visitors look at products and fill carts, relative to the average. */
  viewFactor: number;
  cartFactor: number;
}

const CHANNELS: readonly Channel[] = [
  {
    source: 'direct',
    medium: 'none',
    landingPath: '/',
    firstVisitWeight: 20,
    returnVisitWeight: 42,
    viewFactor: 1,
    cartFactor: 1,
  },
  {
    source: 'google',
    medium: 'organic',
    referrer: 'https://www.google.com/',
    landingPath: '/',
    firstVisitWeight: 22,
    returnVisitWeight: 18,
    viewFactor: 1,
    cartFactor: 0.9,
  },
  {
    source: 'google',
    medium: 'cpc',
    campaign: 'brand_search',
    referrer: 'https://www.google.com/',
    landingPath: '/',
    firstVisitWeight: 12,
    returnVisitWeight: 8,
    viewFactor: 1.15,
    cartFactor: 1.3,
  },
  {
    source: 'newsletter',
    medium: 'email',
    campaign: 'spring_sale_email',
    landingPath: '/sale/spring',
    firstVisitWeight: 9,
    returnVisitWeight: 16,
    viewFactor: 1.25,
    cartFactor: 1.6,
  },
  {
    source: 'instagram',
    medium: 'paid_social',
    campaign: 'summer_launch_social',
    referrer: 'https://l.instagram.com/',
    landingPath: '/launch/summer',
    firstVisitWeight: 19,
    returnVisitWeight: 3,
    viewFactor: 0.8,
    cartFactor: 0.5,
  },
  {
    source: 'tiktok',
    medium: 'paid_social',
    campaign: 'creator_collab',
    referrer: 'https://www.tiktok.com/',
    landingPath: '/launch/summer',
    firstVisitWeight: 13,
    returnVisitWeight: 1,
    viewFactor: 0.75,
    cartFactor: 0.4,
  },
  {
    source: 'partner',
    medium: 'affiliate',
    campaign: 'partner_referral',
    referrer: 'https://deals.example.com/',
    landingPath: '/',
    firstVisitWeight: 7,
    returnVisitWeight: 4,
    viewFactor: 1.1,
    cartFactor: 1.2,
  },
  {
    source: 'display_network',
    medium: 'display',
    campaign: 'cart_reminder_retargeting',
    landingPath: '/cart',
    firstVisitWeight: 0,
    returnVisitWeight: 8,
    viewFactor: 1.1,
    cartFactor: 1.15,
  },
];

interface PathChoice extends Weighted {
  path: string;
}

const BROWSE_PATHS: readonly PathChoice[] = [
  { path: '/', weight: 20 },
  { path: '/category/audio', weight: 18 },
  { path: '/category/wearables', weight: 12 },
  { path: '/category/home', weight: 10 },
  { path: '/category/accessories', weight: 14 },
  { path: '/search', weight: 16 },
  { path: '/blog/buying-guide', weight: 6 },
  { path: '/help/shipping', weight: 4 },
];

interface Product extends Weighted {
  id: string;
  name: string;
  category: string;
  price: number;
  path: string;
}

const product = (
  id: string,
  name: string,
  category: string,
  price: number,
  weight: number
): Product => ({
  id,
  name,
  category,
  price,
  weight,
  path: `/products/${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
});

const PRODUCTS: readonly Product[] = [
  product('p-101', 'Aurora Wireless Headphones', 'Audio', 149.99, 10),
  product('p-102', 'Pulse Earbuds', 'Audio', 79.99, 14),
  product('p-103', 'Echo Mini Speaker', 'Audio', 49.99, 10),
  product('p-201', 'Stride Fitness Band', 'Wearables', 59.99, 10),
  product('p-202', 'Orbit Smartwatch', 'Wearables', 249.99, 7),
  product('p-301', 'Lumen Smart Lamp', 'Home', 39.99, 8),
  product('p-302', 'Breeze Air Purifier', 'Home', 189.99, 4),
  product('p-303', 'Brew Smart Kettle', 'Home', 69.99, 6),
  product('p-401', 'Volt Power Bank', 'Accessories', 29.99, 12),
  product('p-402', 'Link USB-C Cable', 'Accessories', 12.99, 12),
  product('p-403', 'Shell Phone Case', 'Accessories', 19.99, 11),
  product('p-404', 'Dock Charging Stand', 'Accessories', 34.99, 8),
];

const USER_COUNT = 1400;
/** People who already were customers before the window; none of their sessions is a first visit. */
const EXISTING_USER_SHARE = 0.4;
const SESSION_COUNTS_NEW_USER: readonly number[] = [45, 25, 15, 9, 6];
const SESSION_COUNTS_EXISTING_USER: readonly number[] = [40, 25, 15, 10, 6, 4];
const EXTRA_PAGE_VIEWS: readonly number[] = [45, 35, 20];
const PRODUCT_VIEWS: readonly number[] = [55, 30, 15];
const QUANTITIES: readonly number[] = [70, 22, 8];

const SIGNUP_RATE = 0.2;
const PRODUCT_VIEW_RATE = 0.62;
const ADD_TO_CART_RATE = 0.3;
const CHECKOUT_RATE = 0.6;
const PURCHASE_RATE = 0.6;
const RETURNING_VIEW_FACTOR = 1.08;
const RETURNING_CART_FACTOR = 1.15;
const MAX_RATE = 0.95;

const MIN_STEP_GAP_MS = 4_000;
const MAX_STEP_GAP_MS = 90_000;

const PEAK_HOUR_UTC = 17;
/** Sunday first, as `Date.getUTCDay` counts. */
const WEEKDAY_FACTORS: readonly number[] = [0.86, 1, 1.05, 1.08, 1.05, 0.97, 0.78];
const GROWTH_OVER_WINDOW = 0.12;

type Random = () => number;

const LEHMER_MODULUS = 2147483647;
const LEHMER_MULTIPLIER = 48271;

/** A Lehmer generator: the products stay below 2^53, so plain number arithmetic is exact. */
const createRandom = (seed: number): Random => {
  let state = (Math.abs(Math.trunc(seed)) % (LEHMER_MODULUS - 1)) + 1;
  const next = (): number => {
    state = (state * LEHMER_MULTIPLIER) % LEHMER_MODULUS;
    return (state - 1) / (LEHMER_MODULUS - 1);
  };
  // The first draws of nearby seeds are close together.
  for (let warmUp = 0; warmUp < 8; warmUp++) {
    next();
  }
  return next;
};

/** The index a draw lands on when each index is as likely as its weight is large. */
const pickIndex = (weights: readonly number[], draw: number): number => {
  const target = draw * weights.reduce((sum, weight) => sum + weight, 0);
  let cumulative = 0;
  for (let index = 0; index < weights.length; index++) {
    cumulative += weights[index];
    if (target < cumulative) {
      return index;
    }
  }
  return weights.length - 1;
};

const pick = <T extends Weighted>(items: readonly T[], random: Random): T =>
  items[
    pickIndex(
      items.map(({ weight }) => weight),
      random()
    )
  ];

const pickShare = <T>(share: number, hit: T, miss: T, random: Random): T =>
  random() < share ? hit : miss;

const pad = (value: number, length: number): string => String(value).padStart(length, '0');

/**
 * Relative traffic in each hour of the window: a daily wave peaking in the UTC evening, quieter
 * weekends and slow growth towards the anchor.
 */
const getHourlyTrafficWeights = (windowStart: number): number[] =>
  Array.from({ length: WINDOW_HOURS }, (_, hour) => {
    const midpoint = new Date(windowStart + (hour + 0.5) * HOUR_MS);
    const hourOfDay = midpoint.getUTCHours() + midpoint.getUTCMinutes() / 60;
    const wave = 0.5 + 0.5 * Math.cos((2 * Math.PI * (hourOfDay - PEAK_HOUR_UTC)) / 24);

    return (
      (0.3 + 0.7 * wave ** 1.3) *
      WEEKDAY_FACTORS[midpoint.getUTCDay()] *
      (1 + (GROWTH_OVER_WINDOW * hour) / (WINDOW_HOURS - 1))
    );
  });

/**
 * Maps a share of the window's traffic, from 0 to 1, to the hour of the window by which that share
 * has arrived, so evenly spread shares land where the traffic is.
 */
const createTrafficClock = (hourlyWeights: readonly number[]): ((share: number) => number) => {
  const total = hourlyWeights.reduce((sum, weight) => sum + weight, 0);

  return (share) => {
    let remaining = share * total;
    for (let hour = 0; hour < hourlyWeights.length; hour++) {
      if (remaining < hourlyWeights[hour]) {
        return hour + remaining / hourlyWeights[hour];
      }
      remaining -= hourlyWeights[hour];
    }
    return hourlyWeights.length;
  };
};

interface Visitor {
  userId: string;
  place: Place;
  deviceType: DeviceType;
  osName: string;
  browserName: string;
  isExisting: boolean;
}

const createVisitor = (userNumber: number, random: Random): Visitor => {
  const visitorPlace = pick(PLACES, random);
  const deviceDraw = random();
  const deviceType: DeviceType =
    deviceDraw < visitorPlace.mobileShare
      ? 'mobile'
      : deviceDraw < visitorPlace.mobileShare + TABLET_SHARE
      ? 'tablet'
      : 'desktop';
  const osName =
    deviceType === 'desktop'
      ? pick(DESKTOP_OS, random).name
      : pickShare(visitorPlace.androidShare, 'Android', 'iOS', random);

  return {
    userId: `u-${pad(userNumber, 5)}`,
    place: visitorPlace,
    deviceType,
    osName,
    browserName: pick(BROWSERS[osName], random).name,
    isExisting: random() < EXISTING_USER_SHARE,
  };
};

interface SessionStep {
  action: SampleEventAction;
  path: string;
  /** Time since the previous step of the session. */
  gapMs: number;
  product?: Product;
  quantity?: number;
}

interface SessionPlan {
  channel: Channel;
  steps: SessionStep[];
}

const capRate = (rate: number): number => Math.min(MAX_RATE, rate);

/** One visit: browsing, then as far down the purchase funnel as the visitor gets. */
const planSession = (visitor: Visitor, segment: UserSegment, random: Random): SessionPlan => {
  const isReturning = segment === 'returning';
  const channel =
    CHANNELS[
      pickIndex(
        CHANNELS.map(({ firstVisitWeight, returnVisitWeight }) =>
          isReturning ? returnVisitWeight : firstVisitWeight
        ),
        random()
      )
    ];
  const steps: SessionStep[] = [];
  const addStep = (action: SampleEventAction, path: string, item?: Product, quantity?: number) => {
    steps.push({
      action,
      path,
      gapMs:
        steps.length === 0
          ? 0
          : Math.round(MIN_STEP_GAP_MS + random() * (MAX_STEP_GAP_MS - MIN_STEP_GAP_MS)),
      product: item,
      quantity,
    });
  };

  addStep('page_view', channel.landingPath);
  const extraPageViews = pickIndex(EXTRA_PAGE_VIEWS, random());
  for (let view = 0; view < extraPageViews; view++) {
    addStep('page_view', pick(BROWSE_PATHS, random).path);
  }

  if (!isReturning && random() < SIGNUP_RATE) {
    addStep('signup', '/signup');
  }

  const checkoutFactor = DEVICE_CHECKOUT_FACTOR[visitor.deviceType];
  const viewRate =
    PRODUCT_VIEW_RATE * channel.viewFactor * (isReturning ? RETURNING_VIEW_FACTOR : 1);
  if (random() >= capRate(viewRate)) {
    return { channel, steps };
  }
  const productViews = 1 + pickIndex(PRODUCT_VIEWS, random());
  let viewed = pick(PRODUCTS, random);
  addStep('product_view', viewed.path, viewed);
  for (let view = 1; view < productViews; view++) {
    viewed = pick(PRODUCTS, random);
    addStep('product_view', viewed.path, viewed);
  }

  const cartRate =
    ADD_TO_CART_RATE * channel.cartFactor * (isReturning ? RETURNING_CART_FACTOR : 1);
  if (random() >= capRate(cartRate)) {
    return { channel, steps };
  }
  addStep('add_to_cart', viewed.path, viewed);

  if (random() >= capRate(CHECKOUT_RATE * checkoutFactor)) {
    return { channel, steps };
  }
  addStep('checkout_started', '/checkout', viewed);

  if (random() >= capRate(PURCHASE_RATE * checkoutFactor * visitor.place.purchaseFactor)) {
    return { channel, steps };
  }
  addStep('purchase', '/checkout/confirmation', viewed, 1 + pickIndex(QUANTITIES, random()));

  return { channel, steps };
};

const toEvents = (
  visitor: Visitor,
  segment: UserSegment,
  sessionNumber: number,
  { channel, steps }: SessionPlan,
  startTime: number
): Array<{ time: number; event: SampleEvent }> => {
  let time = startTime;

  return steps.map(({ action, path, gapMs, product: item, quantity }) => {
    time += gapMs;
    const event: SampleEvent = {
      '@timestamp': new Date(time).toISOString(),
      event: { action },
      user: { id: visitor.userId, segment },
      session: { id: `s-${pad(sessionNumber, 6)}` },
      url: { path },
      ...(channel.referrer === undefined
        ? {}
        : { http: { request: { referrer: channel.referrer } } }),
      campaign: {
        source: channel.source,
        medium: channel.medium,
        ...(channel.campaign === undefined ? {} : { name: channel.campaign }),
      },
      device: { type: visitor.deviceType },
      user_agent: { name: visitor.browserName, os: { name: visitor.osName } },
      geo: {
        country_iso_code: visitor.place.isoCode,
        country_name: visitor.place.country,
        city_name: visitor.place.city,
        location: { lat: visitor.place.lat, lon: visitor.place.lon },
      },
      ...(item === undefined
        ? {}
        : {
            product: {
              id: item.id,
              name: item.name,
              category: item.category,
              price: item.price,
            },
          }),
      ...(item === undefined || quantity === undefined
        ? {}
        : {
            order: {
              id: `o-${pad(sessionNumber, 6)}`,
              total: Math.round(item.price * quantity * 100) / 100,
              quantity,
              currency: 'USD',
            },
          }),
    };

    return { time, event };
  });
};

export interface GenerateSampleEventsParams {
  /** The time anchor in epoch milliseconds: the events cover the week that ends here. */
  now: number;
  seed?: number;
}

/**
 * A week of product events for an online shop, oldest first: visitors with sessions, a purchase
 * funnel with drop-off, people coming back on later days, and channels, devices and countries
 * that convert differently. The same seed gives the same visitors, sessions and number of events
 * whatever the anchor; the anchor only decides when the sessions happen.
 */
export const generateSampleEvents = ({
  now,
  seed = SAMPLE_EVENTS_DEFAULT_SEED,
}: GenerateSampleEventsParams): SampleEvent[] => {
  const random = createRandom(seed);
  const windowStart = now - SAMPLE_EVENTS_WINDOW_MS;
  const getHourAt = createTrafficClock(getHourlyTrafficWeights(windowStart));
  const timedEvents: Array<{ time: number; event: SampleEvent }> = [];
  let sessionNumber = 0;

  for (let userNumber = 1; userNumber <= USER_COUNT; userNumber++) {
    const visitor = createVisitor(userNumber, random);
    const sessionCount =
      1 +
      pickIndex(
        visitor.isExisting ? SESSION_COUNTS_EXISTING_USER : SESSION_COUNTS_NEW_USER,
        random()
      );
    const firstVisit = random();
    // Someone new comes back only after their first visit, and returns that would fall after the
    // anchor have not happened yet; existing customers visit at any time.
    const laterVisits = Array.from({ length: sessionCount - 1 }, () =>
      visitor.isExisting ? random() : firstVisit + random()
    ).filter((visit) => visit < 1);
    const startTimes = [firstVisit, ...laterVisits]
      .map((visit) => windowStart + Math.floor(getHourAt(visit) * HOUR_MS))
      .sort((a, b) => a - b);

    startTimes.forEach((startTime, visit) => {
      const segment: UserSegment = visitor.isExisting || visit > 0 ? 'returning' : 'new';
      const plan = planSession(visitor, segment, random);
      const duration = plan.steps.reduce((sum, { gapMs }) => sum + gapMs, 0);
      sessionNumber++;
      timedEvents.push(
        // A session drawn close to the anchor starts early enough to end by it.
        ...toEvents(visitor, segment, sessionNumber, plan, Math.min(startTime, now - duration))
      );
    });
  }

  return timedEvents.sort((a, b) => a.time - b.time).map(({ event }) => event);
};
