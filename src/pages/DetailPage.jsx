import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { capitalize, readFavorites, writeFavorites } from "../utils.js";

const RADAR_STATS = [
  { name: "hp", label: "HP" },
  { name: "attack", label: "ATK" },
  { name: "defense", label: "DEF" },
  { name: "special-attack", label: "SP. ATK" },
  { name: "special-defense", label: "SP. DEF" },
  { name: "speed", label: "SPD" },
];

function StatRadar({ pokemon }) {
  const center = { x: 130, y: 116 };
  const radius = 72;
  const labelRadius = 101;
  const stats = RADAR_STATS.map(({ name, label }) => ({
    label,
    value: pokemon.stats.find(({ stat }) => stat.name === name)?.base_stat ?? 0,
  }));

  function getPoint(index, scale) {
    const angle = (Math.PI * 2 * index) / stats.length - Math.PI / 2;
    return {
      x: center.x + Math.cos(angle) * radius * scale,
      y: center.y + Math.sin(angle) * radius * scale,
    };
  }

  function pointList(scale) {
    return stats.map((_, index) => {
      const point = getPoint(index, scale);
      return `${point.x},${point.y}`;
    }).join(" ");
  }

  return (
    <div className="stat-radar-panel">
      <p className="stat-radar-title">BASE STAT PROFILE <span>MAX 255</span></p>
      <svg
        className="stat-radar"
        viewBox="0 0 260 232"
        role="img"
        aria-labelledby={`radar-title-${pokemon.id} radar-description-${pokemon.id}`}
      >
        <title id={`radar-title-${pokemon.id}`}>{capitalize(pokemon.name)} base stat profile</title>
        <desc id={`radar-description-${pokemon.id}`}>
          {stats.map(({ label, value }) => `${label} ${value}`).join(", ")}
        </desc>
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon key={scale} className="radar-grid" points={pointList(scale)} />
        ))}
        {stats.map((_, index) => {
          const point = getPoint(index, 1);
          return <line key={stats[index].label} className="radar-axis" x1={center.x} y1={center.y} x2={point.x} y2={point.y} />;
        })}
        <polygon
          className="radar-data"
          points={stats.map(({ value }, index) => {
            const point = getPoint(index, value / 255);
            return `${point.x},${point.y}`;
          }).join(" ")}
        />
        {stats.map(({ label, value }, index) => {
          const point = getPoint(index, labelRadius / radius);
          const textAnchor = point.x < center.x - 8 ? "end" : point.x > center.x + 8 ? "start" : "middle";
          return (
            <text key={label} className="radar-label" x={point.x} y={point.y} textAnchor={textAnchor}>
              {label} {value}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

function DetailPage() {
  const { name } = useParams();
  const [pokemon, setPokemon] = useState(null);
  const [speciesInfo, setSpeciesInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState(readFavorites);
  const [showAnimatedSprite, setShowAnimatedSprite] = useState(false);

  useEffect(() => {
    writeFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    let isCurrent = true;

    async function loadPokemon() {
      setIsLoading(true);
      setError(null);
      setPokemon(null);
      setSpeciesInfo(null);
      setShowAnimatedSprite(false);

      try {
        const response = await fetch(`${API_BASE_URL}/pokemon/${name}`);

        if (!response.ok) {
          throw new Error(`No Pokémon named "${name}" — check the spelling.`);
        }

        const data = await response.json();
        let englishEntry = null;

        try {
          const speciesResponse = await fetch(`${API_BASE_URL}/pokemon-species/${data.species.name}`);
          if (speciesResponse.ok) {
            const species = await speciesResponse.json();
            const flavorText = species.flavor_text_entries.find(({ language }) => language.name === "en")?.flavor_text;
            const genus = species.genera.find(({ language }) => language.name === "en")?.genus;
            englishEntry = {
              id: species.id,
              name: species.name,
              forms: species.varieties
                .filter(({ is_default, pokemon: variety }) => !is_default && /mega|gmax|gigantamax/i.test(variety.name))
                .map(({ pokemon: variety }) => {
                  const suffix = variety.name.startsWith(`${species.name}-`)
                    ? variety.name.slice(species.name.length + 1)
                    : variety.name;
                  const label = suffix === "gmax" || suffix === "gigantamax"
                    ? "Gigantamax"
                    : suffix.startsWith("mega-")
                      ? `Mega ${suffix.slice(5).toUpperCase()}`
                      : capitalize(suffix.replaceAll("-", " "));
                  return { name: variety.name, label };
                }),
              flavorText: flavorText?.replace(/[\f\n\r]+/g, " ").replace(/\s+/g, " ").trim(),
              genus,
            };
          }
        } catch {
          englishEntry = null;
        }

        if (isCurrent) {
          setPokemon(data);
          setSpeciesInfo(englishEntry);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadPokemon();

    return () => {
      isCurrent = false;
    };
  }, [name]);

  if (isLoading) return <p className="status">Loading {name}…</p>;
  if (error) return <p className="status status-error">{error}</p>;

  const artwork = pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
  const animatedSprite = pokemon.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default
    || pokemon.sprites.other?.showdown?.front_default;
  const displayedImage = showAnimatedSprite && animatedSprite ? animatedSprite : artwork;
  const nationalDexId = speciesInfo?.id ?? pokemon.id;
  const isFavorite = favorites.includes(pokemon.name);

  return (
    <div className="detail-page">
      <Link to="/" className="back-link"><span aria-hidden="true">←</span> All specimens</Link>
      <section className={`specimen-detail type-${pokemon.types[0].type.name}`}>
        <div className="detail-art-panel">
          <span className="detail-dex-number">NATIONAL DEX / {String(nationalDexId).padStart(3, "0")}</span>
          {animatedSprite && (
            <div className="artwork-mode-switch" role="group" aria-label="Pokémon image style">
              <button
                className={!showAnimatedSprite ? "is-selected" : ""}
                type="button"
                aria-pressed={!showAnimatedSprite}
                onClick={() => setShowAnimatedSprite(false)}
              >
                2D artwork
              </button>
              <button
                className={showAnimatedSprite ? "is-selected" : ""}
                type="button"
                aria-pressed={showAnimatedSprite}
                onClick={() => setShowAnimatedSprite(true)}
              >
                Animated sprite
              </button>
            </div>
          )}
          <img
            className={showAnimatedSprite ? "is-animated-sprite" : ""}
            src={displayedImage}
            alt={pokemon.name}
            width={420}
            height={420}
            onError={showAnimatedSprite ? () => setShowAnimatedSprite(false) : undefined}
          />
          <span className="detail-art-caption">SPECIMEN NO. {String(pokemon.id).padStart(3, "0")}</span>
        </div>
        <div className="detail-information">
          <div className="detail-heading-row">
            <p className="eyebrow">FIELD ENTRY / {String(nationalDexId).padStart(3, "0")}</p>
            <button
              className={`detail-favorite${isFavorite ? " is-favorite" : ""}`}
              type="button"
              aria-label={`${isFavorite ? "Remove" : "Save"} ${pokemon.name}${isFavorite ? " from" : " to"} favorites`}
              aria-pressed={isFavorite}
              onClick={() => setFavorites((current) => current.includes(pokemon.name)
                ? current.filter((favorite) => favorite !== pokemon.name)
                : [...current, pokemon.name])}
            >
              <span aria-hidden="true">{isFavorite ? "♥" : "♡"}</span> {isFavorite ? "Saved" : "Save specimen"}
            </button>
          </div>
          <div className="detail-profile">
            <div className="detail-name-block">
              <h1>{capitalize(pokemon.name.replaceAll("-", " "))}</h1>
              <div className="type-pills">
                {pokemon.types.map(({ type }) => <span className={`type-pill type-${type.name}`} key={type.name}>{type.name}</span>)}
              </div>
              {speciesInfo?.forms?.length > 0 && (
                <div className="pokemon-forms" aria-label="Mega Evolution and Gigantamax forms">
                  <span className="pokemon-forms-label">ALTERNATE FORMS</span>
                  <div className="pokemon-forms-options">
                    <Link
                      className={`pokemon-form-link${pokemon.name === speciesInfo.name ? " is-selected" : ""}`}
                      to={`/pokemon/${speciesInfo.name}`}
                      aria-current={pokemon.name === speciesInfo.name ? "page" : undefined}
                    >
                      Base
                    </Link>
                    {speciesInfo.forms.map((form) => (
                      <Link
                        key={form.name}
                        className={`pokemon-form-link${pokemon.name === form.name ? " is-selected" : ""}`}
                        to={`/pokemon/${form.name}`}
                        aria-current={pokemon.name === form.name ? "page" : undefined}
                      >
                        {form.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <StatRadar pokemon={pokemon} />
          </div>

          <div className="measurements">
            <div><span>HEIGHT</span><strong>{(pokemon.height / 10).toFixed(1)} <small>m</small></strong></div>
            <div><span>WEIGHT</span><strong>{(pokemon.weight / 10).toFixed(1)} <small>kg</small></strong></div>
            <div><span>ABILITIES</span><strong>{pokemon.abilities.map(({ ability }) => capitalize(ability.name)).join(", ")}</strong></div>
          </div>

          <div className="stats-section">
            <div className="stats-heading"><h2>Base stats</h2><span>OUT OF 255</span></div>
            <ul className="stat-list">
              {pokemon.stats.map(({ stat, base_stat: baseStat }) => (
                <li key={stat.name}>
                  <span className="stat-name">{stat.name.replace("-", " ")}</span>
                  <span className="stat-track"><span style={{ width: `${Math.min((baseStat / 255) * 100, 100)}%` }} /></span>
                  <strong className="stat-value">{baseStat}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      {speciesInfo?.flavorText && (
        <section className="species-entry" aria-labelledby="species-entry-title">
          <div className="species-entry-heading">
            <p className="eyebrow">FIELD NOTES / NATIONAL DEX {String(nationalDexId).padStart(3, "0")}</p>
            <h2 id="species-entry-title">The Pokédex entry</h2>
          </div>
          <blockquote className="species-entry-text">“{speciesInfo.flavorText}”</blockquote>
          {speciesInfo.genus && <p className="species-genus">CLASSIFIED AS <strong>{speciesInfo.genus}</strong></p>}
        </section>
      )}
    </div>
  );
}

export default DetailPage;
