import { API_BASE_URL, SPRITE_BASE_URL } from "./config.js";

let pokemonSpeciesRequest;
let pokemonIndexRequest;
const pokemonVariantRequests = new Map();

export function getPokemonSpecies() {
  if (!pokemonSpeciesRequest) {
    pokemonSpeciesRequest = fetch(`${API_BASE_URL}/pokemon-species?limit=2000`)
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the Pokémon index.");
        return response.json();
      })
      .then((data) => data.results)
      .catch((error) => {
        pokemonSpeciesRequest = null;
        throw error;
      });
  }

  return pokemonSpeciesRequest;
}

export function getPokemonVariants(form) {
  if (pokemonVariantRequests.has(form)) return pokemonVariantRequests.get(form);

  const request = (async () => {
    if (!pokemonIndexRequest) {
      pokemonIndexRequest = fetch(`${API_BASE_URL}/pokemon?limit=2000`)
        .then((response) => {
          if (!response.ok) throw new Error("Could not load Pokémon forms.");
          return response.json();
        })
        .then((data) => data.results)
        .catch((error) => {
          pokemonIndexRequest = null;
          throw error;
        });
    }

    const pokemonIndex = await pokemonIndexRequest;
    const variants = pokemonIndex.filter(({ name }) => {
      const isMega = /-mega(?:-[xy])?$/i.test(name);
      const isGigantamax = /-(?:gmax|gigantamax)$/i.test(name);
      return form === "mega" ? isMega : isGigantamax;
    });

    const details = await Promise.all(variants.map(async (variant) => {
      try {
        const response = await fetch(variant.url);
        if (!response.ok) return null;
        const pokemon = await response.json();
        return {
          id: pokemon.id,
          name: pokemon.name,
          url: variant.url,
          speciesName: pokemon.species.name,
          nationalDexId: getIdFromUrl(pokemon.species.url),
          variantKind: /-mega(?:-[xy])?$/i.test(pokemon.name) ? "mega" : "gigantamax",
        };
      } catch {
        return null;
      }
    }));

    return details.filter(Boolean);
  })().catch((error) => {
    pokemonVariantRequests.delete(form);
    throw error;
  });

  pokemonVariantRequests.set(form, request);
  return request;
}

export function getIdFromUrl(url) {
  // url looks like "https://pokeapi.co/api/v2/pokemon/25/"
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getSpriteUrl(id) {
  return `${SPRITE_BASE_URL}/${id}.png`;
}

export function getArtworkUrl(id) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

const FAVORITES_KEY = "pokedex-mini-favorites";

export function readFavorites() {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function writeFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {}
}
