import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * Adapter config for running this Next app on Cloudflare Workers.
 *
 * Deliberately minimal: the site is static-leaning (one prerendered page plus
 * three small API routes), so none of the incremental-cache or tag-cache
 * backends are wired up. Adding one means provisioning KV or R2, which is a
 * separate decision from getting the site live.
 */
export default defineCloudflareConfig();
