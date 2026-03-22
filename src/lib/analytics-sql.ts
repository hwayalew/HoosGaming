import { SNOWFLAKE_DATABASE, SNOWFLAKE_SCHEMA } from "@/lib/app-config";

/**
 * Fully-qualified Snowflake namespace for analytics tables (game_generations, play_sessions, modifications).
 * Matches credentials in lib/snowflake.ts (database + schema from env / defaults).
 */
export function analyticsSchemaPrefix(): string {
  return `${SNOWFLAKE_DATABASE}.${SNOWFLAKE_SCHEMA}`;
}
