interface NeonHttpQueryResponse<T = Record<string, unknown>> {
  rows?: T[];
  result?: {
    rows?: T[];
  };
}

function endpoint() {
  return process.env.NEON_SQL_ENDPOINT;
}

function apiKey() {
  return process.env.NEON_SQL_API_KEY;
}

export function isNeonHttpConfigured(): boolean {
  return Boolean(endpoint() && apiKey());
}

export async function neonHttpQuery<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T[]> {
  const sqlEndpoint = endpoint();
  const token = apiKey();

  if (!sqlEndpoint || !token) {
    throw new Error("Neon SQL HTTP is not configured");
  }

  const response = await fetch(sqlEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, params }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Neon SQL query failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as NeonHttpQueryResponse<T>;
  return payload.rows ?? payload.result?.rows ?? [];
}
