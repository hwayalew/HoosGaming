import {
  SNOWFLAKE_DATABASE,
  SNOWFLAKE_SCHEMA,
  SNOWFLAKE_WAREHOUSE,
} from "@/lib/app-config";

const SNOWFLAKE_ACCOUNT = process.env.SNOWFLAKE_ACCOUNT?.trim() ?? "";
const SNOWFLAKE_USER = process.env.SNOWFLAKE_USER?.trim() ?? "";
const SNOWFLAKE_PASSWORD = process.env.SNOWFLAKE_PASSWORD?.trim() ?? "";

type SnowflakeModule = typeof import("snowflake-sdk");
type SnowflakeConnection = import("snowflake-sdk").Connection;

async function loadSnowflake(): Promise<SnowflakeModule> {
  const snowflake = await import("snowflake-sdk");
  snowflake.configure({ logLevel: "OFF" });
  return snowflake;
}

async function connect(): Promise<SnowflakeConnection> {
  if (!SNOWFLAKE_ACCOUNT || !SNOWFLAKE_USER || !SNOWFLAKE_PASSWORD) {
    throw new Error("Snowflake credentials are not configured");
  }

  const snowflake = await loadSnowflake();
  const connection = snowflake.createConnection({
    account: SNOWFLAKE_ACCOUNT,
    username: SNOWFLAKE_USER,
    password: SNOWFLAKE_PASSWORD,
    warehouse: SNOWFLAKE_WAREHOUSE,
    database: SNOWFLAKE_DATABASE,
    schema: SNOWFLAKE_SCHEMA,
  });

  await new Promise<void>((resolve, reject) => {
    connection.connect((err) => {
      if (err) reject(err);
      else resolve();
    });
  });

  return connection;
}

function getColumnNames(statement: { getColumns?: () => Array<{ getName?: () => string; name?: string }> }): string[] {
  const cols = statement.getColumns?.() ?? [];
  return cols.map((col: { getName?: () => string; name?: string }) =>
    String(col.getName?.() ?? col.name ?? ""),
  );
}

function normalizeRows(rows: unknown[] | undefined, columns: string[]): unknown[][] {
  if (!rows?.length) return [];

  return rows.map((row) => {
    if (Array.isArray(row)) return row;
    if (row && typeof row === "object") {
      return columns.map((col) => (row as Record<string, unknown>)[col]);
    }
    return [row];
  });
}

export async function executeSQL(sql: string): Promise<{ rows: unknown[][]; columns: string[] }> {
  const connection = await connect();

  try {
    return await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: sql,
        complete: (err, statement, rows) => {
          if (err) {
            reject(err);
            return;
          }

          const columns = statement ? getColumnNames(statement as { getColumns?: () => Array<{ getName?: () => string; name?: string }> }) : [];
          resolve({ rows: normalizeRows(rows, columns), columns });
        },
      });
    });
  } finally {
    await new Promise<void>((resolve) => {
      connection.destroy(() => resolve());
    });
  }
}

export { SNOWFLAKE_ACCOUNT };
