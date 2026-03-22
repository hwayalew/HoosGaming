const SNOWFLAKE_ACCOUNT   = process.env.SNOWFLAKE_ACCOUNT ?? "";
const SNOWFLAKE_USER      = process.env.SNOWFLAKE_USER ?? "";
const SNOWFLAKE_PASSWORD  = process.env.SNOWFLAKE_PASSWORD ?? "";
const SNOWFLAKE_DATABASE  = process.env.SNOWFLAKE_DATABASE ?? "HOOS_GAMING";
const SNOWFLAKE_SCHEMA    = process.env.SNOWFLAKE_SCHEMA ?? "ANALYTICS";
const SNOWFLAKE_WAREHOUSE = process.env.SNOWFLAKE_WAREHOUSE ?? "COMPUTE_WH";

function getBaseUrl(): string {
  if (!SNOWFLAKE_ACCOUNT) return "";
  const account = SNOWFLAKE_ACCOUNT.replace(/\.[a-z-]+$/, "").toLowerCase();
  return `https://${SNOWFLAKE_ACCOUNT}.snowflakecomputing.com`;
}

async function getToken(): Promise<string> {
  const base = getBaseUrl();
  if (!base) throw new Error("SNOWFLAKE_ACCOUNT not configured");

  const creds = Buffer.from(`${SNOWFLAKE_USER}:${SNOWFLAKE_PASSWORD}`).toString("base64");
  const res = await fetch(`${base}/session/v1/login-request?warehouse=${SNOWFLAKE_WAREHOUSE}&db=${SNOWFLAKE_DATABASE}&schema=${SNOWFLAKE_SCHEMA}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${creds}`,
      "Accept": "application/json",
    },
    body: JSON.stringify({
      data: {
        CLIENT_APP_ID: "HoosGaming",
        CLIENT_APP_VERSION: "1.0",
        SVN_REVISION: "1",
        ACCOUNT_NAME: SNOWFLAKE_ACCOUNT.split(".")[0].toUpperCase(),
        LOGIN_NAME: SNOWFLAKE_USER,
        PASSWORD: SNOWFLAKE_PASSWORD,
        SESSION_PARAMETERS: { VALIDATE_DEFAULT_PARAMETERS: true },
      }
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) throw new Error(`Snowflake auth ${res.status}: ${await res.text()}`);
  const json = await res.json() as { data?: { token?: string }; success?: boolean };
  if (!json.success || !json.data?.token) throw new Error("No Snowflake token");
  return json.data.token;
}

export async function executeSQL(sql: string): Promise<{ rows: unknown[][]; columns: string[] }> {
  const base = getBaseUrl();
  const token = await getToken();

  const res = await fetch(`${base}/api/v2/statements`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "X-Snowflake-Authorization-Token-Type": "SESSION_TOKEN",
      "Accept": "application/json",
    },
    body: JSON.stringify({
      statement: sql,
      timeout: 30,
      database: SNOWFLAKE_DATABASE,
      schema: SNOWFLAKE_SCHEMA,
      warehouse: SNOWFLAKE_WAREHOUSE,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`Snowflake query ${res.status}: ${await res.text()}`);
  const json = await res.json() as {
    data?: unknown[][];
    resultSetMetaData?: { rowType?: Array<{ name: string }> };
    message?: string;
  };
  const rows = json.data ?? [];
  const columns = json.resultSetMetaData?.rowType?.map(c => c.name) ?? [];
  return { rows, columns };
}

export { SNOWFLAKE_ACCOUNT };
