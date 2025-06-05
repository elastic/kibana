import { bulkUpdatePrompts } from "@kbn/elastic-assistant";
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import type { HttpSetup } from '@kbn/core-http-browser';
import { BASE_SECURITY_QUICK_PROMPTS } from "../../assets/quick_prompts";

export const createBasePrompts = async (notifications: NotificationsStart, http: HttpSetup) => {
  const promptsToCreate = [...BASE_SECURITY_QUICK_PROMPTS];

  // post bulk create
  const bulkResult = await bulkUpdatePrompts(
    http,
    {
      create: promptsToCreate,
    },
    notifications.toasts
  );
  if (bulkResult && bulkResult.success) {
    return bulkResult.attributes.results.created;
  }
};