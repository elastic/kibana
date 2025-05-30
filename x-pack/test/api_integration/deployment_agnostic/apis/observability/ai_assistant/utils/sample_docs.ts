/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const animalSampleDocs = [
  {
    id: 'animal_elephants_social_structure',
    title: 'Elephants and Their Social Structure',
    text: 'Elephants are highly social animals that live in matriarchal herds led by the oldest female. These animals communicate through low-frequency sounds, called infrasound, that travel long distances. They are known for their intelligence, strong memory, and deep emotional bonds with each other.',
  },
  {
    id: 'animal_cheetah_life_speed',
    title: 'The Life of a Cheetah',
    text: 'Cheetahs are the fastest land animals, capable of reaching speeds up to 60 miles per hour in short bursts. They rely on their speed to catch prey, such as gazelles. Unlike other big cats, cheetahs cannot roar, but they make distinctive chirping sounds, especially when communicating with their cubs.',
  },
  {
    id: 'animal_whale_migration_patterns',
    title: 'Whales and Their Migration Patterns',
    text: 'Whales are known for their long migration patterns, traveling thousands of miles between feeding and breeding grounds.',
  },
  {
    id: 'animal_giraffe_habitat_feeding',
    title: 'Giraffes: Habitat and Feeding Habits',
    text: 'Giraffes are the tallest land animals, with long necks that help them reach leaves high up in trees. They live in savannas and grasslands, where they feed on leaves, twigs, and fruits from acacia trees.',
  },
  {
    id: 'animal_penguin_antarctic_adaptations',
    title: 'Penguins and Their Antarctic Adaptations',
    text: 'Penguins are flightless birds that have adapted to life in the cold Antarctic environment. They have a thick layer of blubber to keep warm, and their wings have evolved into flippers for swimming in the icy waters.',
  },
];

export const technicalSampleDocs = [
  {
    id: 'technical_db_outage_slow_queries',
    title: 'Database Outage: Slow Query Execution',
    text: 'At 03:15 AM UTC, the production database experienced a significant outage, leading to slow query execution and increased response times across multiple services. A surge in database load was detected, with 90% of queries exceeding 2 seconds. A detailed log analysis pointed to locking issues within the transaction queue and inefficient index usage.',
  },
  {
    id: 'technical_api_gateway_timeouts',
    title: 'Service Timeout: API Gateway Bottleneck',
    text: 'At 10:45 AM UTC, the API Gateway encountered a timeout issue, causing a 500 error for all incoming requests. Detailed traces indicated a significant bottleneck at the gateway level, where requests stalled while waiting for upstream service responses. The upstream service was overwhelmed due to a sudden spike in inbound traffic and failed to release resources promptly.',
  },
  {
    id: 'technical_cache_misses_thirdparty_api',
    title: 'Cache Misses and Increased Latency: Third-Party API Failure',
    text: 'At 04:30 PM UTC, a dramatic increase in cache misses and latency was observed. The failure of a third-party API prevented critical data from being cached, leading to unnecessary re-fetching of resources from external sources. This caused significant delays in response times, with up to 10-second delays in some key services.',
  },
];
