const JW_GRAPHQL = 'https://apis.justwatch.com/graphql';

export interface JWDirectOffer {
  providerName: string;
  monetizationType: string;
  directUrl: string;
  presentationType?: string; // "HD", "4K" (UHD)
}

interface JWSearchEdge {
  node: {
    id: string;
    objectType: string;
    content: {
      externalIds: {
        imdbId: string | null;
        tmdbId: string | null;
      };
    };
  };
}

interface JWRawOffer {
  monetizationType: string;
  standardWebURL: string;
  presentationType: string;
  package: { clearName: string };
}

interface JWOfferNode {
  offers?: JWRawOffer[];
}

async function findJWNodeId(
  tmdbId: number,
  type: 'movie' | 'series',
  country: string,
  title: string,
): Promise<string | null> {
  const objectType = type === 'series' ? 'SHOW' : 'MOVIE';
  const countryUpper = country.toUpperCase();

  const searchQuery = `
    query SearchByTitle($query: String!, $country: Country!, $first: Int!) {
      popularTitles(country: $country, first: $first, filter: { searchQuery: $query }) {
        edges {
          node {
            id
            objectType
            content(country: $country, language: "en") {
              externalIds { imdbId tmdbId }
            }
          }
        }
      }
    }
  `;

  const res = await fetch(JW_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'SearchByTitle',
      query: searchQuery,
      variables: { query: title, country: countryUpper, first: 10 },
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) return null;

  const json = await res.json() as { data?: { popularTitles?: { edges: JWSearchEdge[] } } };
  const edges = json.data?.popularTitles?.edges ?? [];

  const match = edges.find(
    (e) =>
      e.node.objectType === objectType &&
      e.node.content?.externalIds?.tmdbId === String(tmdbId)
  );

  return match?.node.id ?? null;
}

// Fix provider URLs to use the canonical domain and remove tracking params
function fixProviderUrl(url: string): string {
  try {
    const u = new URL(url);

    // Movistar+: wl.movistarplus.es/ficha/?id=XXX → ver.movistarplus.es/ficha/?id=XXX
    if (u.hostname === 'wl.movistarplus.es') {
      const id = u.searchParams.get('id');
      if (id) return `https://ver.movistarplus.es/ficha/?id=${id}`;
    }

    return url;
  } catch {
    return url;
  }
}

async function fetchOffersForNode(
  nodeId: string,
  type: 'movie' | 'series',
  country: string,
): Promise<JWDirectOffer[]> {
  const countryUpper = country.toUpperCase();
  const fragment = type === 'series'
    ? '... on Show { offers(country: $country, platform: $platform) { monetizationType presentationType standardWebURL package { clearName } } }'
    : '... on Movie { offers(country: $country, platform: $platform) { monetizationType presentationType standardWebURL package { clearName } } }';

  const query = `
    query GetOffers($nodeId: ID!, $country: Country!, $platform: Platform!) {
      node(id: $nodeId) {
        ${fragment}
      }
    }
  `;

  const res = await fetch(JW_GRAPHQL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operationName: 'GetOffers',
      query,
      variables: { nodeId, country: countryUpper, platform: 'WEB' },
    }),
    signal: AbortSignal.timeout(6000),
  });

  if (!res.ok) return [];

  const json = await res.json() as { data?: { node?: JWOfferNode } };
  const offers = json.data?.node?.offers ?? [];

  return offers
    .filter((o) => o.standardWebURL)
    .map((o) => ({
      providerName: o.package.clearName,
      monetizationType: o.monetizationType.toLowerCase(),
      directUrl: fixProviderUrl(o.standardWebURL),
      presentationType: o.presentationType ?? undefined,
    }));
}

export async function getJWDirectOffers(
  tmdbId: number,
  type: 'movie' | 'series',
  country: string,
  title: string,
): Promise<JWDirectOffer[]> {
  try {
    const nodeId = await findJWNodeId(tmdbId, type, country, title);
    if (!nodeId) return [];
    return await fetchOffersForNode(nodeId, type, country);
  } catch {
    return [];
  }
}
