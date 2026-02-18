/**
 *
 * @param publishedAt - The date the tutorial was published
 * @returns true if the tutorial is new (less than 30 days old)
 * This means the "New" badges will largely be timely for serverless customers only.
 * https://docs.elastic.dev/kibana-dev-docs/serverless/release-overview#standard-release-cadence
 * publishedAt should be set to around the date the tutorial is expected to land in production.
 */
export const isNew = (publishedAt: Date) => {
  const thirtyDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);
  return publishedAt > thirtyDaysAgo;
};
