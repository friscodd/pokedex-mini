import SearchForm from "../components/SearchForm.jsx";
import PokemonList from "../components/PokemonList.jsx";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { getArtworkUrl } from "../utils.js";

const FEATURED_POKEMON = [
  { id: 448, name: "lucario" },
  { id: 25, name: "pikachu" },
  { id: 700, name: "sylveon" },
  { id: 6, name: "charizard" },
  { id: 133, name: "eevee" },
  { id: 658, name: "greninja" },
  { id: 150, name: "mewtwo" },
  { id: 809, name: "melmetal" },
  { id: 1000, name: "gholdengo" },
];
const HOME_SCROLL_KEY = "pokedex-mini-home-scroll";

function ListPage() {
  const navigate = useNavigate();
  const isRestoringScroll = useRef(true);
  const [isCatalogueReady, setIsCatalogueReady] = useState(false);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [isSlideshowPaused, setIsSlideshowPaused] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (isSlideshowPaused) return undefined;

    const intervalId = window.setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % FEATURED_POKEMON.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [isSlideshowPaused]);

  useEffect(() => {
    let saveTimeout;

    function saveScrollPosition() {
      try {
        sessionStorage.setItem(HOME_SCROLL_KEY, String(window.scrollY));
      } catch {}
    }

    function handleScroll() {
      if (isRestoringScroll.current) return;
      window.clearTimeout(saveTimeout);
      saveTimeout = window.setTimeout(saveScrollPosition, 90);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(saveTimeout);
      if (!isRestoringScroll.current) saveScrollPosition();
    };
  }, []);

  useLayoutEffect(() => {
    if (!isCatalogueReady) return undefined;

    let savedScroll = 0;
    try {
      savedScroll = Number(sessionStorage.getItem(HOME_SCROLL_KEY)) || 0;
    } catch {}

    const frameId = window.requestAnimationFrame(() => {
      window.scrollTo(0, savedScroll);
      isRestoringScroll.current = false;
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isCatalogueReady]);

  async function findRandomPokemon() {
    try {
      const response = await fetch(`${API_BASE_URL}/pokemon-species?limit=1`);
      if (!response.ok) throw new Error("Could not load the Pokédex count.");
      const { count } = await response.json();
      navigate(`/pokemon/${Math.floor(Math.random() * count) + 1}`);
    } catch {
      navigate("/pokemon/pikachu");
    }
  }

  return (
    <div className="list-page">
      <section className="collection-intro">
        <div className="collection-intro-copy">
          <p className="eyebrow">FIELD GUIDE / NATIONAL DEX</p>
          <h1>Every great journey<br />starts somewhere.</h1>
          <p className="intro-copy">Explore Pokémon and regional Pokédexes from across the world. Find a familiar face or meet a new favorite.</p>
          <button className="random-button" type="button" onClick={findRandomPokemon}>
            <span className="random-button-mark" aria-hidden="true" />
            <span className="random-button-copy"><small>RANDOM ENCOUNTER</small><strong>Surprise me</strong></span>
          </button>
        </div>
        <div className="intro-showcase" role="region" aria-roledescription="carousel" aria-label="Featured Pokémon slideshow">
          <div className="showcase-orbit showcase-orbit-outer" aria-hidden="true" />
          <div className="showcase-orbit showcase-orbit-inner" aria-hidden="true" />
          <span className="showcase-note">SPECIMEN STUDY / {String(featuredIndex + 1).padStart(2, "0")}</span>
          {Array.from({ length: 3 }, (_, slot) => {
            const pokemon = FEATURED_POKEMON[(featuredIndex + slot) % FEATURED_POKEMON.length];
            return (
              <Link
                key={pokemon.id}
                to={`/pokemon/${pokemon.name}`}
                className={`showcase-specimen showcase-slot-${slot}`}
                aria-label={`View ${pokemon.name}, National Pokédex number ${pokemon.id}`}
              >
                <img src={getArtworkUrl(pokemon.id)} alt="" width={200} height={200} />
                <span className="showcase-specimen-label">NO. {String(pokemon.id).padStart(3, "0")} / {pokemon.name}</span>
              </Link>
            );
          })}
          <span className="showcase-region-tag">A FIELD GUIDE TO EVERY GENERATION</span>
        </div>
      </section>
      <SearchForm />
      <PokemonList onCatalogueReady={() => setIsCatalogueReady(true)} />
    </div>
  );
}

export default ListPage;
