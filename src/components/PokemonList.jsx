import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { getIdFromUrl, capitalize, getArtworkUrl, getPokemonSpecies, getPokemonVariants, readFavorites, writeFavorites } from "../utils.js";

const PAGE_SIZE = 24;
const TYPES = [
  "normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
  "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];
const FILTER_STATE_KEY = "pokedex-mini-catalogue-filters";

function readCatalogueFilters() {
  try {
    return JSON.parse(sessionStorage.getItem(FILTER_STATE_KEY) || "{}");
  } catch {
    return {};
  }
}

function PokemonList({ onCatalogueReady = () => {} }) {
  const [savedFilters] = useState(readCatalogueFilters);
  const [pokemons, setPokemons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTypes, setSelectedTypes] = useState(() => Array.isArray(savedFilters.selectedTypes) ? savedFilters.selectedTypes : []);
  const [typeNames, setTypeNames] = useState(null);
  const [typeError, setTypeError] = useState(null);
  const [isTypeLoading, setIsTypeLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState(() => savedFilters.selectedForm || "base");
  const [variantPokemons, setVariantPokemons] = useState([]);
  const [isVariantLoading, setIsVariantLoading] = useState(false);
  const [variantError, setVariantError] = useState(null);
  const [isFormMenuOpen, setIsFormMenuOpen] = useState(false);
  const [activeFormIndex, setActiveFormIndex] = useState(0);
  const [selectedRegion, setSelectedRegion] = useState(() => savedFilters.selectedRegion || "all");
  const [regions, setRegions] = useState([]);
  const [isRegionListLoading, setIsRegionListLoading] = useState(true);
  const [regionListError, setRegionListError] = useState(null);
  const [regionNames, setRegionNames] = useState(null);
  const [regionError, setRegionError] = useState(null);
  const [isRegionLoading, setIsRegionLoading] = useState(false);
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false);
  const [activeRegionIndex, setActiveRegionIndex] = useState(0);
  const [showFavorites, setShowFavorites] = useState(() => Boolean(savedFilters.showFavorites));
  const [favorites, setFavorites] = useState(readFavorites);
  const [visibleCount, setVisibleCount] = useState(() => Math.max(PAGE_SIZE, Number(savedFilters.visibleCount) || PAGE_SIZE));
  const [isTypeMenuOpen, setIsTypeMenuOpen] = useState(false);
  const [activeTypeIndex, setActiveTypeIndex] = useState(0);
  const typeTriggerRef = useRef(null);
  const typeOptionRefs = useRef([]);
  const regionTriggerRef = useRef(null);
  const regionOptionRefs = useRef([]);
  const formTriggerRef = useRef(null);
  const formOptionRefs = useRef([]);
  const typeOptions = ["all", ...TYPES];
  const regionOptions = ["all", ...regions.map(({ name }) => name)];
  const formOptions = ["base", "mega", "gigantamax"];
  const selectedTypeIndex = selectedTypes.length ? typeOptions.indexOf(selectedTypes[0]) : 0;
  const selectedRegionIndex = regionOptions.indexOf(selectedRegion);
  const selectedFormIndex = formOptions.indexOf(selectedForm);

  useEffect(() => {
    if (isTypeMenuOpen) typeOptionRefs.current[activeTypeIndex]?.focus();
  }, [isTypeMenuOpen, activeTypeIndex]);

  useEffect(() => {
    if (isRegionMenuOpen) regionOptionRefs.current[activeRegionIndex]?.focus();
  }, [isRegionMenuOpen, activeRegionIndex]);

  useEffect(() => {
    if (isFormMenuOpen) formOptionRefs.current[activeFormIndex]?.focus();
  }, [isFormMenuOpen, activeFormIndex]);

  useEffect(() => {
    async function loadPokemons() {
      setIsLoading(true);
      setError(null);

      try {
        setPokemons(await getPokemonSpecies());
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadPokemons();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadRegions() {
      try {
        const response = await fetch(`${API_BASE_URL}/region?limit=100`);
        if (!response.ok) throw new Error("Couldn't load the region list.");
        const data = await response.json();
        const supportedRegions = await Promise.all(data.results.map(async (region) => {
          try {
            const regionResponse = await fetch(region.url);
            if (!regionResponse.ok) return null;
            const regionData = await regionResponse.json();
            return regionData.main_generation?.url
              ? { ...region, generation: regionData.main_generation }
              : null;
          } catch {
            return null;
          }
        }));
        if (isCurrent) setRegions(supportedRegions.filter(Boolean));
      } catch (err) {
        if (isCurrent) setRegionListError(err.message);
      } finally {
        if (isCurrent) setIsRegionListLoading(false);
      }
    }

    loadRegions();
    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadRegion() {
      setRegionError(null);
      if (selectedRegion === "all") {
        setRegionNames(null);
        setIsRegionLoading(false);
        return;
      }

      const region = regions.find(({ name }) => name === selectedRegion);
      if (!region) return;

      setRegionNames(null);
      setIsRegionLoading(true);
      try {
        const response = await fetch(region.generation.url);
        if (!response.ok) throw new Error(`Couldn't load Pokémon introduced in ${selectedRegion}.`);
        const generation = await response.json();
        if (isCurrent) setRegionNames(new Set(generation.pokemon_species.map(({ name }) => name)));
      } catch (err) {
        if (isCurrent) setRegionError(err.message);
      } finally {
        if (isCurrent) setIsRegionLoading(false);
      }
    }

    loadRegion();
    return () => {
      isCurrent = false;
    };
  }, [selectedRegion, regions]);

  useEffect(() => {
    writeFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    let isCurrent = true;

    async function loadType() {
      setTypeError(null);

      if (selectedTypes.length === 0) {
        setTypeNames(null);
        setIsTypeLoading(false);
        return;
      }

      setIsTypeLoading(true);
      try {
        setTypeNames(null);
        const responses = await Promise.all(selectedTypes.map((type) => fetch(`${API_BASE_URL}/type/${type}`)));
        if (responses.some((response) => !response.ok)) throw new Error("Couldn't load these types. Try again.");
        const typeData = await Promise.all(responses.map((response) => response.json()));
        const [firstType, ...otherTypes] = typeData;
        const names = firstType.pokemon
          .map(({ pokemon }) => pokemon.name)
          .filter((name) => otherTypes.every((data) => data.pokemon.some(({ pokemon }) => pokemon.name === name)));
        if (isCurrent) setTypeNames(new Set(names));
      } catch (err) {
        if (isCurrent) setTypeError(err.message);
      } finally {
        if (isCurrent) setIsTypeLoading(false);
      }
    }

    loadType();
    return () => {
      isCurrent = false;
    };
  }, [selectedTypes]);

  useEffect(() => {
    let isCurrent = true;
    setVariantError(null);

    if (selectedForm === "base") {
      setVariantPokemons([]);
      setIsVariantLoading(false);
      return () => {
        isCurrent = false;
      };
    }

    setIsVariantLoading(true);
    getPokemonVariants(selectedForm)
      .then((variants) => {
        if (isCurrent) setVariantPokemons(variants);
      })
      .catch((err) => {
        if (isCurrent) setVariantError(err.message);
      })
      .finally(() => {
        if (isCurrent) setIsVariantLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedForm]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FILTER_STATE_KEY, JSON.stringify({
        selectedTypes,
        selectedRegion,
        selectedForm,
        showFavorites,
        visibleCount,
      }));
    } catch {}
  }, [selectedTypes, selectedRegion, selectedForm, showFavorites, visibleCount]);

  useEffect(() => {
    if (!isLoading && !isRegionListLoading && !isTypeLoading && !isRegionLoading && !isVariantLoading) {
      onCatalogueReady();
    }
  }, [isLoading, isRegionListLoading, isTypeLoading, isRegionLoading, isVariantLoading, onCatalogueReady]);

  function toggleFavorite(name) {
    setFavorites((current) => current.includes(name)
      ? current.filter((favorite) => favorite !== name)
      : [...current, name]);
  }

  function chooseType(type) {
    if (type === "all") {
      setSelectedTypes([]);
      setVisibleCount(PAGE_SIZE);
      setIsTypeMenuOpen(false);
      typeTriggerRef.current?.focus();
      return;
    }

    setSelectedTypes((current) => current.includes(type)
      ? current.filter((selected) => selected !== type)
      : [...current, type]);
    setVisibleCount(PAGE_SIZE);
  }

  function handleTypeTriggerKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveTypeIndex(selectedTypeIndex);
      setIsTypeMenuOpen(true);
    } else if (event.key === "Escape") {
      setIsTypeMenuOpen(false);
    }
  }

  function handleTypeOptionKeyDown(event, index) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      chooseType(typeOptions[index]);
      return;
    }

    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % typeOptions.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + typeOptions.length) % typeOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = typeOptions.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      setIsTypeMenuOpen(false);
      typeTriggerRef.current?.focus();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveTypeIndex(nextIndex);
    typeOptionRefs.current[nextIndex]?.focus();
  }

  function chooseRegion(region) {
    setSelectedRegion(region);
    setVisibleCount(PAGE_SIZE);
    setIsRegionMenuOpen(false);
    regionTriggerRef.current?.focus();
  }

  function handleRegionTriggerKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveRegionIndex(Math.max(selectedRegionIndex, 0));
      setIsRegionMenuOpen(true);
    } else if (event.key === "Escape") {
      setIsRegionMenuOpen(false);
    }
  }

  function handleRegionOptionKeyDown(event, index) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseRegion(regionOptions[index]);
      return;
    }

    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % regionOptions.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + regionOptions.length) % regionOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = regionOptions.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      setIsRegionMenuOpen(false);
      regionTriggerRef.current?.focus();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveRegionIndex(nextIndex);
    regionOptionRefs.current[nextIndex]?.focus();
  }

  function chooseForm(form) {
    setSelectedForm(form);
    setVisibleCount(PAGE_SIZE);
    setIsFormMenuOpen(false);
    formTriggerRef.current?.focus();
  }

  function handleFormTriggerKeyDown(event) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveFormIndex(selectedFormIndex);
      setIsFormMenuOpen(true);
    } else if (event.key === "Escape") {
      setIsFormMenuOpen(false);
    }
  }

  function handleFormOptionKeyDown(event, index) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseForm(formOptions[index]);
      return;
    }

    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % formOptions.length;
    else if (event.key === "ArrowUp") nextIndex = (index - 1 + formOptions.length) % formOptions.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = formOptions.length - 1;
    else if (event.key === "Escape") {
      event.preventDefault();
      setIsFormMenuOpen(false);
      formTriggerRef.current?.focus();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveFormIndex(nextIndex);
    formOptionRefs.current[nextIndex]?.focus();
  }

  const pokemonEntries = selectedForm === "base" ? pokemons : [...pokemons, ...variantPokemons];
  const filteredPokemons = pokemonEntries.filter((pokemon) => {
    const matchesForm = selectedForm === "base" ? !pokemon.variantKind : pokemon.variantKind === selectedForm;
    const matchesType = selectedTypes.length === 0 || typeNames?.has(pokemon.name);
    const matchesRegion = selectedRegion === "all" || regionNames?.has(pokemon.speciesName || pokemon.name);
    const matchesFavorites = !showFavorites || favorites.includes(pokemon.name);
    return matchesForm && matchesType && matchesRegion && matchesFavorites;
  });
  const visiblePokemons = filteredPokemons.slice(0, visibleCount);

  if (isLoading) {
    return <p className="status">Opening the field guide…</p>;
  }

  if (error) {
    return <p className="status status-error">Couldn't load the list: {error}</p>;
  }

  return (
    <section className="catalogue" aria-label="Pokémon catalogue">
      <div className="catalogue-toolbar">
        <div className="catalogue-heading">
          <p className="eyebrow">THE COLLECTION</p>
          <h2>Field specimens <span>{String(filteredPokemons.length).padStart(3, "0")}</span></h2>
        </div>
        <div className="catalogue-controls">
          <div className="region-filter">
            <span id="region-filter-label">REGION</span>
            <div className="region-select-shell">
              <button
                ref={regionTriggerRef}
                className="region-select-trigger"
                type="button"
                aria-labelledby="region-filter-label region-filter-value"
                aria-haspopup="listbox"
                aria-expanded={isRegionMenuOpen}
                aria-controls="pokemon-region-options"
                onClick={() => {
                  setActiveRegionIndex(Math.max(selectedRegionIndex, 0));
                  setIsRegionMenuOpen((open) => !open);
                }}
                onKeyDown={handleRegionTriggerKeyDown}
              >
                <span className="region-select-value" id="region-filter-value">
                  {selectedRegion === "all" ? "All regions" : capitalize(selectedRegion.replaceAll("-", " "))}
                </span>
                <span className="region-select-chevron" aria-hidden="true" />
              </button>
              {isRegionMenuOpen && (
                <div className="region-select-menu filter-dropdown-menu" id="pokemon-region-options" role="listbox" aria-labelledby="region-filter-label">
                  <span className="region-menu-heading">POKÉMON INTRODUCED BY REGION <span>{regions.length} AVAILABLE</span></span>
                  {regionOptions.map((region, index) => {
                    const isSelected = region === selectedRegion;
                    const label = region === "all" ? "All regions" : capitalize(region.replaceAll("-", " "));
                    return (
                      <div
                        key={region}
                        ref={(element) => { regionOptionRefs.current[index] = element; }}
                        className={`region-option${isSelected ? " is-selected" : ""}`}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={activeRegionIndex === index ? 0 : -1}
                        onFocus={() => setActiveRegionIndex(index)}
                        onClick={() => chooseRegion(region)}
                        onKeyDown={(event) => handleRegionOptionKeyDown(event, index)}
                      >
                        <span className="region-option-dot" aria-hidden="true" />
                        <span>{label}</span>
                        {isSelected && <span className="region-option-check" aria-hidden="true">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className={`type-filter type-filter-${selectedTypes[0] || "all"}`}>
            <span className="type-filter-label" id="type-filter-label">TYPE</span>
            <div className="type-select-shell">
              <button
                ref={typeTriggerRef}
                className="type-select-trigger"
                type="button"
                aria-labelledby="type-filter-label type-filter-value"
                aria-haspopup="listbox"
                aria-expanded={isTypeMenuOpen}
                aria-controls="pokemon-type-options"
                onClick={() => {
                  setActiveTypeIndex(selectedTypeIndex);
                  setIsTypeMenuOpen((open) => !open);
                }}
                onKeyDown={handleTypeTriggerKeyDown}
              >
                <span className="type-select-value" id="type-filter-value">
                  {selectedTypes.length === 0
                    ? "All types"
                    : selectedTypes.length === 1
                      ? capitalize(selectedTypes[0])
                      : `${selectedTypes.length} types selected`}
                </span>
                <span className="type-select-chevron" aria-hidden="true" />
              </button>
              {isTypeMenuOpen && (
                <div className="type-select-menu filter-dropdown-menu" id="pokemon-type-options" role="listbox" aria-labelledby="type-filter-label" aria-multiselectable="true">
                  <span className="type-menu-heading">CHOOSE SPECIMEN TYPES <span>{selectedTypes.length} SELECTED</span></span>
                  <span className="type-menu-hint">Pokémon must have every selected type.</span>
                  {typeOptions.map((type, index) => (
                    <div
                      key={type}
                      ref={(element) => { typeOptionRefs.current[index] = element; }}
                      className={`type-option${(type === "all" ? selectedTypes.length === 0 : selectedTypes.includes(type)) ? " is-selected" : ""}${type === "all" ? " type-option-all" : ` type-option-${type}`}`}
                      role="option"
                      aria-selected={type === "all" ? selectedTypes.length === 0 : selectedTypes.includes(type)}
                      tabIndex={activeTypeIndex === index ? 0 : -1}
                      onFocus={() => setActiveTypeIndex(index)}
                      onClick={() => chooseType(type)}
                      onKeyDown={(event) => handleTypeOptionKeyDown(event, index)}
                    >
                      <span className="type-option-dot" aria-hidden="true" />
                      <span>{type === "all" ? "All types" : capitalize(type)}</span>
                      {(type === "all" ? selectedTypes.length === 0 : selectedTypes.includes(type)) && <span className="type-option-check" aria-hidden="true">✓</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="form-filter">
            <span className="form-filter-label" id="form-filter-label">FORM</span>
            <div className="form-select-shell">
              <button
                ref={formTriggerRef}
                className="form-select-trigger"
                type="button"
                aria-labelledby="form-filter-label form-filter-value"
                aria-haspopup="listbox"
                aria-expanded={isFormMenuOpen}
                aria-controls="pokemon-form-options"
                onClick={() => {
                  setActiveFormIndex(selectedFormIndex);
                  setIsFormMenuOpen((open) => !open);
                }}
                onKeyDown={handleFormTriggerKeyDown}
              >
                <span className="form-select-value" id="form-filter-value">
                  {selectedForm === "base" ? "Base Pokémon" : selectedForm === "mega" ? "Mega Evolution" : "Gigantamax"}
                </span>
                <span className="form-select-chevron" aria-hidden="true" />
              </button>
              {isFormMenuOpen && (
                <div className="form-select-menu filter-dropdown-menu" id="pokemon-form-options" role="listbox" aria-labelledby="form-filter-label">
                  <span className="form-menu-heading">FORM DATABASE <span>LIVE INDEX</span></span>
                  {formOptions.map((form, index) => {
                    const isSelected = selectedForm === form;
                    const label = form === "base" ? "Base Pokémon" : form === "mega" ? "Mega Evolution" : "Gigantamax";
                    return (
                      <div
                        key={form}
                        ref={(element) => { formOptionRefs.current[index] = element; }}
                        className={`form-option${isSelected ? " is-selected" : ""}`}
                        role="option"
                        aria-selected={isSelected}
                        tabIndex={activeFormIndex === index ? 0 : -1}
                        onFocus={() => setActiveFormIndex(index)}
                        onClick={() => chooseForm(form)}
                        onKeyDown={(event) => handleFormOptionKeyDown(event, index)}
                      >
                        <span className="form-option-led" aria-hidden="true" />
                        <span>{label}</span>
                        {isSelected && <span className="form-option-check" aria-hidden="true">✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <button
            className={`favorites-toggle${showFavorites ? " is-active" : ""}`}
            type="button"
            aria-pressed={showFavorites}
            onClick={() => {
              setShowFavorites((showing) => !showing);
              setVisibleCount(PAGE_SIZE);
            }}
          >
            <span aria-hidden="true">♥</span> Saved <b>{favorites.length}</b>
          </button>
        </div>
      </div>

      {isTypeLoading && <p className="inline-status">Finding {selectedTypes.join(" and ")}-type specimens…</p>}
      {typeError && <p className="inline-status status-error">{typeError} Choose a type to try again.</p>}
      {isRegionLoading && <p className="inline-status">Finding Pokémon introduced in {selectedRegion}…</p>}
      {regionError && <p className="inline-status status-error">{regionError} Choose a region to try again.</p>}
      {regionListError && <p className="inline-status status-error">{regionListError}</p>}
      {isVariantLoading && <p className="inline-status form-loading">Scanning variant database…</p>}
      {variantError && <p className="inline-status status-error">{variantError} Choose a form to try again.</p>}
      {!isTypeLoading && !isRegionLoading && !isVariantLoading && filteredPokemons.length === 0 && (
        <div className="empty-state">
          <span aria-hidden="true">✳</span>
          <h3>No Pokémon match these filters.</h3>
          <p>Try another region, type combination, or saved-Pokémon filter.</p>
        </div>
      )}

      <ul className="pokemon-list">
      {visiblePokemons.map((pokemon) => {
        const spriteId = getIdFromUrl(pokemon.url);
        const id = pokemon.nationalDexId || spriteId;
        const isFavorite = favorites.includes(pokemon.name);
        const formClass = pokemon.variantKind ? "variant" : "";
        const formCaption = pokemon.variantKind === "mega"
          ? "MEGA EVOLUTION"
          : pokemon.variantKind === "gigantamax"
            ? "GIGANTAMAX"
            : selectedTypes.length === 0
              ? "NATIONAL DEX"
              : selectedTypes.map((type) => type.toUpperCase()).join(" · ");
        return (
          <li key={pokemon.name} className={`pokemon-list-item${selectedTypes.length === 0 ? "" : ` type-${selectedTypes[0]}`}${formClass ? ` type-${formClass}` : ""}`}>
            <Link to={`/pokemon/${pokemon.name}`} className="pokemon-link" aria-label={`View ${pokemon.name}, number ${id}`}>
              <span className="pokemon-number">NO. {id.padStart(3, "0")}</span>
              <img
                className="pokemon-artwork"
                src={getArtworkUrl(spriteId)}
                alt={pokemon.name}
                loading="lazy"
                width={180}
                height={180}
              />
            </Link>
            <button
              className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
              type="button"
              aria-label={`${isFavorite ? "Remove" : "Save"} ${pokemon.name}${isFavorite ? " from" : " to"} favorites`}
              aria-pressed={isFavorite}
              onClick={() => toggleFavorite(pokemon.name)}
            >
              {isFavorite ? "♥" : "♡"}
            </button>
            <div className="pokemon-card-caption">
              <span className={`specimen-type${formClass ? " type-variant" : selectedTypes.length ? ` type-${selectedTypes[0]}` : ""}`}>
                {formCaption}
              </span>
              <h3>{capitalize(pokemon.name.replaceAll("-", " "))}</h3>
            </div>
          </li>
        );
      })}
      </ul>

      {!isTypeLoading && visibleCount < filteredPokemons.length && (
        <button className="load-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
          Load more specimens <span aria-hidden="true">↓</span>
        </button>
      )}
    </section>
  );
}

export default PokemonList;
