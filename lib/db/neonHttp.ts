interface NeonHttpQueryResponse<T = Record<string, unknown>> {
  rows?: T[];
  result?: {
    rows?: T[];
  };
}

interface NeonHttpConfig {
  endpoint: string;
  headers: Record<string, string>;
  extraBody?: Record<string, unknown>;
}

function explicitEndpoint() {
  return process.env.NEON_SQL_ENDPOINT;
}

function explicitApiKey() {
  return process.env.NEON_SQL_API_KEY;
}

function databaseUrl() {
  return process.env.DATABASE_URL;
}

function buildConfigFromDatabaseUrl(url: string): NeonHttpConfig | null {
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.includes("neon.tech")) {
      return null;
    }

    const endpoint = `https://${parsed.hostname}/sql`;
    return {
      endpoint,
      headers: {
        "content-type": "application/json",
      },
      extraBody: {
        connectionString: url,
      },
    };
  } catch {
    return null;
  }
}

function neonHttpConfig(): NeonHttpConfig | null {
  const endpoint = explicitEndpoint();
  const apiKey = explicitApiKey();

  if (endpoint && apiKey) {
    return {
      endpoint,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
    };
  }

  const dbUrl = databaseUrl();
  if (dbUrl) {
    return buildConfigFromDatabaseUrl(dbUrl);
  }

  return null;
}

export function isNeonHttpConfigured(): boolean {
  return Boolean(neonHttpConfig());
}

export async function neonHttpQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const config = neonHttpConfig();

  if (!config) {
    throw new Error(
      "Neon is not configured. Provide NEON_SQL_ENDPOINT + NEON_SQL_API_KEY or a Neon DATABASE_URL.",
    );
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: config.headers,
    body: JSON.stringify({ query, params, ...(config.extraBody ?? {}) }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Neon SQL query failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as NeonHttpQueryResponse<T>;
  return payload.rows ?? payload.result?.rows ?? [];
}
