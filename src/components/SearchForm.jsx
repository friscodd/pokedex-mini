import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getIdFromUrl, getPokemonSpecies, getSpriteUrl } from "../utils.js";

function SearchForm() {
  const [query, setQuery] = useState("");
  const [error, setError] = useState(null);
  const [pokemonSpecies, setPokemonSpecies] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const navigate = useNavigate();

  useEffect(() => {
    let isCurrent = true;
    getPokemonSpecies()
      .then((species) => {
        if (isCurrent) setPokemonSpecies(species);
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, []);

  const prefix = query.trim().toLowerCase();
  const dexPrefix = prefix.replace(/^#/, "");
  const normalizedDexPrefix = dexPrefix.replace(/^0+(?=\d)/, "");
  const suggestions = /^[a-z-]+$/.test(prefix)
    ? pokemonSpecies.filter(({ name }) => name.startsWith(prefix))
    : /^\d+$/.test(dexPrefix)
      ? pokemonSpecies.filter((pokemon) => getIdFromUrl(pokemon.url).startsWith(normalizedDexPrefix))
      : [];

  const isSuggestionsOpen = isInputFocused && suggestions.length > 0;

  function openPokemon(name) {
    setQuery(name);
    setError(null);
    setIsInputFocused(false);
    navigate(`/pokemon/${name}`);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (suggestions.length > 0) {
      openPokemon(suggestions[Math.max(activeSuggestionIndex, 0)].name);
      return;
    }

    const name = query.trim().toLowerCase().replace(/^#0*/, "");

    if (name === "") {
      setError("Type a Pokémon name first.");
      return;
    }

    setError(null);
    navigate(`/pokemon/${name}`);
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Escape") {
      setIsInputFocused(false);
      setActiveSuggestionIndex(-1);
      return;
    }

    if (!suggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((current) => current <= 0 ? suggestions.length - 1 : current - 1);
    } else if (event.key === "Enter" && activeSuggestionIndex >= 0) {
      event.preventDefault();
      openPokemon(suggestions[activeSuggestionIndex].name);
    }
  }

  return (
    <div className="search">
      <div className="search-console-head">
        <div className="search-console-mark" aria-hidden="true"><span /></div>
        <div className="search-console-copy">
          <strong>SPECIMEN SEARCH</strong>
          <span>NAME OR NATIONAL DEX NUMBER</span>
        </div>
        <span className="search-ready"><i /> SCANNER READY</span>
      </div>
      <form onSubmit={handleSubmit} className="search-form">
        <label className="search-label" htmlFor="pokemon-search">LOOK UP A POKÉMON</label>
        <div className={`search-input-shell${isSuggestionsOpen ? " has-suggestions" : ""}`}>
          <span className="search-input-prefix" aria-hidden="true">DEX /</span>
          <input
            id="pokemon-search"
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isSuggestionsOpen}
            aria-controls="pokemon-search-suggestions"
            aria-activedescendant={activeSuggestionIndex >= 0 && isSuggestionsOpen
              ? `pokemon-suggestion-${suggestions[activeSuggestionIndex].name}`
              : undefined}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveSuggestionIndex(-1);
              setError(null);
            }}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Try Pikachu or #025"
            className="search-input"
          />
          {isSuggestionsOpen && (
            <div className="search-suggestions" id="pokemon-search-suggestions" role="listbox" aria-label="Matching Pokémon">
              <div className="suggestions-heading"><span>SPECIES MATCH</span><span>{suggestions.length} FOUND</span></div>
              {suggestions.map((pokemon, index) => {
                const id = getIdFromUrl(pokemon.url);
                return (
                  <button
                    id={`pokemon-suggestion-${pokemon.name}`}
                    key={pokemon.name}
                    className={`search-suggestion${index === activeSuggestionIndex ? " is-active" : ""}`}
                    style={{ animationDelay: `${Math.min(index, 10) * 24}ms` }}
                    type="button"
                    role="option"
                    aria-selected={index === activeSuggestionIndex}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openPokemon(pokemon.name)}
                  >
                    <img className="suggestion-sprite" src={getSpriteUrl(id)} alt="" width={32} height={32} loading="lazy" />
                    <span className="suggestion-name">{pokemon.name}</span>
                    <span className="suggestion-number">NO. {id.padStart(3, "0")}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <button type="submit" className="search-button">
          Search <span className="search-icon" aria-hidden="true"><span /></span>
        </button>
      </form>

      {error && <p className="status status-error">{error}</p>}
    </div>
  );
}

export default SearchForm;
